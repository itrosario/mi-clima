/**
 * Operaciones puras sobre series de telemetria.
 *
 * Ninguna de estas funciones muta la entrada: siempre devuelven colecciones
 * nuevas, de modo que la capa de presentacion pueda combinar resultados sin
 * efectos colaterales.
 */

import type { DateRange, TelemetryPoint, TelemetrySeries } from "./types";

function compareTimestamps(left: TelemetryPoint, right: TelemetryPoint): number {
  return left.timestamp.getTime() - right.timestamp.getTime();
}

/** Ordena los puntos de forma ascendente por instante. */
export function sortPointsByTime(points: readonly TelemetryPoint[]): readonly TelemetryPoint[] {
  return [...points].sort(compareTimestamps);
}

/**
 * Elimina puntos repetidos para el mismo instante.
 *
 * Cuando el origen publica dos valores para la misma marca temporal se
 * conserva el ultimo, que es el que refleja la correccion mas reciente.
 */
export function dedupePointsByTimestamp(
  points: readonly TelemetryPoint[],
): readonly TelemetryPoint[] {
  const pointsByTimestamp = new Map<number, TelemetryPoint>();

  for (const point of points) {
    pointsByTimestamp.set(point.timestamp.getTime(), point);
  }

  return [...pointsByTimestamp.values()];
}

/** Ordena y deduplica en un solo paso. */
export function normalizePoints(points: readonly TelemetryPoint[]): readonly TelemetryPoint[] {
  return sortPointsByTime(dedupePointsByTimestamp(points));
}

/** Filtra los puntos dentro del rango, con ambos extremos incluidos. */
export function filterPointsByRange(
  points: readonly TelemetryPoint[],
  range: DateRange,
): readonly TelemetryPoint[] {
  const fromTime = range.from.getTime();
  const toTime = range.to.getTime();

  return points.filter((point) => {
    const pointTime = point.timestamp.getTime();
    return pointTime >= fromTime && pointTime <= toTime;
  });
}

/** Devuelve el punto mas reciente o `null` si la serie esta vacia. */
export function latestPoint(points: readonly TelemetryPoint[]): TelemetryPoint | null {
  const orderedPoints = sortPointsByTime(points);
  if (orderedPoints.length === 0) {
    return null;
  }
  return orderedPoints[orderedPoints.length - 1] as TelemetryPoint;
}

/** Devuelve el punto mas antiguo o `null` si la serie esta vacia. */
export function earliestPoint(points: readonly TelemetryPoint[]): TelemetryPoint | null {
  const orderedPoints = sortPointsByTime(points);
  if (orderedPoints.length === 0) {
    return null;
  }
  return orderedPoints[0] as TelemetryPoint;
}

/** Indica si la serie no tiene ningun punto. */
export function isSeriesEmpty(series: TelemetrySeries): boolean {
  return series.points.length === 0;
}

/** Devuelve el nivel mas reciente de la serie, o `null` si esta vacia. */
export function latestValue(points: readonly TelemetryPoint[]): number | null {
  return latestPoint(points)?.value ?? null;
}

/** Construye una serie normalizada a partir de puntos crudos. */
export function createSeries(
  stationId: string,
  variableId: number,
  unit: string,
  points: readonly TelemetryPoint[],
): TelemetrySeries {
  return {
    stationId,
    variableId,
    unit,
    points: normalizePoints(points),
  };
}

/** Rango efectivamente cubierto por una coleccion de puntos. */
export function coveredRange(points: readonly TelemetryPoint[]): DateRange | null {
  const orderedPoints = sortPointsByTime(points);

  if (orderedPoints.length === 0) {
    return null;
  }

  return {
    from: (orderedPoints[0] as TelemetryPoint).timestamp,
    to: (orderedPoints[orderedPoints.length - 1] as TelemetryPoint).timestamp,
  };
}
