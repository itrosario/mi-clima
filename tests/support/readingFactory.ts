import type { StationReading } from "@/application/station/loadStationReadings";
import { toDailyExtremes } from "@/domain/analytics/extremes";
import { analyzeTrend } from "@/domain/analytics/trend";
import { movingAverage, summarizeVariability } from "@/domain/analytics/variability";
import type { Station } from "@/domain/catalog/types";
import { assessFlood } from "@/domain/flood/evaluator";
import { createSeries } from "@/domain/telemetry/series";
import type { TelemetryPoint } from "@/domain/telemetry/types";
import { createPoint, createStation } from "./factories";

export interface ReadingOverrides {
  readonly station?: Station;
  readonly points?: readonly TelemetryPoint[];
}

const fallbackTimestamp = new Date("2026-10-22T12:00:00.000Z");

/** Lectura de estacion completa, armada con las mismas funciones del dominio. */
export function createReading(overrides: ReadingOverrides = {}): StationReading {
  const station = overrides.station ?? createStation();
  const points = overrides.points ?? [
    createPoint("2026-10-21T03:00:00.000Z", 4.8),
    createPoint("2026-10-22T03:00:00.000Z", 5.1),
  ];
  const latestPoint = points.at(-1) ?? null;
  const values = points.map((point) => point.value);

  return {
    station,
    series: createSeries(station.id, 2, "m", points),
    latestPoint,
    assessment: assessFlood({
      stationId: station.id,
      level: latestPoint?.value ?? null,
      thresholds: station.thresholds,
      evaluatedAt: latestPoint?.timestamp ?? fallbackTimestamp,
    }),
    trend: analyzeTrend(points),
    variability: summarizeVariability(values),
    movingAverage: movingAverage(points, 2),
    dailyExtremes: toDailyExtremes(points),
  };
}
