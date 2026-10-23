/**
 * Lector del HTML publico de Prefectura Naval Argentina.
 *
 * El organismo no expone una API JSON: publica una tabla HTML con una fila por
 * puerto y un grafico con la serie historica embebida. Este modulo aisla ese
 * formato fragil para que el resto del sistema trabaje con objetos tipados.
 *
 * El HTML llega codificado en Latin-1 aunque se declare UTF-8, por lo que las
 * etiquetas con acentos aparecen con caracteres de reemplazo. Las busquedas de
 * etiquetas son deliberadamente tolerantes a esa diferencia; el nombre del
 * puerto y los numeros, que son ASCII, se leen sin ambiguedad.
 */

import type { PrefecturaReading, PrefecturaTrend } from "@/domain/prefectura/types";
import type { TelemetryPoint } from "@/domain/telemetry/types";

const rowPattern = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
const portRowPattern = /data-label="Puerto:"/i;
const portIdPattern = /[?&](?:amp;)?id=(\d+)/i;
const historicalPointPattern = /\[\s*(\d{13})\s*,\s*(-?\d+(?:\.\d+)?)\s*\]/g;

const monthNumbers: Readonly<Record<string, number>> = {
  ENE: 1,
  FEB: 2,
  MAR: 3,
  ABR: 4,
  MAY: 5,
  JUN: 6,
  JUL: 7,
  AGO: 8,
  SEP: 9,
  OCT: 10,
  NOV: 11,
  DIC: 12,
};

function stripMarkup(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function readCell(row: string, labelPattern: string): string | null {
  const pattern = new RegExp(`data-label="${labelPattern}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, "i");
  const match = row.match(pattern);

  return match?.[1] === undefined ? null : stripMarkup(match[1]);
}

function parseDecimal(raw: string | null): number | null {
  if (raw === null) {
    return null;
  }

  const cleaned = raw.replace(/[^\d,.-]/g, "");
  const normalized =
    cleaned.includes(",") && cleaned.includes(".")
      ? cleaned.replace(/\./g, "").replace(",", ".")
      : cleaned.replace(",", ".");
  const value = Number(normalized);

  return normalized.length > 0 && Number.isFinite(value) ? value : null;
}

function parseTrend(state: string | null): PrefecturaTrend {
  if (state === null) {
    return "unknown";
  }

  const normalized = state.toUpperCase();
  if (normalized.includes("CRECE")) {
    return "rising";
  }
  if (normalized.includes("BAJA")) {
    return "falling";
  }
  if (normalized.includes("ESTAC")) {
    return "steady";
  }

  return "unknown";
}

function buildArgentineDate(
  year: string,
  month: string,
  day: string,
  hours: string,
  minutes: string,
): Date | null {
  const candidate = new Date(
    `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T${hours.padStart(2, "0")}:${minutes.padStart(2, "0")}:00-03:00`,
  );

  return Number.isNaN(candidate.getTime()) ? null : candidate;
}

/**
 * Convierte las dos fechas que publica la tabla ("22/OCT/26 - 1200" y
 * "2026-10-20 12:00") a un instante absoluto en hora argentina.
 */
export function parsePrefecturaTimestamp(raw: string | null): Date | null {
  if (raw === null) {
    return null;
  }

  const compact = raw.trim();
  const tableMatch = compact.match(/^(\d{1,2})\/([A-Za-z]{3})\/(\d{2})\s*[-]\s*(\d{2})(\d{2})$/);
  if (tableMatch !== null) {
    const monthName = tableMatch[2] as string;
    const month = monthNumbers[monthName.toUpperCase()];
    if (month === undefined) {
      return null;
    }

    return buildArgentineDate(
      `20${tableMatch[3] as string}`,
      String(month),
      tableMatch[1] as string,
      tableMatch[4] as string,
      tableMatch[5] as string,
    );
  }

  const isoMatch = compact.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/);
  if (isoMatch === null) {
    return null;
  }

  return buildArgentineDate(
    isoMatch[1] as string,
    isoMatch[2] as string,
    isoMatch[3] as string,
    isoMatch[4] as string,
    isoMatch[5] as string,
  );
}

function parseReading(row: string): PrefecturaReading {
  const identifierMatch = row.match(portIdPattern);

  return {
    portId: Number((identifierMatch as RegExpMatchArray)[1]),
    portName: readCell(row, "Puerto:") as string,
    riverName: readCell(row, 'R[^"]*o:') ?? "",
    levelMetres: parseDecimal(readCell(row, "Ultimo Registro:")),
    variationMetres: parseDecimal(readCell(row, "Variacion")),
    periodHours: parseDecimal(readCell(row, "Periodo")),
    observedAt: parsePrefecturaTimestamp(readCell(row, "Fecha Hora:")),
    trend: parseTrend(readCell(row, "Estado:")),
    alertLevelMetres: parseDecimal(readCell(row, "Alerta:")),
    evacuationLevelMetres: parseDecimal(readCell(row, 'Evacuaci[^"]*n:')),
    previousLevelMetres: parseDecimal(readCell(row, "Registro Anterior:")),
    previousObservedAt: parsePrefecturaTimestamp(readCell(row, "Fecha Anterior:")),
  };
}

/** Extrae la tabla de alturas vigente completa. */
export function parsePrefecturaReadings(html: string): readonly PrefecturaReading[] {
  const readings: PrefecturaReading[] = [];

  for (const match of html.matchAll(rowPattern)) {
    const row = String(match[1]);
    if (!portRowPattern.test(row) || !portIdPattern.test(row)) {
      continue;
    }

    readings.push(parseReading(row));
  }

  return readings;
}

/**
 * Extrae la serie que Prefectura dibuja con Highcharts en la pagina historica.
 * Los puntos vienen como pares [milisegundos, metros].
 */
export function parsePrefecturaHistory(html: string): readonly TelemetryPoint[] {
  const byTimestamp = new Map<number, number>();

  for (const match of html.matchAll(historicalPointPattern)) {
    byTimestamp.set(Number(match[1]), Number(match[2]));
  }

  return [...byTimestamp.entries()]
    .sort(([left], [right]) => left - right)
    .map(([timestamp, value]) => ({ timestamp: new Date(timestamp), value }));
}
