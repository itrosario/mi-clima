/**
 * Tabla de alturas oficiales de Prefectura Naval.
 *
 * Es una fuente distinta de la serie del INA: se muestra aparte, con su propio
 * horario y su propio estado, para que nunca se confunda con la telemetria
 * agregada. Si Prefectura no publica un puerto, la tabla queda vacia con un
 * mensaje explicito.
 */

import type {
  CorridorPrefecturaReading,
  CorridorPrefecturaView,
} from "@/application/prefectura/loadCorridorPrefecturaSnapshot";
import {
  formatDateTime,
  formatMeasurement,
  formatSignedNumber,
  missingValuePlaceholder,
} from "../format/formatters";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { createDataTable, type TableColumn } from "./kit";

function signedMetres(value: number | null, locale: Locale): string {
  if (value === null) {
    return missingValuePlaceholder;
  }

  return `${formatSignedNumber(value, locale)} m`;
}

export function createPrefecturaTable(
  document: Document,
  view: CorridorPrefecturaView,
  locale: Locale,
  translations: TranslationSchema,
): HTMLElement {
  const columns: readonly TableColumn<CorridorPrefecturaReading>[] = [
    {
      key: "station",
      label: translations.common.station,
      value: (row) => row.station.name,
    },
    {
      key: "river",
      label: translations.common.river,
      value: (row) => row.reading.riverName,
    },
    {
      key: "level",
      label: translations.common.level,
      value: (row) => formatMeasurement(row.reading.levelMetres, "m", locale),
      numeric: true,
    },
    {
      key: "variation",
      label: translations.alerts.variation,
      value: (row) => signedMetres(row.reading.variationMetres, locale),
      numeric: true,
    },
    {
      key: "trend",
      label: translations.common.trend,
      value: (row) => translations.trend[row.reading.trend],
    },
    {
      key: "alert",
      label: translations.alerts.alertThreshold,
      value: (row) => formatMeasurement(row.reading.alertLevelMetres, "m", locale),
      numeric: true,
    },
    {
      key: "evacuation",
      label: translations.alerts.evacuationThreshold,
      value: (row) => formatMeasurement(row.reading.evacuationLevelMetres, "m", locale),
      numeric: true,
    },
    {
      key: "observedAt",
      label: translations.common.updatedAt,
      value: (row) => formatDateTime(row.reading.observedAt, locale),
      numeric: true,
    },
  ];

  return createDataTable(document, {
    caption: translations.alerts.prefecturaTableTitle,
    columns,
    rows: view.readings,
    emptyMessage: translations.alerts.prefecturaNoMatch,
  });
}
