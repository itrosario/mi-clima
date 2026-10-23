/**
 * Indicadores de la pagina de estadisticas.
 *
 * Convierte los resultados de dominio (anomalia, tendencia, variabilidad) en
 * mosaicos con etiquetas traducidas. No calcula nada: solo presenta.
 */

import type { StationReading } from "@/application/station/loadStationReadings";
import type { AnomalyAnalysis, AnomalyBand } from "@/domain/analytics/anomaly";
import {
  formatMeasurement,
  formatNumber,
  formatPercent,
  formatSignedNumber,
  missingValuePlaceholder,
} from "../format/formatters";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { createStatTile } from "./kit";

const bandKeys: Record<AnomalyBand, keyof TranslationSchema["anomalyBand"]> = {
  "very-low": "veryLow",
  low: "low",
  "below-normal": "belowNormal",
  normal: "normal",
  "above-normal": "aboveNormal",
  high: "high",
  "very-high": "veryHigh",
  unknown: "unknown",
};

export function anomalyBandLabel(band: AnomalyBand, translations: TranslationSchema): string {
  return translations.anomalyBand[bandKeys[band]];
}

export function createAnomalyTiles(
  document: Document,
  anomaly: AnomalyAnalysis,
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  return [
    createStatTile(document, {
      label: translations.statistics.observed,
      value: formatMeasurement(anomaly.observed, "m", locale),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.statistics.expected,
      value: formatMeasurement(anomaly.expected, "m", locale),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.statistics.anomaly,
      value:
        anomaly.absolute === null
          ? missingValuePlaceholder
          : `${formatSignedNumber(anomaly.absolute, locale)} m`,
      hint: anomaly.relative === null ? null : formatPercent(anomaly.relative * 100, locale, 1),
    }),
    createStatTile(document, {
      label: translations.statistics.percentileRank,
      value:
        anomaly.percentileRank === null
          ? missingValuePlaceholder
          : formatNumber(anomaly.percentileRank, locale, 0),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.statistics.anomalyBand,
      value: anomalyBandLabel(anomaly.band, translations),
      hint: null,
    }),
  ];
}

export function createTrendTiles(
  document: Document,
  reading: StationReading,
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  return [
    createStatTile(document, {
      label: translations.statistics.trendSlope,
      value:
        reading.trend.slopePerDay === null
          ? missingValuePlaceholder
          : `${formatSignedNumber(reading.trend.slopePerDay, locale, 3)} m/d`,
      hint: null,
    }),
    createStatTile(document, {
      label: translations.statistics.rateOfRise,
      value:
        reading.trend.rateOfChangePerDay === null
          ? missingValuePlaceholder
          : `${formatSignedNumber(reading.trend.rateOfChangePerDay, locale, 3)} m/d`,
      hint: null,
    }),
    createStatTile(document, {
      label: translations.statistics.standardDeviation,
      value: formatMeasurement(reading.variability.standardDeviation, "m", locale, 3),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.statistics.coefficientOfVariation,
      value: formatPercent(
        reading.variability.coefficientOfVariation === null
          ? null
          : reading.variability.coefficientOfVariation * 100,
        locale,
        1,
      ),
      hint: null,
    }),
  ];
}
