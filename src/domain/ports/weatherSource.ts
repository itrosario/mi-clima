/**
 * Puerto meteorologico.
 *
 * Devuelve una instantanea completa: condicion actual y pronostico por dia.
 * Separar esta fuente de la hidrologica permite etiquetar en la interfaz que
 * el pronostico no es un dato oficial argentino.
 */

import type { GeoPoint } from "../catalog/types";
import type { WeatherSnapshot } from "../weather/types";

export interface WeatherRequest {
  readonly location: GeoPoint;
  /** Zona horaria IANA, por ejemplo `America/Argentina/Cordoba`. */
  readonly timezone: string;
  /** Cantidad de dias de pronostico solicitados. */
  readonly forecastDays: number;
}

export interface WeatherSource {
  fetchWeather(request: WeatherRequest, signal?: AbortSignal): Promise<WeatherSnapshot>;
}
