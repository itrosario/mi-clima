/**
 * Extremos anuales y dias en alerta.
 *
 * El INA publica mas de un registro por dia en algunas estaciones. Para
 * contar "dias en alerta" hay que agregar primero por dia: contar registros
 * inflaria el resultado. Este modulo hace esa agregacion explicitamente.
 */

import type { Thresholds } from "../catalog/types";
import { sortPointsByTime } from "../telemetry/series";
import type { TelemetryPoint } from "../telemetry/types";

export interface DailyExtreme {
  /** Fecha en formato `YYYY-MM-DD` (UTC). */
  readonly dateKey: string;
  readonly maximum: number;
  readonly minimum: number;
  readonly mean: number;
  readonly sampleCount: number;
}

export interface AnnualExtreme {
  readonly year: number;
  readonly maximum: number;
  readonly minimum: number;
  readonly daysAboveAlert: number;
  readonly daysAboveEvacuation: number;
  readonly observedDays: number;
}

export interface YearlyMaximum {
  readonly year: number;
  readonly maximum: number;
  readonly dateKey: string;
}

function toDateKey(timestamp: Date): string {
  const year = timestamp.getUTCFullYear();
  const month = `${timestamp.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${timestamp.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

interface DailyAccumulator {
  readonly dateKey: string;
  readonly year: number;
  maximum: number;
  minimum: number;
  total: number;
  sampleCount: number;
}

/** Agrega una serie en un registro por dia, ordenado cronologicamente. */
export function toDailyExtremes(points: readonly TelemetryPoint[]): readonly DailyExtreme[] {
  const accumulators = new Map<string, DailyAccumulator>();

  for (const point of sortPointsByTime(points)) {
    const dateKey = toDateKey(point.timestamp);
    const existingAccumulator = accumulators.get(dateKey);

    if (existingAccumulator) {
      existingAccumulator.maximum = Math.max(existingAccumulator.maximum, point.value);
      existingAccumulator.minimum = Math.min(existingAccumulator.minimum, point.value);
      existingAccumulator.total += point.value;
      existingAccumulator.sampleCount += 1;
      continue;
    }

    accumulators.set(dateKey, {
      dateKey,
      year: point.timestamp.getUTCFullYear(),
      maximum: point.value,
      minimum: point.value,
      total: point.value,
      sampleCount: 1,
    });
  }

  return [...accumulators.values()]
    .sort((left, right) => left.dateKey.localeCompare(right.dateKey))
    .map((accumulator) => ({
      dateKey: accumulator.dateKey,
      maximum: accumulator.maximum,
      minimum: accumulator.minimum,
      mean: accumulator.total / accumulator.sampleCount,
      sampleCount: accumulator.sampleCount,
    }));
}

interface AnnualAccumulator {
  year: number;
  maximum: number;
  minimum: number;
  daysAboveAlert: number;
  daysAboveEvacuation: number;
  observedDays: number;
}

/**
 * Calcula, por anio, el maximo y el minimo observados y la cantidad de dias
 * en los que el maximo diario alcanzo cada umbral.
 */
export function computeAnnualExtremes(
  points: readonly TelemetryPoint[],
  thresholds: Thresholds,
): readonly AnnualExtreme[] {
  const dailyExtremes = toDailyExtremes(points);
  const annualAccumulators = new Map<number, AnnualAccumulator>();

  for (const dailyExtreme of dailyExtremes) {
    const year = Number.parseInt(dailyExtreme.dateKey.slice(0, 4), 10);
    const existingAccumulator = annualAccumulators.get(year);

    const aboveAlert =
      thresholds.alert !== null && dailyExtreme.maximum >= thresholds.alert ? 1 : 0;
    const aboveEvacuation =
      thresholds.evacuation !== null && dailyExtreme.maximum >= thresholds.evacuation ? 1 : 0;

    if (!existingAccumulator) {
      annualAccumulators.set(year, {
        year,
        maximum: dailyExtreme.maximum,
        minimum: dailyExtreme.minimum,
        daysAboveAlert: aboveAlert,
        daysAboveEvacuation: aboveEvacuation,
        observedDays: 1,
      });
      continue;
    }

    existingAccumulator.maximum = Math.max(existingAccumulator.maximum, dailyExtreme.maximum);
    existingAccumulator.minimum = Math.min(existingAccumulator.minimum, dailyExtreme.minimum);
    existingAccumulator.daysAboveAlert += aboveAlert;
    existingAccumulator.daysAboveEvacuation += aboveEvacuation;
    existingAccumulator.observedDays += 1;
  }

  return [...annualAccumulators.values()].sort((left, right) => left.year - right.year);
}

/** Maximo anual con la fecha en que ocurrio. */
export function computeYearlyMaxima(points: readonly TelemetryPoint[]): readonly YearlyMaximum[] {
  const yearlyMaxima = new Map<number, YearlyMaximum>();

  for (const dailyExtreme of toDailyExtremes(points)) {
    const year = Number.parseInt(dailyExtreme.dateKey.slice(0, 4), 10);
    const existingMaximum = yearlyMaxima.get(year);

    if (!existingMaximum || dailyExtreme.maximum > existingMaximum.maximum) {
      yearlyMaxima.set(year, {
        year,
        maximum: dailyExtreme.maximum,
        dateKey: dailyExtreme.dateKey,
      });
    }
  }

  return [...yearlyMaxima.values()].sort((left, right) => left.year - right.year);
}
