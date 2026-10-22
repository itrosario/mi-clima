/**
 * Modelo de telemetria.
 *
 * Una `TelemetrySeries` es la serie temporal de una variable (por ejemplo,
 * altura del agua) para una estacion. Los puntos siempre se ordenan y se
 * deduplican por instante antes de usarse.
 */

import type { StationId, VariableId } from "../catalog/types";

export interface TelemetryPoint {
  readonly timestamp: Date;
  readonly value: number;
}

export interface TelemetrySeries {
  readonly stationId: StationId;
  readonly variableId: VariableId;
  /** Unidad publicada por el organismo (m, m3/s, mm, ...). */
  readonly unit: string;
  readonly points: readonly TelemetryPoint[];
}

/** Rango temporal cerrado por ambos extremos. */
export interface DateRange {
  readonly from: Date;
  readonly to: Date;
}

/** Variable de altura del agua, la base del semaforo hidrologico. */
export const waterLevelVariableId: VariableId = 2;

/** Variable de caudal. */
export const dischargeVariableId: VariableId = 4;

/** Variable de precipitacion. */
export const precipitationVariableId: VariableId = 1;
