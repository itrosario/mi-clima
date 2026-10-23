/**
 * Estadisticas historicas de una estacion.
 *
 * Pide dos ventanas: una reciente, para tendencia, variabilidad y media movil,
 * y una larga, para los maximos anuales y los dias en alerta. Con el ultimo
 * dato de la ventana reciente calcula ademas la anomalia contra percentiles.
 */

import { type AnnualExtreme, computeAnnualExtremes } from "@/domain/analytics/extremes";
import type { Station, VariableId } from "@/domain/catalog/types";
import type { DateRange } from "@/domain/telemetry/types";
import { waterLevelVariableId } from "@/domain/telemetry/types";
import {
  loadStationAnomaly,
  type StationAnomalyDependencies,
  type StationAnomalyResult,
} from "./loadStationAnomaly";
import {
  buildStationReading,
  defaultMovingWindowDays,
  type StationReading,
  type StationReadingsDependencies,
} from "./loadStationReadings";

export interface StationStatisticsDependencies
  extends StationReadingsDependencies,
    StationAnomalyDependencies {}

export interface StationStatisticsRequest {
  readonly station: Station;
  /** Ventana corta para tendencia y media movil. */
  readonly recentRange: DateRange;
  /** Ventana larga para extremos anuales. */
  readonly historyRange: DateRange;
  readonly variableId?: VariableId;
}

export interface StationStatistics {
  readonly reading: StationReading;
  readonly annualExtremes: readonly AnnualExtreme[];
  readonly anomaly: StationAnomalyResult | null;
  readonly historyPointCount: number;
}

export async function loadStationStatistics(
  request: StationStatisticsRequest,
  dependencies: StationStatisticsDependencies,
  signal?: AbortSignal,
): Promise<StationStatistics> {
  const variableId = request.variableId ?? waterLevelVariableId;

  const [recentSeries, historySeries] = await Promise.all([
    dependencies.hydrologySource.fetchSeries(
      {
        stationId: request.station.id,
        variableId,
        from: request.recentRange.from,
        to: request.recentRange.to,
      },
      signal,
    ),
    dependencies.hydrologySource.fetchSeries(
      {
        stationId: request.station.id,
        variableId,
        from: request.historyRange.from,
        to: request.historyRange.to,
      },
      signal,
    ),
  ]);

  const reading = buildStationReading(
    request.station,
    recentSeries,
    dependencies.clock.now(),
    dependencies.movingWindowDays ?? defaultMovingWindowDays,
  );

  const anomaly =
    reading.latestPoint === null
      ? null
      : await loadStationAnomaly(
          {
            stationId: request.station.id,
            variableId,
            observedValue: reading.latestPoint.value,
            observedAt: reading.latestPoint.timestamp,
          },
          dependencies,
          signal,
        );

  return {
    reading,
    annualExtremes: computeAnnualExtremes(historySeries.points, request.station.thresholds),
    anomaly,
    historyPointCount: historySeries.points.length,
  };
}
