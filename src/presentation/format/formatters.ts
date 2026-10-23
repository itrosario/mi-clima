/**
 * Formato de numeros, fechas y medidas para la interfaz.
 *
 * Toda la presentacion numerica pasa por aca: los controladores no llaman a
 * `Intl` directamente. Asi el separador decimal, la zona horaria y el texto
 * para un dato faltante se cambian en un solo lugar.
 */

import type { Locale } from "../i18n/locales";

/** Etiqueta BCP 47 que usan los formateadores de cada idioma. */
export const localeTags: Record<Locale, string> = {
  es: "es-AR",
  en: "en-GB",
};

/** Zona horaria oficial de los datos hidrometricos argentinos. */
export const displayTimeZone = "America/Argentina/Cordoba";

/** Texto que reemplaza a un valor que la fuente no publico. */
export const missingValuePlaceholder = "\u2014";

export function formatNumber(value: number | null, locale: Locale, fractionDigits = 2): string {
  if (value === null || !Number.isFinite(value)) {
    return missingValuePlaceholder;
  }

  return new Intl.NumberFormat(localeTags[locale], {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/** Numero con signo explicito cuando es positivo o negativo. */
export function formatSignedNumber(
  value: number | null,
  locale: Locale,
  fractionDigits = 2,
): string {
  if (value === null || !Number.isFinite(value)) {
    return missingValuePlaceholder;
  }

  const magnitude = formatNumber(Math.abs(value), locale, fractionDigits);

  if (value > 0) {
    return `+${magnitude}`;
  }

  if (value < 0) {
    return `\u2212${magnitude}`;
  }

  return magnitude;
}

/** Medida con unidad, por ejemplo `4,82 m`. */
export function formatMeasurement(
  value: number | null,
  unit: string,
  locale: Locale,
  fractionDigits = 2,
): string {
  const formatted = formatNumber(value, locale, fractionDigits);

  if (value === null || unit.length === 0) {
    return formatted;
  }

  return `${formatted} ${unit}`;
}

/** Proporcion expresada como porcentaje, por ejemplo `72 %`. */
export function formatPercent(value: number | null, locale: Locale, fractionDigits = 0): string {
  if (value === null || !Number.isFinite(value)) {
    return missingValuePlaceholder;
  }

  return `${formatNumber(value, locale, fractionDigits)} %`;
}

export function formatDate(value: Date | null, locale: Locale): string {
  if (value === null) {
    return missingValuePlaceholder;
  }

  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "medium",
    timeZone: displayTimeZone,
  }).format(value);
}

export function formatDateTime(value: Date | null, locale: Locale): string {
  if (value === null) {
    return missingValuePlaceholder;
  }

  return new Intl.DateTimeFormat(localeTags[locale], {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: displayTimeZone,
  }).format(value);
}

/** Etiqueta corta para ejes de graficos: dia y mes. */
export function formatChartDate(value: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(localeTags[locale], {
    day: "2-digit",
    month: "2-digit",
    timeZone: displayTimeZone,
  }).format(value);
}
