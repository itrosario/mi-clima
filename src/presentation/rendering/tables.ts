/**
 * Tablas y mosaicos que comparten varias paginas.
 *
 * Reciben datos ya calculados y el diccionario activo; no consultan puertos ni
 * conocen la pagina donde se muestran.
 */

import type { StationComparison } from "@/domain/analytics/comparison";
import type { AnnualExtreme } from "@/domain/analytics/extremes";
import type { FloodSummary } from "@/domain/flood/types";
import {
  formatDateTime,
  formatMeasurement,
  formatNumber,
  formatSignedNumber,
  missingValuePlaceholder,
} from "../format/formatters";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { createDataTable, createStatTile, type TableColumn } from "./kit";

function signedMetres(value: number | null, locale: Locale): string {
  if (value === null) {
    return missingValuePlaceholder;
  }

  return `${formatSignedNumber(value, locale)} m`;
}

export function createComparisonTable(
  document: Document,
  comparison: readonly StationComparison[],
  locale: Locale,
  translations: TranslationSchema,
): HTMLElement {
  const columns: readonly TableColumn<StationComparison>[] = [
    { key: "station", label: translations.common.station, value: (row) => row.name },
    {
      key: "level",
      label: translations.common.level,
      value: (row) => formatMeasurement(row.value, "m", locale),
      numeric: true,
    },
    {
      key: "difference",
      label: translations.common.difference,
      value: (row) => signedMetres(row.differenceFromReference, locale),
      numeric: true,
    },
    {
      key: "drop",
      label: translations.common.drop,
      value: (row) => signedMetres(row.dropFromPrevious, locale),
      numeric: true,
    },
  ];

  return createDataTable(document, {
    caption: translations.statistics.comparisonTitle,
    columns,
    rows: comparison,
    emptyMessage: translations.common.noData,
  });
}

export function createSummaryTiles(
  document: Document,
  summary: FloodSummary,
  generatedAt: Date,
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  return [
    createStatTile(document, {
      label: translations.dashboard.totalCount,
      value: formatNumber(summary.total, locale, 0),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.dashboard.alertingCount,
      value: formatNumber(summary.countsByStatus.alert, locale, 0),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.dashboard.evacuatingCount,
      value: formatNumber(summary.countsByStatus.evacuation, locale, 0),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.dashboard.withoutThresholds,
      value: formatNumber(summary.countsByStatus.undefined, locale, 0),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.common.updatedAt,
      value: formatDateTime(generatedAt, locale),
      hint: null,
    }),
  ];
}

export function createAnnualExtremesTable(
  document: Document,
  extremes: readonly AnnualExtreme[],
  locale: Locale,
  translations: TranslationSchema,
): HTMLElement {
  const columns: readonly TableColumn<AnnualExtreme>[] = [
    {
      key: "year",
      label: translations.statistics.annualYear,
      value: (row) => String(row.year),
      numeric: true,
    },
    {
      key: "maximum",
      label: translations.statistics.annualMaximum,
      value: (row) => formatMeasurement(row.maximum, "m", locale),
      numeric: true,
    },
    {
      key: "minimum",
      label: translations.statistics.minimum,
      value: (row) => formatMeasurement(row.minimum, "m", locale),
      numeric: true,
    },
    {
      key: "daysAboveAlert",
      label: translations.statistics.daysAboveAlert,
      value: (row) => formatNumber(row.daysAboveAlert, locale, 0),
      numeric: true,
    },
    {
      key: "daysAboveEvacuation",
      label: translations.statistics.daysAboveEvacuation,
      value: (row) => formatNumber(row.daysAboveEvacuation, locale, 0),
      numeric: true,
    },
  ];

  return createDataTable(document, {
    caption: translations.statistics.extremesTitle,
    columns,
    rows: extremes,
    emptyMessage: translations.common.noData,
  });
}
