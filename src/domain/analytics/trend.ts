/**
 * Tendencia y velocidad de variacion de una serie hidrometrica.
 *
 * Combina dos lecturas complementarias:
 * - la pendiente de la recta de regresion, que describe la direccion general;
 * - la velocidad media de variacion entre el primer y el ultimo punto, que
 *   describe el ritmo efectivo del periodo.
 */

import { sortPointsByTime } from "../telemetry/series";
import type { TelemetryPoint } from "../telemetry/types";
import { linearRegression } from "./regression";

export type TrendDirection = "rising" | "falling" | "steady" | "unknown";

export interface TrendAnalysis {
  readonly direction: TrendDirection;
  /** Pendiente de la regresion, en unidades de la variable por dia. */
  readonly slopePerDay: number | null;
  /** Variacion media entre extremos, en unidades por dia. */
  readonly rateOfChangePerDay: number | null;
  readonly firstValue: number | null;
  readonly lastValue: number | null;
  /** Diferencia entre el ultimo y el primer valor. */
  readonly delta: number | null;
  readonly pointCount: number;
  /** Dias transcurridos entre el primer y el ultimo punto. */
  readonly windowDays: number;
  /** Bondad del ajuste lineal, entre 0 y 1. */
  readonly rSquared: number | null;
}

export interface TrendOptions {
  /** Pendiente por debajo de la cual la serie se considera estable. */
  readonly steadyThresholdPerDay?: number;
}

export const defaultSteadyThresholdPerDay = 0.001;

const millisecondsPerDay = 86_400_000;

function emptyAnalysis(pointCount: number): TrendAnalysis {
  return {
    direction: "unknown",
    slopePerDay: null,
    rateOfChangePerDay: null,
    firstValue: null,
    lastValue: null,
    delta: null,
    pointCount,
    windowDays: 0,
    rSquared: null,
  };
}

/**
 * Analiza la tendencia de una serie de puntos.
 *
 * Acepta los puntos en cualquier orden y los ordena internamente. Necesita al
 * menos dos instantes distintos para pronunciarse: con menos informacion
 * devuelve `unknown` en lugar de inventar una direccion.
 */
export function analyzeTrend(
  points: readonly TelemetryPoint[],
  options: TrendOptions = {},
): TrendAnalysis {
  const orderedPoints = sortPointsByTime(points);

  if (orderedPoints.length < 2) {
    return emptyAnalysis(orderedPoints.length);
  }

  const firstPoint = orderedPoints[0] as TelemetryPoint;
  const lastPoint = orderedPoints[orderedPoints.length - 1] as TelemetryPoint;

  const elapsedMilliseconds = lastPoint.timestamp.getTime() - firstPoint.timestamp.getTime();
  const windowDays = elapsedMilliseconds / millisecondsPerDay;

  if (windowDays <= 0) {
    return emptyAnalysis(orderedPoints.length);
  }

  const elapsedDays = orderedPoints.map(
    (point) => (point.timestamp.getTime() - firstPoint.timestamp.getTime()) / millisecondsPerDay,
  );
  const values = orderedPoints.map((point) => point.value);
  const regression = linearRegression(elapsedDays, values);

  const steadyThreshold = options.steadyThresholdPerDay ?? defaultSteadyThresholdPerDay;
  const direction = resolveTrendDirection(regression.slope, steadyThreshold);

  return {
    direction,
    slopePerDay: regression.slope,
    rateOfChangePerDay: (lastPoint.value - firstPoint.value) / windowDays,
    firstValue: firstPoint.value,
    lastValue: lastPoint.value,
    delta: lastPoint.value - firstPoint.value,
    pointCount: orderedPoints.length,
    windowDays,
    rSquared: regression.rSquared,
  };
}

export function resolveTrendDirection(slope: number, steadyThreshold: number): TrendDirection {
  if (slope > steadyThreshold) {
    return "rising";
  }
  if (slope < -steadyThreshold) {
    return "falling";
  }
  return "steady";
}
