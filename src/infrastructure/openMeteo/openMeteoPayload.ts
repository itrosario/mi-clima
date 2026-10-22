/**
 * Traduccion de la respuesta de Open-Meteo al modelo del dominio.
 *
 * Open-Meteo devuelve horas locales sin sufijo de zona y el desplazamiento
 * usado en el encabezado. Se reconstruye la marca de tiempo con ese
 * desplazamiento para que el navegador no aplique su propia zona horaria.
 */

import type { GeoPoint } from "@/domain/catalog/types";
import { conditionFromWmoCode } from "@/domain/weather/conditions";
import type {
  WeatherForecastDay,
  WeatherObservation,
  WeatherSnapshot,
} from "@/domain/weather/types";
import {
  isRecord,
  readArray,
  readArrayItem,
  toFiniteNumber,
  toNonEmptyText,
} from "../parsing/jsonValues";

export const openMeteoSourceName = "Open-Meteo";

function formatOffsetSuffix(offsetSeconds: number): string {
  const sign = offsetSeconds < 0 ? "-" : "+";
  const absoluteSeconds = Math.abs(offsetSeconds);
  const hours = String(Math.floor(absoluteSeconds / 3600)).padStart(2, "0");
  const minutes = String(Math.floor((absoluteSeconds % 3600) / 60)).padStart(2, "0");

  return `${sign}${hours}:${minutes}`;
}

/** Interpreta una hora local de Open-Meteo usando el desplazamiento informado. */
export function parseOffsetTimestamp(candidate: unknown, offsetSeconds: number): Date | null {
  const text = toNonEmptyText(candidate);

  if (text === null) {
    return null;
  }

  const withSeconds = text.length === 16 ? `${text}:00` : text;
  const parsed = new Date(`${withSeconds}${formatOffsetSuffix(offsetSeconds)}`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function readLocation(payload: Readonly<Record<string, unknown>>): GeoPoint | null {
  const latitude = toFiniteNumber(payload.latitude);
  const longitude = toFiniteNumber(payload.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }
  return { latitude, longitude };
}

function parseCurrentObservation(
  candidate: unknown,
  offsetSeconds: number,
): WeatherObservation | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const timestamp = parseOffsetTimestamp(candidate.time, offsetSeconds);

  if (timestamp === null) {
    return null;
  }

  return {
    timestamp,
    temperatureCelsius: toFiniteNumber(candidate.temperature_2m),
    apparentTemperatureCelsius: toFiniteNumber(candidate.apparent_temperature),
    relativeHumidityPercent: toFiniteNumber(candidate.relative_humidity_2m),
    precipitationMillimetres: toFiniteNumber(candidate.precipitation),
    windSpeedKilometresPerHour: toFiniteNumber(candidate.wind_speed_10m),
    windDirectionDegrees: toFiniteNumber(candidate.wind_direction_10m),
    pressureHectopascals: toFiniteNumber(candidate.pressure_msl),
    cloudCoverPercent: toFiniteNumber(candidate.cloud_cover),
    condition: conditionFromWmoCode(toFiniteNumber(candidate.weather_code)),
    isForecast: true,
  };
}

function parseForecastDay(
  daily: Readonly<Record<string, unknown>>,
  index: number,
  offsetSeconds: number,
): WeatherForecastDay | null {
  const dateValue = readArrayItem(daily.time, index);
  const date = parseOffsetTimestamp(
    typeof dateValue === "string" ? `${dateValue}T00:00:00` : null,
    offsetSeconds,
  );

  if (date === null) {
    return null;
  }

  return {
    date,
    minimumTemperatureCelsius: toFiniteNumber(readArrayItem(daily.temperature_2m_min, index)),
    maximumTemperatureCelsius: toFiniteNumber(readArrayItem(daily.temperature_2m_max, index)),
    precipitationMillimetres: toFiniteNumber(readArrayItem(daily.precipitation_sum, index)),
    precipitationProbabilityPercent: toFiniteNumber(
      readArrayItem(daily.precipitation_probability_max, index),
    ),
    maximumWindSpeedKilometresPerHour: toFiniteNumber(
      readArrayItem(daily.wind_speed_10m_max, index),
    ),
    condition: conditionFromWmoCode(toFiniteNumber(readArrayItem(daily.weather_code, index))),
  };
}

/**
 * Convierte el JSON de Open-Meteo en una instantanea del dominio.
 *
 * Devuelve `null` cuando falta la ubicacion: sin coordenadas el dato no se
 * puede situar en el mapa y no vale la pena mostrarlo.
 */
export function parseOpenMeteoSnapshot(payload: unknown): WeatherSnapshot | null {
  if (!isRecord(payload)) {
    return null;
  }

  const location = readLocation(payload);

  if (location === null) {
    return null;
  }

  const offsetSeconds = toFiniteNumber(payload.utc_offset_seconds) ?? 0;
  const daily = isRecord(payload.daily) ? payload.daily : {};
  const dayCount = readArray(daily.time).length;
  const forecast = Array.from({ length: dayCount }, (_, index) =>
    parseForecastDay(daily, index, offsetSeconds),
  ).filter((day): day is WeatherForecastDay => day !== null);

  return {
    location,
    timezone: toNonEmptyText(payload.timezone) ?? "UTC",
    current: parseCurrentObservation(payload.current, offsetSeconds),
    forecast,
    forecastSourceName: openMeteoSourceName,
  };
}
