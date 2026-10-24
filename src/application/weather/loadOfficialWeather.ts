/**
 * Observacion oficial del clima.
 *
 * El SMN publica el estado del tiempo de su red. El caso de uso elige la
 * estacion mas cercana a la ubicacion consultada y entrega la atribucion
 * oficial. Si la estacion mas cercana no publico una observacion, la vista
 * muestra el faltante en lugar de completarlo con otra fuente.
 */

import type { GeoPoint } from "@/domain/catalog/types";
import type { SourceAttribution } from "@/domain/export/types";
import type { Clock } from "@/domain/ports/clock";
import type { OfficialWeatherSource } from "@/domain/ports/officialWeatherSource";
import { nearestObservation, type OfficialWeatherObservation } from "@/domain/weather/official";
import { smnAttribution } from "../shared/attributions";
import { rosarioLocation } from "./loadWeather";

export interface OfficialWeatherDependencies {
  readonly source: OfficialWeatherSource;
  readonly clock: Clock;
}

export interface OfficialWeatherView {
  readonly observation: OfficialWeatherObservation | null;
  readonly fetchedAt: Date;
  readonly isOfficial: true;
  readonly attribution: SourceAttribution;
}

/** Pide la red oficial y devuelve la observacion mas cercana. */
export async function loadOfficialWeather(
  dependencies: OfficialWeatherDependencies,
  location: GeoPoint = rosarioLocation,
  signal?: AbortSignal,
): Promise<OfficialWeatherView> {
  const snapshot = await dependencies.source.fetchSnapshot(signal);

  return {
    observation: nearestObservation(snapshot.observations, location),
    fetchedAt: dependencies.clock.now(),
    isOfficial: true,
    attribution: smnAttribution,
  };
}
