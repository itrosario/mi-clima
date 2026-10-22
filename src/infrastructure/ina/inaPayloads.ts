/**
 * Traduccion entre el formato publicado por el INA y el modelo del dominio.
 *
 * Todo lo que depende de la forma exacta de la respuesta oficial vive aca:
 * nombres de campo, unidades por defecto, marcas de tiempo sin zona horaria y
 * percentiles expresados como fraccion. Asi los adaptadores quedan delgados y
 * estas reglas se pueden probar con datos reales recortados.
 */

import type { PercentileEntry, PercentileTable } from "@/domain/analytics/anomaly";
import { normalizeRiverName } from "@/domain/catalog/riverNormalizer";
import type { Station, Thresholds } from "@/domain/catalog/types";
import { unknownReachId, unknownRiverId } from "@/domain/catalog/types";
import type { TelemetryPoint } from "@/domain/telemetry/types";
import {
  dischargeVariableId,
  precipitationVariableId,
  waterLevelVariableId,
} from "@/domain/telemetry/types";
import { toFiniteNumber, toNonEmptyText } from "../parsing/jsonValues";

/** El INA publica las horas en hora oficial argentina, sin sufijo de zona. */
const argentinaOffsetMilliseconds = -3 * 60 * 60 * 1000;

const argentinaOffsetSuffix = "-03:00";

/** Rio y tramo que se usan cuando el organismo no informa el curso de agua. */
const unknownRiver = {
  id: unknownRiverId,
  name: "Sin rio informado",
  aliases: [],
} as const;

const unknownReach = {
  id: unknownReachId,
  name: "Tramo no informado",
  riverId: unknownRiverId,
} as const;

/**
 * Interpreta una marca de tiempo del INA. El origen no informa la zona, y la
 * hora oficial argentina es UTC-3 todo el ano, asi que se declara de forma
 * explicita para que el navegador no la reinterprete con su zona local.
 */
export function parseInaTimestamp(candidate: unknown): Date | null {
  const text = toNonEmptyText(candidate);
  if (text === null) {
    return null;
  }

  const hasExplicitZone = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
  const parsed = new Date(hasExplicitZone ? text : `${text}${argentinaOffsetSuffix}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Formatea una fecha para el parametro `timeStart`/`timeEnd` del INA. */
export function formatInaTimestamp(date: Date): string {
  const shifted = new Date(date.getTime() + argentinaOffsetMilliseconds);
  return shifted.toISOString().slice(0, 19);
}

/** Unidad por defecto de las variables que consume el sitio. */
export function unitForVariable(variableId: number): string {
  if (variableId === waterLevelVariableId) {
    return "m";
  }
  if (variableId === dischargeVariableId) {
    return "m³/s";
  }
  if (variableId === precipitationVariableId) {
    return "mm";
  }
  return "";
}

function readThresholds(row: Readonly<Record<string, unknown>>): Thresholds {
  return {
    lowWater: toFiniteNumber(row.nivel_de_aguas_bajas),
    alert: toFiniteNumber(row.nivel_de_alerta),
    evacuation: toFiniteNumber(row.nivel_de_evacuacion),
  };
}

function readVariableIds(row: Readonly<Record<string, unknown>>): readonly number[] {
  const declaredVariable = toNonEmptyText(row.var);
  const stationType = toNonEmptyText(row.tipo);

  if (declaredVariable === "H" || stationType === "H") {
    return [waterLevelVariableId];
  }
  if (declaredVariable === "P") {
    return [precipitationVariableId];
  }
  return [];
}

function readLocation(row: Readonly<Record<string, unknown>>): Station["location"] {
  const latitude = toFiniteNumber(row.lat);
  const longitude = toFiniteNumber(row.lon);

  if (latitude === null || longitude === null) {
    return null;
  }
  return { latitude, longitude };
}

interface RiverAndReach {
  readonly river: Station["river"];
  readonly reach: Station["reach"];
}

/**
 * Normaliza rio y tramo juntos: comparten la misma regla curada y no tiene
 * sentido resolverla dos veces.
 */
function readRiverAndReach(rawRiverName: string | null): RiverAndReach {
  if (rawRiverName === null) {
    return { river: unknownRiver, reach: unknownReach };
  }

  const normalized = normalizeRiverName(rawRiverName);

  if (normalized === null) {
    return { river: unknownRiver, reach: unknownReach };
  }
  return {
    river: { id: normalized.id, name: normalized.name, aliases: [rawRiverName] },
    reach: { id: normalized.reachId, name: normalized.reachName, riverId: normalized.id },
  };
}

/** Convierte una fila de `estaciones` en una estacion del dominio. */
export function parseInaStation(row: Readonly<Record<string, unknown>>): Station | null {
  const stationId = toNonEmptyText(String(row.sitecode ?? ""));
  if (stationId === null) {
    return null;
  }

  const rawRiverName = toNonEmptyText(row.rio);
  const { river, reach } = readRiverAndReach(rawRiverName);

  return {
    id: stationId,
    name: toNonEmptyText(row.nombre) ?? stationId,
    river,
    reach,
    networkId: toFiniteNumber(row.redes_id) ?? 0,
    networkName: toNonEmptyText(row.nombre_red) ?? "Red no informada",
    location: readLocation(row),
    thresholds: readThresholds(row),
    variableIds: readVariableIds(row),
    updatedAt: null,
  };
}

/** Convierte una fila de `datos` en un punto de telemetria. */
export function parseInaObservation(row: Readonly<Record<string, unknown>>): TelemetryPoint | null {
  const timestamp = parseInaTimestamp(row.timestart);
  const value = toFiniteNumber(row.valor);

  if (timestamp === null || value === null) {
    return null;
  }
  return { timestamp, value };
}

function groupPercentilesByDay(
  rows: readonly Readonly<Record<string, unknown>>[],
): Map<number, PercentileEntry[]> {
  const percentilesByDay = new Map<number, PercentileEntry[]>();

  for (const row of rows) {
    const dayOfYear = toFiniteNumber(row.doy);
    const fraction = toFiniteNumber(row.percentil);
    const value = toFiniteNumber(row.valor);

    if (dayOfYear === null || fraction === null || value === null) {
      continue;
    }

    const dayEntries = percentilesByDay.get(dayOfYear) ?? [];
    dayEntries.push({
      // El INA publica el percentil como fraccion entre 0.01 y 0.99.
      percentile: Math.round(fraction * 10_000) / 100,
      value,
    });
    percentilesByDay.set(dayOfYear, dayEntries);
  }

  return percentilesByDay;
}

/**
 * Convierte la tabla de percentiles del INA en perfiles por dia del ano.
 *
 * Devuelve `null` cuando la serie no publica percentiles: el sitio prefiere
 * decir "sin referencia historica" antes que inventar una.
 */
export function parseInaPercentiles(
  rows: readonly Readonly<Record<string, unknown>>[],
  stationId: string,
  variableId: number,
): PercentileTable | null {
  const percentilesByDay = groupPercentilesByDay(rows);

  if (percentilesByDay.size === 0) {
    return null;
  }

  const profiles = [...percentilesByDay.entries()]
    .map(([dayOfYear, percentiles]) => ({
      dayOfYear,
      percentiles: [...percentiles].sort((left, right) => left.percentile - right.percentile),
    }))
    .sort((left, right) => left.dayOfYear - right.dayOfYear);

  return { stationId, variableId, profiles };
}
