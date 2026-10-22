/**
 * Lectura hidrometrica de un conjunto de estaciones.
 *
 * Es la pieza que comparten el panel, las alertas, las estadisticas y las
 * descargas: pide una serie por estacion, la evalua contra los umbrales
 * oficiales y calcula tendencia, variabilidad, media movil y extremos diarios.
 */

import type { DailyExtreme } from "@/domain/analytics/extremes";
import { toDailyExtremes } from "@/domain/analytics/extremes";
import type { TrendAnalysis } from "@/domain/analytics/trend";
import { analyzeTrend } from "@/domain/analytics/trend";
import type { MovingAveragePoint, VariabilitySummary } from "@/domain/analytics/variability";
import {
  movingAverage as computeMovingAverage,
  summarizeVariability,
} from "@/domain/analytics/variability";
import type { Station, StationId, VariableId } from "@/domain/catalog/types";
import { assessFlood } from "@/domain/flood/evaluator";
import type { FloodAssessment } from "@/domain/flood/types";
import type { Clock } from "@/domain/ports/clock";
import type { HydrologySource } from "@/domain/ports/hydrologySource";
import type { DateRange, TelemetryPoint, TelemetrySeries } from "@/domain/telemetry/types";
import { waterLevelVariableId } from "@/domain/telemetry/types";
import { mapWithConcurrency } from "../shared/concurrency";

export const defaultReadingConcurrency = 3;
export const defaultMovingWindowDays = 2;

export interface StationReadingsDependencies {
  readonly hydrologySource: HydrologySource;
  readonly clock: Clock;
  /** Consultas simultaneas al organismo; por defecto, tres. */
  readonly concurrency?: number;
  /** Ventana de la media movil, en dias. */
  readonly movingWindowDays?: number;
}

export interface StationReadingsRequest {
  readonly stations: readonly Station[];
  readonly range: DateRange;
  readonly variableId?: VariableId;
}

export interface StationReading {
  readonly station: Station;
  readonly series: TelemetrySeries;
  readonly latestPoint: TelemetryPoint | null;
  readonly assessment: FloodAssessment;
  readonly trend: TrendAnalysis;
  readonly variability: VariabilitySummary;
  readonly movingAverage: readonly MovingAveragePoint[];
  readonly dailyExtremes: readonly DailyExtreme[];
}

function toReading(
  station: Station,
  series: TelemetrySeries,
  evaluatedAtFallback: Date,
  movingWindowDays: number,
): StationReading {
  const latestPoint = series.points.at(-1) ?? null;
  const values = series.points.map((point) => point.value);

  return {
    station,
    series,
    latestPoint,
    assessment: assessFlood({
      stationId: station.id,
      level: latestPoint?.value ?? null,
      thresholds: station.thresholds,
      evaluatedAt: latestPoint?.timestamp ?? evaluatedAtFallback,
    }),
    trend: analyzeTrend(series.points),
    variability: summarizeVariability(values),
    movingAverage: computeMovingAverage(series.points, movingWindowDays),
    dailyExtremes: toDailyExtremes(series.points),
  };
}

/**
 * Consulta las estaciones pedidas y devuelve sus lecturas completas.
 *
 * Una estacion sin datos publicados no es un error: llega con la serie vacia y
 * el semaforo en `undefined`, y la interfaz lo informa como tal.
 */
export async function loadStationReadings(
  request: StationReadingsRequest,
  dependencies: StationReadingsDependencies,
  signal?: AbortSignal,
): Promise<readonly StationReading[]> {
  const variableId = request.variableId ?? waterLevelVariableId;
  const evaluatedAtFallback = dependencies.clock.now();
  const movingWindowDays = dependencies.movingWindowDays ?? defaultMovingWindowDays;

  return mapWithConcurrency(
    request.stations,
    dependencies.concurrency ?? defaultReadingConcurrency,
    async (station) => {
      const series = await dependencies.hydrologySource.fetchSeries(
        {
          stationId: station.id,
          variableId,
          from: request.range.from,
          to: request.range.to,
        },
        signal,
      );

      return toReading(station, series, evaluatedAtFallback, movingWindowDays);
    },
  );
}

/** Estaciones que efectivamente publicaron un nivel en la ventana consultada. */
export function stationsWithReadings(
  readings: readonly StationReading[],
): readonly (StationReading & { readonly latestPoint: TelemetryPoint })[] {
  return readings.filter(
    (reading): reading is StationReading & { readonly latestPoint: TelemetryPoint } =>
      reading.latestPoint !== null,
  );
}

/** Busca una lectura por identificador de estacion. */
export function findReading(
  readings: readonly StationReading[],
  stationId: StationId,
): StationReading | null {
  return readings.find((reading) => reading.station.id === stationId) ?? null;
}
