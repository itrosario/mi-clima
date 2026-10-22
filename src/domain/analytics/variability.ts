/**
 * Media movil y variabilidad de una serie hidrometrica.
 *
 * La media movil es temporal (ventana en dias, no en cantidad de muestras):
 * los organismos publican con frecuencias irregulares y una ventana por
 * cantidad de muestras falsearia el resultado.
 */

import { sortPointsByTime } from "../telemetry/series";
import type { TelemetryPoint } from "../telemetry/types";

export interface MovingAveragePoint {
  readonly timestamp: Date;
  readonly value: number;
  readonly sampleCount: number;
}

export interface VariabilitySummary {
  readonly mean: number | null;
  readonly minimum: number | null;
  readonly maximum: number | null;
  readonly range: number | null;
  /** Desviacion estandar poblacional. */
  readonly standardDeviation: number | null;
  /** Desviacion estandar dividida por la media; `null` si la media es cero. */
  readonly coefficientOfVariation: number | null;
  readonly sampleCount: number;
}

const millisecondsPerDay = 86_400_000;

export function mean(values: readonly number[]): number | null {
  if (values.length === 0) {
    return null;
  }
  return values.reduce((total, value) => total + value, 0) / values.length;
}

/** Desviacion estandar poblacional (divide por n). */
export function standardDeviation(values: readonly number[]): number | null {
  const average = mean(values);
  if (average === null) {
    return null;
  }

  const squaredDeviations = values.reduce(
    (total, value) => total + (value - average) * (value - average),
    0,
  );

  return Math.sqrt(squaredDeviations / values.length);
}

export function coefficientOfVariation(values: readonly number[]): number | null {
  const average = mean(values);
  const deviation = standardDeviation(values);

  if (average === null || deviation === null || average === 0) {
    return null;
  }

  return deviation / Math.abs(average);
}

/**
 * Media movil temporal con ventana hacia atras.
 *
 * Cada punto resultante promedia los valores observados en los `windowDays`
 * anteriores, incluido el propio instante.
 */
export function movingAverage(
  points: readonly TelemetryPoint[],
  windowDays: number,
): readonly MovingAveragePoint[] {
  if (windowDays <= 0 || points.length === 0) {
    return [];
  }

  const orderedPoints = sortPointsByTime(points);
  const windowMilliseconds = windowDays * millisecondsPerDay;
  const averagedPoints: MovingAveragePoint[] = [];

  let windowStartIndex = 0;
  let windowSum = 0;

  for (let index = 0; index < orderedPoints.length; index += 1) {
    const currentPoint = orderedPoints[index] as TelemetryPoint;
    windowSum += currentPoint.value;

    while (
      windowStartIndex < index &&
      (orderedPoints[windowStartIndex] as TelemetryPoint).timestamp.getTime() <
        currentPoint.timestamp.getTime() - windowMilliseconds
    ) {
      windowSum -= (orderedPoints[windowStartIndex] as TelemetryPoint).value;
      windowStartIndex += 1;
    }

    const sampleCount = index - windowStartIndex + 1;
    averagedPoints.push({
      timestamp: currentPoint.timestamp,
      value: windowSum / sampleCount,
      sampleCount,
    });
  }

  return averagedPoints;
}

export function summarizeVariability(values: readonly number[]): VariabilitySummary {
  if (values.length === 0) {
    return {
      mean: null,
      minimum: null,
      maximum: null,
      range: null,
      standardDeviation: null,
      coefficientOfVariation: null,
      sampleCount: 0,
    };
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);

  return {
    mean: mean(values),
    minimum,
    maximum,
    range: maximum - minimum,
    standardDeviation: standardDeviation(values),
    coefficientOfVariation: coefficientOfVariation(values),
    sampleCount: values.length,
  };
}
