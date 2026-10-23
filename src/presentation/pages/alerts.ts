/**
 * Pagina de alertas.
 *
 * Reutiliza el caso de uso del corredor, ordena las estaciones por gravedad y
 * suma dos vistas que no estan en la portada: el mapa del semaforo y la tabla
 * de alturas oficiales de Prefectura Naval, que se consulta a traves del proxy
 * del sitio. Si Prefectura no responde, el resto de la pagina sigue funcionando.
 */

import { loadStationCatalog } from "@/application/catalog/loadStationCatalog";
import {
  type CorridorDashboard,
  defaultDashboardWindowDays,
  loadCorridorDashboard,
} from "@/application/dashboard/loadCorridorDashboard";
import {
  type CorridorPrefecturaView,
  loadCorridorPrefecturaSnapshot,
} from "@/application/prefectura/loadCorridorPrefecturaSnapshot";
import { rangeEndingAtHour } from "@/application/shared/time";
import type { StationReading } from "@/application/station/loadStationReadings";
import type { Station } from "@/domain/catalog/types";
import type { FloodStatus } from "@/domain/flood/types";
import type { DateRange } from "@/domain/telemetry/types";
import { formatMeasurement } from "../format/formatters";
import { getTranslations } from "../i18n";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import type { MapController, MapMarker } from "../map/stationMap";
import { evacuatingStationNames, updateEmergencyBanner } from "../rendering/emergency";
import { createStatusLegend } from "../rendering/kit";
import { createPrefecturaTable } from "../rendering/prefectura";
import { createSummaryTiles } from "../rendering/tables";
import { stationHref } from "../routes";
import { initAlertSubscription } from "../runtime/alertSubscription";
import { startAutoRefresh } from "../runtime/autoRefresh";
import { createEmptyState, queryElement, renderInto } from "../runtime/dom";
import {
  readFormRange,
  readPageLocale,
  resolvePageContext,
  runPage,
  writeFormRange,
} from "../runtime/pageRuntime";
import { corridorStations, createStationCards, statusLabels, waterLevelUnit } from "./pageHelpers";
import type { PageOptions } from "./pageOptions";

const severityOrder: Record<FloodStatus, number> = {
  evacuation: 0,
  alert: 1,
  low: 2,
  normal: 3,
  undefined: 4,
};

/** Ordena de mayor a menor gravedad; `undefined` queda al final. */
export function sortReadingsBySeverity(
  readings: readonly StationReading[],
): readonly StationReading[] {
  return [...readings].sort(
    (left, right) => severityOrder[left.assessment.status] - severityOrder[right.assessment.status],
  );
}

export function buildStationMarkers(
  readings: readonly StationReading[],
  locale: Locale,
  translations: TranslationSchema,
): readonly MapMarker[] {
  const labels = statusLabels(translations);

  return readings.flatMap((reading) => {
    const location = reading.station.location;

    if (location === null) {
      return [];
    }

    return [
      {
        stationId: reading.station.id,
        name: reading.station.name,
        latitude: location.latitude,
        longitude: location.longitude,
        status: reading.assessment.status,
        statusLabel: labels[reading.assessment.status],
        detail: `${translations.common.level}: ${formatMeasurement(reading.assessment.level, waterLevelUnit, locale)}`,
        href: stationHref(locale, reading.station.id),
        linkLabel: translations.common.viewDetails,
      },
    ];
  });
}

interface AlertsData {
  readonly dashboard: CorridorDashboard;
  readonly prefectura: CorridorPrefecturaView | null;
  readonly range: DateRange;
}

export async function startAlertsPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);
  const form = queryElement<HTMLFormElement>(document, "[data-range-form]");
  const mapContainer = queryElement<HTMLElement>(document, "[data-station-map]");
  let map: MapController | null = null;
  let subscriptionStations: readonly Station[] = [];

  if (form !== null) {
    writeFormRange(form, rangeEndingAtHour(services.clock.now(), defaultDashboardWindowDays));
  }

  const readRange = (): DateRange =>
    (form === null ? null : readFormRange(form)) ??
    rangeEndingAtHour(services.clock.now(), defaultDashboardWindowDays);

  const load = async (signal: AbortSignal): Promise<AlertsData> => {
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

    subscriptionStations = stations;

    const dashboard = await loadCorridorDashboard(
      stations,
      { hydrologySource: services.hydrologySource, clock: services.clock, range },
      signal,
    );
    const prefectura = await loadCorridorPrefecturaSnapshot(
      stations,
      { source: services.prefecturaSource },
      signal,
    ).catch(() => null);

    return { dashboard, prefectura, range };
  };

  const render = async (data: AlertsData): Promise<void> => {
    const { dashboard } = data;
    const sortedReadings = sortReadingsBySeverity(dashboard.readings);

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
      "[data-alert-cards]",
      createStationCards(document, sortedReadings, locale, translations),
    );
    renderInto(
      document,
      "[data-status-legend]",
      createStatusLegend(
        document,
        ["evacuation", "alert", "low", "normal", "undefined"],
        statusLabels(translations),
      ),
    );
    renderInto(document, "[data-prefectura-table]", [
      data.prefectura === null
        ? createEmptyState(document, translations.alerts.prefecturaEmpty)
        : createPrefecturaTable(document, data.prefectura, locale, translations),
    ]);

    if (mapContainer !== null && options.mapFactory !== undefined) {
      map?.dispose();
      map = null;

      try {
        map = await options.mapFactory(
          mapContainer,
          buildStationMarkers(dashboard.readings, locale, translations),
        );
      } catch {
        renderInto(document, "[data-station-map]", [
          createEmptyState(document, translations.alerts.mapUnavailable),
        ]);
      }
    }
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

  if (subscriptionStations.length > 0) {
    initAlertSubscription(document, subscriptionStations, locale, translations.alerts.push);
  }

  startAutoRefresh({ document, refresh: run });
}
