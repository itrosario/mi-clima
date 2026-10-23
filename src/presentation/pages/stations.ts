/**
 * Pagina de estaciones.
 *
 * Sin parametro `?id=` muestra el catalogo completo. Con `?id=` muestra la
 * ficha de la estacion, su ultima lectura y la serie de los ultimos noventa
 * dias, con el grafico como mejora progresiva.
 */

import { loadStationCatalog } from "@/application/catalog/loadStationCatalog";
import { rangeEndingAtHour } from "@/application/shared/time";
import {
  loadStationReadings,
  type StationReading,
} from "@/application/station/loadStationReadings";
import type { StationCatalog } from "@/domain/catalog/stationCatalog";
import type { Station } from "@/domain/catalog/types";
import { buildLineChartOption } from "../charts/chartOptions";
import { buildStationChartInput } from "../charts/readingSeries";
import { formatMeasurement } from "../format/formatters";
import { getTranslations } from "../i18n";
import { createStatusLegend } from "../rendering/kit";
import { createStationCard, type StationCardLabels } from "../rendering/stationCard";
import { createStationCatalogue } from "../rendering/stations";
import { startAutoRefresh } from "../runtime/autoRefresh";
import { createEmptyState, createTextElement, queryElement, renderInto } from "../runtime/dom";
import {
  readPageLocale,
  readQueryParameter,
  resolvePageContext,
  runPage,
} from "../runtime/pageRuntime";
import { stationCardLabels, stationHref, statusLabels, waterLevelUnit } from "./pageHelpers";
import type { PageOptions } from "./pageOptions";

export const stationDetailWindowDays = 90;

interface StationsData {
  readonly catalog: StationCatalog;
  readonly hasDetail: boolean;
  readonly station: Station | null;
  readonly reading: StationReading | null;
}

function renderDetail(
  document: Document,
  data: StationsData,
  locale: ReturnType<typeof readPageLocale>,
  translations: ReturnType<typeof getTranslations>,
): void {
  if (data.station === null) {
    renderInto(document, "[data-station-detail]", [
      createEmptyState(document, translations.statistics.stationNotFound),
    ]);

    return;
  }

  const labels: StationCardLabels = stationCardLabels(translations);
  const children: Node[] = [
    createTextElement(document, "h2", "section-title", translations.stations.detailTitle),
    createTextElement(
      document,
      "p",
      "page-meta",
      `${translations.stations.network}: ${data.station.networkName} \u00b7 ${translations.stations.recentTitle}: ${formatMeasurement(data.reading?.assessment.level ?? null, waterLevelUnit, locale)}`,
    ),
  ];

  if (data.reading !== null) {
    children.push(
      createStationCard(document, {
        reading: data.reading,
        locale,
        labels,
        unit: waterLevelUnit,
        detailHref: stationHref(locale, data.station.id),
      }),
    );
  }

  const backLink = document.createElement("a");
  backLink.className = "back-link";
  backLink.href = `/${locale}/estaciones/`;
  backLink.textContent = translations.stations.backToCatalogue;
  children.push(backLink);

  renderInto(document, "[data-station-detail]", children);
}

export async function startStationsPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);
  const requestedId = readQueryParameter(document, "id");
  const chartContainer = queryElement<HTMLElement>(document, "[data-station-chart]");

  const load = async (signal: AbortSignal): Promise<StationsData> => {
    const snapshot = await loadStationCatalog(
      { source: services.catalogSource, cache: services.catalogCache, clock: services.clock },
      signal,
    );

    if (requestedId === null) {
      return { catalog: snapshot.catalog, hasDetail: false, station: null, reading: null };
    }

    const station = snapshot.catalog.findById(requestedId);
    if (station === null) {
      return { catalog: snapshot.catalog, hasDetail: true, station: null, reading: null };
    }

    const readings = await loadStationReadings(
      {
        stations: [station],
        range: rangeEndingAtHour(services.clock.now(), stationDetailWindowDays),
      },
      { hydrologySource: services.hydrologySource, clock: services.clock },
      signal,
    );

    return {
      catalog: snapshot.catalog,
      hasDetail: true,
      station,
      reading: readings[0] as StationReading,
    };
  };

  const render = async (data: StationsData): Promise<void> => {
    renderInto(
      document,
      "[data-status-legend]",
      createStatusLegend(
        document,
        ["evacuation", "alert", "low", "normal", "undefined"],
        statusLabels(translations),
      ),
    );

    if (!data.hasDetail) {
      renderInto(document, "[data-station-detail]", []);
      renderInto(document, "[data-station-catalogue]", [
        createStationCatalogue(document, data.catalog.stations, locale, translations),
      ]);

      return;
    }

    renderInto(document, "[data-station-catalogue]", []);
    renderDetail(document, data, locale, translations);

    if (
      chartContainer !== null &&
      options.chartFactory !== undefined &&
      data.reading !== null &&
      data.reading.latestPoint !== null
    ) {
      const chart = await options.chartFactory(chartContainer);

      chart.render(
        buildLineChartOption(
          buildStationChartInput(
            data.reading.series.points,
            data.reading.movingAverage,
            locale,
            waterLevelUnit,
            translations.stations.chartDescription,
          ),
        ),
      );
    }
  };

  const run = (): Promise<void> =>
    runPage({ document, load, render, fallbackErrorMessage: translations.common.error });

  await run();
  startAutoRefresh({ document, refresh: run });
}
