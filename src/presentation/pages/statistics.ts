/**
 * Pagina de estadisticas.
 *
 * Consulta una estacion del catalogo, su serie reciente y su historico largo.
 * Muestra la anomalia contra percentiles, la tendencia, la media movil, los
 * extremos anuales y el perfil longitudinal del corredor. El selector de
 * estacion y la ventana de la media movil recargan los datos sin navegar.
 */

import { loadStationCatalog } from "@/application/catalog/loadStationCatalog";
import { loadCorridorDashboard } from "@/application/dashboard/loadCorridorDashboard";
import { rangeEndingAtHour } from "@/application/shared/time";
import {
  defaultMovingWindowDays,
  type StationReading,
} from "@/application/station/loadStationReadings";
import {
  loadStationStatistics,
  type StationStatistics,
} from "@/application/station/loadStationStatistics";
import type { StationComparison } from "@/domain/analytics/comparison";
import { homeStationId } from "@/domain/catalog/corridor";
import type { StationCatalog } from "@/domain/catalog/stationCatalog";
import type { Station } from "@/domain/catalog/types";
import { buildLineChartOption } from "../charts/chartOptions";
import type { ChartRenderer } from "../charts/chartRenderer";
import { buildStationChartInput } from "../charts/readingSeries";
import { getTranslations } from "../i18n";
import { createAnomalyTiles, createTrendTiles } from "../rendering/statistics";
import { createAnnualExtremesTable, createComparisonTable } from "../rendering/tables";
import { startAutoRefresh } from "../runtime/autoRefresh";
import { createEmptyState, createTextElement, queryElement, renderInto } from "../runtime/dom";
import {
  readPageLocale,
  readQueryParameter,
  resolvePageContext,
  runPage,
} from "../runtime/pageRuntime";
import { corridorStations, waterLevelUnit } from "./pageHelpers";
import type { PageOptions } from "./pageOptions";

export const recentStatisticsWindowDays = 90;
export const historyWindowDays = 5 * 365;
export const movingWindowChoices: readonly number[] = [2, 7, 30];

interface StatisticsData {
  readonly catalog: StationCatalog;
  readonly station: Station | null;
  readonly statistics: StationStatistics | null;
  readonly comparison: readonly StationComparison[];
  readonly selectedId: string;
}

function readMovingWindow(select: HTMLSelectElement | null): number {
  const value = Number(select?.value ?? "");

  return movingWindowChoices.some((choice) => choice === value) ? value : defaultMovingWindowDays;
}

function fillStationOptions(
  document: Document,
  select: HTMLSelectElement | null,
  stations: readonly Station[],
  selectedId: string,
): void {
  if (select === null) {
    return;
  }

  select.replaceChildren();
  for (const station of stations) {
    const option = document.createElement("option");
    option.value = station.id;
    option.textContent = station.name;
    select.append(option);
  }
  select.value = selectedId;
}

function renderReading(
  document: Document,
  reading: StationReading,
  statistics: StationStatistics,
  locale: ReturnType<typeof readPageLocale>,
  translations: ReturnType<typeof getTranslations>,
): void {
  renderInto(
    document,
    "[data-statistics-trend]",
    reading.latestPoint === null
      ? [createEmptyState(document, translations.statistics.noObservations)]
      : createTrendTiles(document, reading, locale, translations),
  );

  renderInto(document, "[data-statistics-extremes]", [
    createAnnualExtremesTable(document, statistics.annualExtremes, locale, translations),
  ]);
}

/**
 * Dibuja la serie observada con su media movil.
 *
 * Reutiliza el grafico entre recargas y no intenta dibujar cuando la estacion
 * todavia no publico lecturas.
 */
async function renderStatisticsChart(
  container: HTMLElement | null,
  chart: ChartRenderer | null,
  options: PageOptions,
  statistics: StationStatistics,
  locale: ReturnType<typeof readPageLocale>,
  translations: ReturnType<typeof getTranslations>,
): Promise<ChartRenderer | null> {
  const canRender =
    container !== null &&
    options.chartFactory !== undefined &&
    statistics.reading.latestPoint !== null;

  if (!canRender) {
    return chart;
  }

  const renderer = chart ?? (await options.chartFactory(container));

  renderer.render(
    buildLineChartOption(
      buildStationChartInput(
        statistics.reading.series.points,
        statistics.reading.movingAverage,
        locale,
        waterLevelUnit,
        translations.statistics.observedSeries,
      ),
    ),
  );

  return renderer;
}

