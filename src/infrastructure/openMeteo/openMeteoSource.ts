/**
 * Pronostico y condicion actual de Open-Meteo.
 *
 * Es la unica fuente no oficial del sitio y por eso el dominio la separa del
 * resto: el pronostico siempre se muestra etiquetado como tal.
 */

import type { HttpPort } from "@/domain/ports/http";
import type { WeatherRequest, WeatherSource } from "@/domain/ports/weatherSource";
import type { WeatherSnapshot } from "@/domain/weather/types";
import { parseOpenMeteoSnapshot } from "./openMeteoPayload";

export const openMeteoForecastUrl = "https://api.open-meteo.com/v1/forecast";

const currentVariables = [
  "temperature_2m",
  "relative_humidity_2m",
  "apparent_temperature",
  "precipitation",
  "weather_code",
  "cloud_cover",
  "pressure_msl",
  "wind_speed_10m",
  "wind_direction_10m",
] as const;

const dailyVariables = [
  "weather_code",
  "temperature_2m_max",
  "temperature_2m_min",
  "precipitation_sum",
  "precipitation_probability_max",
  "wind_speed_10m_max",
] as const;

export class OpenMeteoError extends Error {
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "OpenMeteoError";
    this.status = status;
  }

  readonly status: number | null;
}

export function buildWeatherUrl(baseUrl: string, request: WeatherRequest): string {
  const query = new URLSearchParams({
    latitude: String(request.location.latitude),
    longitude: String(request.location.longitude),
    current: currentVariables.join(","),
    daily: dailyVariables.join(","),
    timezone: request.timezone,
    forecast_days: String(request.forecastDays),
    wind_speed_unit: "kmh",
  });

  return `${baseUrl}?${query.toString()}`;
}

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

export class OpenMeteoSource implements WeatherSource {
  private readonly http: HttpPort;
  private readonly baseUrl: string;

  constructor(http: HttpPort, baseUrl: string = openMeteoForecastUrl) {
    this.http = http;
    this.baseUrl = baseUrl;
  }

  async fetchWeather(request: WeatherRequest, signal?: AbortSignal): Promise<WeatherSnapshot> {
    const response = await this.http.send(
      { url: buildWeatherUrl(this.baseUrl, request), method: "GET" },
      signal,
    );

    if (!isSuccessfulStatus(response.status)) {
      throw new OpenMeteoError(`Open-Meteo respondio ${response.status}.`, response.status);
    }

    let payload: unknown;

    try {
      payload = JSON.parse(response.body);
    } catch {
      throw new OpenMeteoError("Open-Meteo devolvio una respuesta ilegible.");
    }

    const snapshot = parseOpenMeteoSnapshot(payload);

    if (snapshot === null) {
      throw new OpenMeteoError("Open-Meteo devolvio una respuesta inesperada.");
    }

    return snapshot;
  }
}
