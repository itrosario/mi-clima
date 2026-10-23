/**
 * Panel principal.
 *
 * Consulta el catalogo, arma el corredor del Parana, pide los niveles y el
 * pronostico. El rango de fechas se puede cambiar desde el formulario y se
 * vuelve a consultar sin recargar la pagina. El grafico y el mapa son
 * opcionales: si la vista no los pide, el panel funciona igual.
 */

import { loadStationCatalog } from "@/application/catalog/loadStationCatalog";
import {
  defaultDashboardWindowDays,
  loadCorridorDashboard,
} from "@/application/dashboard/loadCorridorDashboard";
import { rangeEndingAtHour } from "@/application/shared/time";
import { loadWeather, type WeatherView } from "@/application/weather/loadWeather";
import type { DateRange } from "@/domain/telemetry/types";
import { buildLineChartOption } from "../charts/chartOptions";
import type { ChartRenderer } from "../charts/chartRenderer";
import { buildCorridorChartInput, type CorridorChartMode } from "../charts/readingSeries";
import { formatDate } from "../format/formatters";
import { getTranslations } from "../i18n";
import { evacuatingStationNames, updateEmergencyBanner } from "../rendering/emergency";
import { createStatusLegend } from "../rendering/kit";
import { createComparisonTable, createSummaryTiles } from "../rendering/tables";
import { renderWeatherBlocks } from "../rendering/weather";
import { startAutoRefresh } from "../runtime/autoRefresh";
import { createTextElement, queryElement, renderInto } from "../runtime/dom";
import {
  readFormRange,
  readPageLocale,
  resolvePageContext,
  runPage,
  writeFormRange,
} from "../runtime/pageRuntime";
import { corridorStations, createStationCards, statusLabels, waterLevelUnit } from "./pageHelpers";
import type { PageOptions } from "./pageOptions";

interface DashboardData {
  readonly dashboard: Awaited<ReturnType<typeof loadCorridorDashboard>>;
  readonly weather: WeatherView | null;
  readonly range: DateRange;
}

function chartNoteText(
  mode: CorridorChartMode,
  translations: ReturnType<typeof getTranslations>,
): string {
  return mode === "index"
    ? translations.dashboard.chartIndexNote
    : translations.dashboard.chartAbsoluteNote;
}

function dashboardChartInput(
  data: DashboardData,
  mode: CorridorChartMode,
  locale: ReturnType<typeof readPageLocale>,
  translations: ReturnType<typeof getTranslations>,
): ReturnType<typeof buildCorridorChartInput> {
  const isIndexView = mode === "index";

  return buildCorridorChartInput(data.dashboard.readings, {
    locale,
    unit: isIndexView ? translations.dashboard.chartIndexUnit : waterLevelUnit,
    description: isIndexView
      ? translations.dashboard.chartIndexDescription
      : translations.dashboard.chartDescription,
    mode,
    averageReferenceLabel: translations.dashboard.chartAverageReference,
  });
}

export async function startDashboardPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);
  const form = queryElement<HTMLFormElement>(document, "[data-range-form]");
  const chartContainer = queryElement<HTMLElement>(document, "[data-corridor-chart]");
  const chartModeControl = queryElement<HTMLSelectElement>(document, "[data-corridor-chart-mode]");
  const chartNote = queryElement<HTMLElement>(document, "[data-corridor-chart-note]");
  let chart: ChartRenderer | null = null;

  if (form !== null) {
    writeFormRange(form, rangeEndingAtHour(services.clock.now(), defaultDashboardWindowDays));
  }

  const readRange = (): DateRange =>
    (form === null ? null : readFormRange(form)) ??
    rangeEndingAtHour(services.clock.now(), defaultDashboardWindowDays);

  const currentChartMode = (): CorridorChartMode =>
    chartModeControl !== null && chartModeControl.value === "index" ? "index" : "absolute";

  const renderChart = async (data: DashboardData): Promise<void> => {
    const mode = currentChartMode();

    if (chartNote !== null) {
      chartNote.textContent = chartNoteText(mode, translations);
    }

    if (chartContainer !== null && options.chartFactory !== undefined) {
      chart ??= await options.chartFactory(chartContainer);
      chart.render(buildLineChartOption(dashboardChartInput(data, mode, locale, translations)));
    }
  };

  const load = async (signal: AbortSignal): Promise<DashboardData> => {
    const range = readRange();
    const snapshot = await loadStationCatalog(
      {
        source: services.catalogSource,
        cache: services.catalogCache,
        clock: services.clock,
      },
      signal,
    );
    const stations = corridorStations(snapshot.catalog);

    if (stations.length === 0) {
      throw new Error(translations.dashboard.noStations);
    }

    const dashboard = await loadCorridorDashboard(
      stations,
      {
        hydrologySource: services.hydrologySource,
        clock: services.clock,
        range,
      },
      signal,
    );
    const weather = await loadWeather(
      { source: services.weatherSource, clock: services.clock },
      {},
      signal,
    ).catch(() => null);

    return { dashboard, weather, range };
  };

  const render = async (data: DashboardData): Promise<void> => {
    const { dashboard } = data;

    updateEmergencyBanner(
      document,
      evacuatingStationNames(dashboard.summary, dashboard.readings),
      translations,
    );
    renderInto(
      document,
      "[data-summary-tiles]",
      createSummaryTiles(document, dashboard.summary, dashboard.generatedAt, locale, translations),
    );
    renderInto(
      document,
      "[data-corridor-cards]",
      createStationCards(document, dashboard.readings, locale, translations),
    );
    renderInto(document, "[data-comparison-table]", [
      createComparisonTable(document, dashboard.comparison, locale, translations),
    ]);
    renderInto(
      document,
      "[data-status-legend]",
      createStatusLegend(
        document,
        ["normal", "low", "alert", "evacuation", "undefined"],
        statusLabels(translations),
      ),
    );
    renderWeatherBlocks(document, data.weather, locale, translations);
    renderInto(document, "[data-range-summary]", [
      createTextElement(
        document,
        "p",
        "page-meta",
        `${translations.common.range}: ${formatDate(data.range.from, locale)} - ${formatDate(data.range.to, locale)}`,
      ),
    ]);

    if (chartModeControl !== null) {
      chartModeControl.onchange = () => {
        void renderChart(data);
      };
    }

    await renderChart(data);
  };

  const run = (): Promise<void> =>
    runPage({ document, load, render, fallbackErrorMessage: translations.common.error });

  if (form !== null) {
    form.onsubmit = (event) => {
      event.preventDefault();
      void run();
    };
  }

  await run();
  startAutoRefresh({ document, refresh: run });
}
