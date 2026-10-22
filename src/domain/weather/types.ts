/**
 * Modelo meteorologico.
 *
 * Las observaciones provienen de redes oficiales; el pronostico, de
 * Open-Meteo. Ambos se modelan por separado justamente para no confundir
 * dato observado con dato previsto.
 */

import type { GeoPoint } from "../catalog/types";

export type WeatherCondition =
  | "clear"
  | "mainly-clear"
  | "partly-cloudy"
  | "overcast"
  | "fog"
  | "drizzle"
  | "freezing-drizzle"
  | "rain"
  | "freezing-rain"
  | "snow"
  | "rain-showers"
  | "snow-showers"
  | "thunderstorm"
  | "thunderstorm-hail"
  | "unknown";

export type WindDirection =
  | "north"
  | "north-east"
  | "east"
  | "south-east"
  | "south"
  | "south-west"
  | "west"
  | "north-west";

export interface WeatherObservation {
  readonly timestamp: Date;
  readonly temperatureCelsius: number | null;
  readonly apparentTemperatureCelsius: number | null;
  readonly relativeHumidityPercent: number | null;
  readonly precipitationMillimetres: number | null;
  readonly windSpeedKilometresPerHour: number | null;
  readonly windDirectionDegrees: number | null;
  readonly pressureHectopascals: number | null;
  readonly cloudCoverPercent: number | null;
  readonly condition: WeatherCondition;
  /** `true` si el valor es una prediccion y no una observacion. */
  readonly isForecast: boolean;
}

export interface WeatherForecastDay {
  readonly date: Date;
  readonly minimumTemperatureCelsius: number | null;
  readonly maximumTemperatureCelsius: number | null;
  readonly precipitationMillimetres: number | null;
  readonly precipitationProbabilityPercent: number | null;
  readonly maximumWindSpeedKilometresPerHour: number | null;
  readonly condition: WeatherCondition;
}

export interface WeatherSnapshot {
  readonly location: GeoPoint;
  /** Zona horaria IANA usada por el pronostico. */
  readonly timezone: string;
  readonly current: WeatherObservation | null;
  readonly forecast: readonly WeatherForecastDay[];
  /** Fuente del pronostico, para citarla en la interfaz. */
  readonly forecastSourceName: string;
}
