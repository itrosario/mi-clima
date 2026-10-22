/**
 * Clima actual y pronostico.
 *
 * Open-Meteo es la unica fuente no oficial del sitio. El caso de uso devuelve
 * la instantanea junto con la marca `isOfficial: false` y la atribucion, para
 * que ninguna vista pueda mostrar el pronostico como dato de un organismo.
 */

import type { GeoPoint } from "@/domain/catalog/types";
import type { SourceAttribution } from "@/domain/export/types";
import type { Clock } from "@/domain/ports/clock";
import type { WeatherSource } from "@/domain/ports/weatherSource";
import type { WeatherSnapshot } from "@/domain/weather/types";
import { openMeteoAttribution } from "../shared/attributions";

/** Coordenadas de referencia del proyecto: Rosario, Santa Fe. */
export const rosarioLocation: GeoPoint = { latitude: -32.9468, longitude: -60.6393 };
export const rosarioTimezone = "America/Argentina/Cordoba";
export const defaultForecastDays = 7;

export interface WeatherDependencies {
  readonly source: WeatherSource;
  readonly clock: Clock;
}

export interface WeatherOptions {
  readonly location?: GeoPoint;
  readonly timezone?: string;
  readonly forecastDays?: number;
}

export interface WeatherView {
  readonly snapshot: WeatherSnapshot;
  readonly fetchedAt: Date;
  readonly isOfficial: false;
  readonly attribution: SourceAttribution;
}

/** Pide la condicion actual y el pronostico de los proximos dias. */
export async function loadWeather(
  dependencies: WeatherDependencies,
  options: WeatherOptions = {},
  signal?: AbortSignal,
): Promise<WeatherView> {
  const snapshot = await dependencies.source.fetchWeather(
    {
      location: options.location ?? rosarioLocation,
      timezone: options.timezone ?? rosarioTimezone,
      forecastDays: options.forecastDays ?? defaultForecastDays,
    },
    signal,
  );

  return {
    snapshot,
    fetchedAt: dependencies.clock.now(),
    isOfficial: false,
    attribution: openMeteoAttribution,
  };
}
