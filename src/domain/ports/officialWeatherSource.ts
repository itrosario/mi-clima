/**
 * Puerto de observaciones meteorologicas oficiales.
 *
 * Devuelve la red completa publicada por el organismo. El caso de uso elige
 * la estacion mas cercana; el puerto no conoce coordenadas de interes ni
 * completa estaciones sin dato.
 */

import type { OfficialWeatherSnapshot } from "../weather/official";

export interface OfficialWeatherSource {
  fetchSnapshot(signal?: AbortSignal): Promise<OfficialWeatherSnapshot>;
}
