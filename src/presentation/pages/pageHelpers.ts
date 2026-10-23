/**
 * Etiquetas y ayudas compartidas por las paginas.
 *
 * Traduce los enums del dominio a textos del idioma activo, arma enlaces
 * internos y centraliza el vaciado de contenedores para que ningun controlador
 * duplique esa logica.
 */

import type { StationReading } from "@/application/station/loadStationReadings";
import type { TrendDirection } from "@/domain/analytics/trend";
import { selectCorridorStations } from "@/domain/catalog/corridor";
import type { StationCatalog } from "@/domain/catalog/stationCatalog";
import type { Station } from "@/domain/catalog/types";
import type { FloodStatus } from "@/domain/flood/types";
import type { Locale } from "../i18n";
import type { TranslationSchema } from "../i18n/translations/es";
import { createStationCard, type StationCardLabels } from "../rendering/stationCard";
import { stationHref } from "../routes";

export { stationHref } from "../routes";

export const waterLevelUnit = "m";

export function statusLabels(translations: TranslationSchema): Record<FloodStatus, string> {
  return {
    low: translations.floodStatus.low,
    normal: translations.floodStatus.normal,
    alert: translations.floodStatus.alert,
    evacuation: translations.floodStatus.evacuation,
    undefined: translations.floodStatus.undefinedStatus,
  };
}

export function trendDirectionLabels(
  translations: TranslationSchema,
): Record<TrendDirection, string> {
  return {
    rising: translations.trend.rising,
    falling: translations.trend.falling,
    steady: translations.trend.steady,
    unknown: translations.trend.unknown,
  };
}

export function stationCardLabels(translations: TranslationSchema): StationCardLabels {
  return {
    level: translations.alerts.level,
    alertThreshold: translations.alerts.alertThreshold,
    trend: translations.common.trend,
    updatedAt: translations.common.updatedAt,
    detail: translations.common.viewDetails,
    status: statusLabels(translations),
    trendDirection: trendDirectionLabels(translations),
  };
}

export function corridorStations(catalog: StationCatalog): readonly Station[] {
  return selectCorridorStations(catalog.stations);
}

export function createStationCards(
  document: Document,
  readings: readonly StationReading[],
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  return readings.map((reading) =>
    createStationCard(document, {
      reading,
      locale,
      labels: stationCardLabels(translations),
      unit: waterLevelUnit,
      detailHref: stationHref(locale, reading.station.id),
    }),
  );
}
