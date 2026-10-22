/**
 * Modelo del semaforo hidrologico.
 *
 * El estado surge de comparar el nivel observado con los umbrales oficiales
 * publicados por el organismo. Cuando la estacion no publica ningun umbral el
 * estado es explicitamente `undefined`: el sitio no inventa umbrales.
 */

import type { StationId, Thresholds } from "../catalog/types";

/**
 * Estado del semaforo.
 *
 * - `low`: nivel en o por debajo del umbral de aguas bajas.
 * - `normal`: entre aguas bajas y alerta.
 * - `alert`: en o por encima del umbral de alerta, sin llegar a evacuacion.
 * - `evacuation`: en o por encima del umbral de evacuacion.
 * - `undefined`: la estacion no publica umbrales utilizables.
 */
export type FloodStatus = "low" | "normal" | "alert" | "evacuation" | "undefined";

export const floodStatuses: readonly FloodStatus[] = [
  "evacuation",
  "alert",
  "low",
  "normal",
  "undefined",
];

export interface FloodAssessment {
  readonly stationId: StationId;
  readonly status: FloodStatus;
  readonly level: number | null;
  readonly thresholds: Thresholds;
  /** Metros que faltan para alcanzar el umbral de alerta. Negativo si se supero. */
  readonly marginToAlert: number | null;
  /** Metros que faltan para alcanzar el umbral de evacuacion. Negativo si se supero. */
  readonly marginToEvacuation: number | null;
  /** Metros por encima del umbral de aguas bajas. Negativo si se esta por debajo. */
  readonly marginToLowWater: number | null;
  readonly evaluatedAt: Date;
}

export interface FloodSummary {
  readonly total: number;
  readonly countsByStatus: Readonly<Record<FloodStatus, number>>;
  readonly highestStatus: FloodStatus;
  readonly alertingStationIds: readonly StationId[];
  readonly evacuatingStationIds: readonly StationId[];
}
