/**
 * Anomalia contra la climatologia historica.
 *
 * El INA publica, para cada serie y cada dia del ano, una tabla de
 * percentiles. Comparar el nivel observado contra esa tabla responde una
 * pregunta mas honesta que comparar contra un promedio: dice en que lugar de
 * la distribucion historica cae el valor de hoy.
 */

export interface PercentileEntry {
  /** Percentil entre 0 y 100. */
  readonly percentile: number;
  readonly value: number;
}

export interface DailyPercentileProfile {
  /** Dia del ano, 1 a 366. */
  readonly dayOfYear: number;
  readonly percentiles: readonly PercentileEntry[];
}

export interface PercentileTable {
  readonly stationId: string;
  readonly variableId: number;
  readonly profiles: readonly DailyPercentileProfile[];
}

export type AnomalyBand =
  | "very-low"
  | "low"
  | "below-normal"
  | "normal"
  | "above-normal"
  | "high"
  | "very-high"
  | "unknown";

export interface AnomalyAnalysis {
  readonly observed: number;
  /** Valor mediano historico para el dia del ano (percentil 50). */
  readonly expected: number | null;
  /** Diferencia en unidades de la variable. */
  readonly absolute: number | null;
  /** Diferencia relativa respecto del valor esperado. */
  readonly relative: number | null;
  /** Posicion del valor observado dentro de la distribucion historica. */
  readonly percentileRank: number | null;
  readonly band: AnomalyBand;
}

const millisecondsPerDay = 86_400_000;
export const daysPerYear = 365;

/** Dia del ano en UTC, 1 a 366. */
export function dayOfYear(timestamp: Date): number {
  const startOfYear = Date.UTC(timestamp.getUTCFullYear(), 0, 1);
  const startOfDay = Date.UTC(
    timestamp.getUTCFullYear(),
    timestamp.getUTCMonth(),
    timestamp.getUTCDate(),
  );

  return Math.floor((startOfDay - startOfYear) / millisecondsPerDay) + 1;
}

/**
 * Busca el perfil del dia del ano mas cercano.
 *
 * La distancia se mide de forma circular para que el 1 de enero quede al lado
 * del 31 de diciembre y para tolerar tablas que omiten el 29 de febrero.
 */
export function findDailyProfile(
  profiles: readonly DailyPercentileProfile[],
  timestamp: Date,
): DailyPercentileProfile | null {
  if (profiles.length === 0) {
    return null;
  }

  const targetDay = dayOfYear(timestamp);

  let closestProfile: DailyPercentileProfile | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const profile of profiles) {
    const directDistance = Math.abs(profile.dayOfYear - targetDay);
    const circularDistance = Math.min(directDistance, daysPerYear + 1 - directDistance);

    if (circularDistance < closestDistance) {
      closestDistance = circularDistance;
      closestProfile = profile;
    }
  }

  return closestProfile;
}

/**
 * Interpola linealmente el valor de un percentil cualquiera.
 *
 * Fuera de la tabla se devuelve el extremo conocido: no se extrapola.
 */
export function interpolatePercentileValue(
  percentiles: readonly PercentileEntry[],
  targetPercentile: number,
): number | null {
  if (percentiles.length === 0) {
    return null;
  }

  const orderedPercentiles = [...percentiles].sort(
    (left, right) => left.percentile - right.percentile,
  );
  const firstPercentile = orderedPercentiles[0] as PercentileEntry;
  const lastPercentile = orderedPercentiles.at(-1) as PercentileEntry;

  if (targetPercentile <= firstPercentile.percentile) {
    return firstPercentile.value;
  }
  if (targetPercentile >= lastPercentile.percentile) {
    return lastPercentile.value;
  }

  const upperIndex = orderedPercentiles.findIndex(
    (entry, index) => index > 0 && targetPercentile <= entry.percentile,
  );
  // El clamp mantiene el indice dentro de la tabla aunque llegara desordenada.
  const safeUpperIndex = Math.min(Math.max(upperIndex, 1), orderedPercentiles.length - 1);
  const upperPercentile = orderedPercentiles[safeUpperIndex] as PercentileEntry;
  const lowerPercentile = orderedPercentiles[safeUpperIndex - 1] as PercentileEntry;

  const percentileSpan = upperPercentile.percentile - lowerPercentile.percentile;
  const valueSpan = upperPercentile.value - lowerPercentile.value;
  const fraction = (targetPercentile - lowerPercentile.percentile) / percentileSpan;

  return lowerPercentile.value + valueSpan * fraction;
}

/**
 * Estima el percentil en el que cae un valor observado.
 *
 * Es la operacion inversa de `interpolatePercentileValue`: fuera de la tabla
 * devuelve 0 o 100, nunca un percentil imposible.
 */
export function estimatePercentileRank(
  percentiles: readonly PercentileEntry[],
  observedValue: number,
): number | null {
  if (percentiles.length === 0) {
    return null;
  }

  const orderedPercentiles = [...percentiles].sort((left, right) => left.value - right.value);
  const lowestPercentile = orderedPercentiles[0] as PercentileEntry;
  const highestPercentile = orderedPercentiles.at(-1) as PercentileEntry;

  if (observedValue <= lowestPercentile.value) {
    return lowestPercentile.percentile;
  }
  if (observedValue >= highestPercentile.value) {
    return highestPercentile.percentile;
  }

  const upperIndex = orderedPercentiles.findIndex(
    (entry, index) => index > 0 && observedValue <= entry.value,
  );
  // El clamp mantiene el indice dentro de la tabla aunque llegara desordenada.
  const safeUpperIndex = Math.min(Math.max(upperIndex, 1), orderedPercentiles.length - 1);
  const upperPercentile = orderedPercentiles[safeUpperIndex] as PercentileEntry;
  const lowerPercentile = orderedPercentiles[safeUpperIndex - 1] as PercentileEntry;

  const valueSpan = upperPercentile.value - lowerPercentile.value;
  const fraction = (observedValue - lowerPercentile.value) / valueSpan;

  return (
    lowerPercentile.percentile +
    fraction * (upperPercentile.percentile - lowerPercentile.percentile)
  );
}

export function resolveAnomalyBand(percentileRank: number | null): AnomalyBand {
  if (percentileRank === null) {
    return "unknown";
  }
  if (percentileRank < 10) {
    return "very-low";
  }
  if (percentileRank < 25) {
    return "low";
  }
  if (percentileRank < 40) {
    return "below-normal";
  }
  if (percentileRank <= 60) {
    return "normal";
  }
  if (percentileRank <= 75) {
    return "above-normal";
  }
  if (percentileRank <= 90) {
    return "high";
  }
  return "very-high";
}

/** Compara el nivel observado con el perfil historico del dia. */
export function computeAnomaly(
  observedValue: number,
  profile: DailyPercentileProfile | null,
): AnomalyAnalysis {
  if (!profile) {
    return {
      observed: observedValue,
      expected: null,
      absolute: null,
      relative: null,
      percentileRank: null,
      band: "unknown",
    };
  }

  const expected = interpolatePercentileValue(profile.percentiles, 50);
  const percentileRank = estimatePercentileRank(profile.percentiles, observedValue);

  return {
    observed: observedValue,
    expected,
    absolute: expected === null ? null : observedValue - expected,
    relative: expected === null || expected === 0 ? null : (observedValue - expected) / expected,
    percentileRank,
    band: resolveAnomalyBand(percentileRank),
  };
}
