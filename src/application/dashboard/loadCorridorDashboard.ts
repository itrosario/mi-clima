/**
 * Panel del corredor del Parana.
 *
 * Es el caso de uso de la portada: seis estaciones de referencia, una lectura
 * por estacion, el resumen del semaforo, la comparacion aguas arriba - aguas
 * abajo y la senal de emergencia que dispara el banner del sitio.
 */

import type { StationComparison } from "@/domain/analytics/comparison";
import { compareStationReadings } from "@/domain/analytics/comparison";
import { homeStationId } from "@/domain/catalog/corridor";
import type { Station, StationId } from "@/domain/catalog/types";
import { summarizeFlood } from "@/domain/flood/evaluator";
import type { FloodSummary } from "@/domain/flood/types";
import type { DateRange } from "@/domain/telemetry/types";
import { rangeEndingAt } from "../shared/time";
import type { StationReading, StationReadingsDependencies } from "../station/loadStationReadings";
import { loadStationReadings, stationsWithReadings } from "../station/loadStationReadings";

export const defaultDashboardWindowDays = 7;

export interface CorridorDashboardDependencies extends StationReadingsDependencies {
  /** Dias de historia que acompanan a cada lectura. */
  readonly windowDays?: number;
}

export interface CorridorDashboard {
  readonly generatedAt: Date;
  readonly range: DateRange;
  readonly readings: readonly StationReading[];
  readonly comparison: readonly StationComparison[];
  readonly referenceStationId: StationId;
  readonly summary: FloodSummary;
  /** `true` cuando alguna estacion del corredor esta en evacuacion. */
  readonly hasEmergency: boolean;
}

/**
 * Carga el panel completo del corredor.
 *
 * El orden de `stations` decide el perfil de comparacion: se espera de aguas
 * arriba hacia aguas abajo.
 */
export async function loadCorridorDashboard(
  stations: readonly Station[],
  dependencies: CorridorDashboardDependencies,
  signal?: AbortSignal,
): Promise<CorridorDashboard> {
  const generatedAt = dependencies.clock.now();
  const range = rangeEndingAt(generatedAt, dependencies.windowDays ?? defaultDashboardWindowDays);

  const readings = await loadStationReadings({ stations, range }, dependencies, signal);

  const comparison = compareStationReadings(
    stationsWithReadings(readings).map((reading) => ({
      stationId: reading.station.id,
      name: reading.station.name,
      value: reading.latestPoint.value,
    })),
    homeStationId,
  );

  const summary = summarizeFlood(readings.map((reading) => reading.assessment));

  return {
    generatedAt,
    range,
    readings,
    comparison,
    referenceStationId: homeStationId,
    summary,
    hasEmergency: summary.evacuatingStationIds.length > 0,
  };
}
