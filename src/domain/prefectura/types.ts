/**
 * Lecturas publicadas por la Prefectura Naval Argentina.
 *
 * La Prefectura publica una tabla de alturas por puerto, con su umbral de
 * alerta y de evacuacion. El modelo conserva esos valores tal como se
 * publican: no se interpolan ni se completan.
 */

export type PrefecturaTrend = "rising" | "falling" | "steady" | "unknown";

export interface PrefecturaReading {
  /** Identificador interno del puerto en el sitio de Prefectura. */
  readonly portId: number;
  readonly portName: string;
  readonly riverName: string;
  readonly levelMetres: number | null;
  readonly variationMetres: number | null;
  readonly periodHours: number | null;
  readonly observedAt: Date | null;
  readonly trend: PrefecturaTrend;
  readonly alertLevelMetres: number | null;
  readonly evacuationLevelMetres: number | null;
  readonly previousLevelMetres: number | null;
  readonly previousObservedAt: Date | null;
}

export interface PrefecturaSnapshot {
  readonly fetchedAt: Date;
  readonly sourceName: string;
  readonly readings: readonly PrefecturaReading[];
}
