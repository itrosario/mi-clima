/**
 * Anomalia historica de una estacion.
 *
 * Compara el nivel observado con la distribucion historica del mismo dia del
 * ano. La tabla de percentiles pesa varios megabytes, asi que se guarda en una
 * cache en memoria y solo se pide cuando hay una serie observada que comparar.
 */

import type {
  AnomalyAnalysis,
  DailyPercentileProfile,
  PercentileTable,
} from "@/domain/analytics/anomaly";
import { computeAnomaly, findDailyProfile } from "@/domain/analytics/anomaly";
import type { StationId, VariableId } from "@/domain/catalog/types";
import type { CachePort } from "@/domain/ports/cache";
import type { PercentilesSource } from "@/domain/ports/percentilesSource";

export const percentileCacheSeconds = 24 * 60 * 60;

export function percentileCacheKey(stationId: StationId, variableId: VariableId): string {
  return `percentiles:${stationId}:${variableId}`;
}

export interface StationAnomalyDependencies {
  readonly percentilesSource: PercentilesSource;
  readonly cache: CachePort;
}

export interface StationAnomalyRequest {
  readonly stationId: StationId;
  readonly variableId: VariableId;
  readonly observedValue: number;
  readonly observedAt: Date;
}

export interface StationAnomalyResult {
  readonly table: PercentileTable;
  readonly profile: DailyPercentileProfile | null;
  readonly anomaly: AnomalyAnalysis;
}

/**
 * Devuelve la tabla de percentiles desde la cache en memoria o desde el INA.
 *
 * `null` significa que la serie no publica referencia historica: es un dato
 * valido del origen, no un fallo.
 */
export async function loadPercentileTable(
  stationId: StationId,
  variableId: VariableId,
  dependencies: StationAnomalyDependencies,
  signal?: AbortSignal,
): Promise<PercentileTable | null> {
  const cacheKey = percentileCacheKey(stationId, variableId);
  const cached = await dependencies.cache.read<PercentileTable>(cacheKey);

  if (cached !== null) {
    return cached;
  }

  const table = await dependencies.percentilesSource.fetchPercentiles(
    { stationId, variableId },
    signal,
  );

  if (table === null) {
    return null;
  }

  await dependencies.cache.write(cacheKey, table, percentileCacheSeconds);

  return table;
}

/** Compara un valor observado con la referencia historica del dia. */
export async function loadStationAnomaly(
  request: StationAnomalyRequest,
  dependencies: StationAnomalyDependencies,
  signal?: AbortSignal,
): Promise<StationAnomalyResult | null> {
  const table = await loadPercentileTable(
    request.stationId,
    request.variableId,
    dependencies,
    signal,
  );

  if (table === null) {
    return null;
  }

  const profile = findDailyProfile(table.profiles, request.observedAt);

  return {
    table,
    profile,
    anomaly: computeAnomaly(request.observedValue, profile),
  };
}
