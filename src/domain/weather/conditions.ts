/**
 * Traduccion de los codigos WMO de tiempo significativo y de la direccion
 * del viento a un vocabulario propio del dominio.
 *
 * Los codigos WMO son el estandar que usa Open-Meteo. Traducirlos una sola
 * vez evita que cada pantalla invente su propia tabla.
 */

import type { WeatherCondition, WindDirection } from "./types";

const conditionByWmoCode: Readonly<Record<number, WeatherCondition>> = {
  0: "clear",
  1: "mainly-clear",
  2: "partly-cloudy",
  3: "overcast",
  45: "fog",
  48: "fog",
  51: "drizzle",
  53: "drizzle",
  55: "drizzle",
  56: "freezing-drizzle",
  57: "freezing-drizzle",
  61: "rain",
  63: "rain",
  65: "rain",
  66: "freezing-rain",
  67: "freezing-rain",
  71: "snow",
  73: "snow",
  75: "snow",
  77: "snow",
  80: "rain-showers",
  81: "rain-showers",
  82: "rain-showers",
  85: "snow-showers",
  86: "snow-showers",
  95: "thunderstorm",
  96: "thunderstorm-hail",
  99: "thunderstorm-hail",
};

export function conditionFromWmoCode(code: number | null | undefined): WeatherCondition {
  if (code === null || code === undefined) {
    return "unknown";
  }
  return conditionByWmoCode[code] ?? "unknown";
}

const compassPoints: readonly WindDirection[] = [
  "north",
  "north-east",
  "east",
  "south-east",
  "south",
  "south-west",
  "west",
  "north-west",
];

/**
 * Convierte una direccion en grados a una rosa de ocho vientos.
 *
 * Los grados se normalizan primero al rango [0, 360) para aceptar valores
 * negativos o mayores a una vuelta completa.
 */
export function windDirectionFromDegrees(degrees: number | null | undefined): WindDirection | null {
  if (degrees === null || degrees === undefined || Number.isNaN(degrees)) {
    return null;
  }

  const normalizedDegrees = ((degrees % 360) + 360) % 360;
  // El modulo garantiza un indice entre 0 y 7, que siempre existe en la rosa.
  const compassIndex = Math.round(normalizedDegrees / 45) % compassPoints.length;

  return compassPoints[compassIndex] as WindDirection;
}

/** Indica si la condicion implica precipitacion, para iconografia y avisos. */
export function isPrecipitationCondition(condition: WeatherCondition): boolean {
  return (
    condition === "drizzle" ||
    condition === "freezing-drizzle" ||
    condition === "rain" ||
    condition === "freezing-rain" ||
    condition === "snow" ||
    condition === "rain-showers" ||
    condition === "snow-showers" ||
    condition === "thunderstorm" ||
    condition === "thunderstorm-hail"
  );
}