export async function startStatisticsPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);
  const requestedId = readQueryParameter(document, "id") ?? homeStationId;
  const stationSelect = queryElement<HTMLSelectElement>(document, "[data-station-select]");
  const windowSelect = queryElement<HTMLSelectElement>(document, "[data-moving-window]");
  const chartContainer = queryElement<HTMLElement>(document, "[data-statistics-chart]");
  let selectedId = requestedId;
  let chart: ChartRenderer | null = null;

  const load = async (signal: AbortSignal): Promise<StatisticsData> => {
    const catalogSnapshot = await loadStationCatalog(
      { source: services.catalogSource, cache: services.catalogCache, clock: services.clock },
      signal,
    );
    const { catalog } = catalogSnapshot;
    const station =
      catalog.findById(selectedId) ??
      catalog.findById(homeStationId) ??
      catalog.stations[0] ??
      null;

    if (station === null) {
      return { catalog, station: null, statistics: null, comparison: [], selectedId };
    }

    const recentRange = rangeEndingAtHour(services.clock.now(), recentStatisticsWindowDays);
    const corridor = corridorStations(catalog);
    const [statistics, corridorDashboard] = await Promise.all([
      loadStationStatistics(
        {
          station,
          recentRange,
          historyRange: rangeEndingAtHour(services.clock.now(), historyWindowDays),
        },
        {
          hydrologySource: services.hydrologySource,
          clock: services.clock,
          percentilesSource: services.percentilesSource,
          cache: services.percentileCache,
          movingWindowDays: readMovingWindow(windowSelect),
        },
        signal,
      ),
      corridor.length === 0
        ? Promise.resolve(null)
        : loadCorridorDashboard(
            corridor,
            {
              hydrologySource: services.hydrologySource,
              clock: services.clock,
              range: recentRange,
            },
            signal,
          ),
    ]);

    return {
      catalog,
      station,
      statistics,
      comparison: corridorDashboard?.comparison ?? [],
      selectedId: station.id,
    };
  };

  const render = async (data: StatisticsData): Promise<void> => {
    selectedId = data.selectedId;
    fillStationOptions(document, stationSelect, data.catalog.stations, data.selectedId);

    if (data.station === null || data.statistics === null) {
      renderInto(document, "[data-statistics-meta]", [
        createEmptyState(document, translations.statistics.stationNotFound),
      ]);
      renderInto(document, "[data-statistics-anomaly]", []);
      renderInto(document, "[data-statistics-trend]", []);
      renderInto(document, "[data-statistics-extremes]", []);
      renderInto(document, "[data-statistics-comparison]", []);

      return;
    }

    const { station, statistics } = data;
    renderInto(document, "[data-statistics-meta]", [
      createTextElement(
        document,
        "p",
        "page-meta",
        `${station.name} \u00b7 ${station.river.name} \u00b7 ${translations.statistics.historyPointCount}: ${statistics.historyPointCount}`,
      ),
    ]);
    renderInto(
      document,
      "[data-statistics-anomaly]",
      statistics.anomaly === null
        ? [createEmptyState(document, translations.statistics.noAnomaly)]
        : createAnomalyTiles(document, statistics.anomaly.anomaly, locale, translations),
    );
    renderReading(document, statistics.reading, statistics, locale, translations);
    renderInto(
      document,
      "[data-statistics-comparison]",
      data.comparison.length === 0
        ? [createEmptyState(document, translations.statistics.noObservations)]
        : [createComparisonTable(document, data.comparison, locale, translations)],
    );

    chart = await renderStatisticsChart(
      chartContainer,
      chart,
      options,
      statistics,
      locale,
      translations,
    );
  };

  const run = (): Promise<void> =>
    runPage({ document, load, render, fallbackErrorMessage: translations.common.error });

  if (stationSelect !== null) {
    stationSelect.onchange = () => {
      selectedId = stationSelect.value;
      void run();
    };
  }

  if (windowSelect !== null) {
    windowSelect.onchange = () => {
      void run();
    };
  }

  await run();
  startAutoRefresh({ document, refresh: run });
}
