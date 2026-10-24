/**
 * Observaciones meteorologicas oficiales.
 *
 * El SMN publica el estado del tiempo de su red de estaciones. El sitio lo
 * usa como unica fuente observada oficial del clima: el pronostico sigue
 * viniendo de Open-Meteo y se etiqueta como no oficial.
 *
 * El texto de la condicion se reproduce tal como lo publica el SMN, sin
 * traducirlo ni reinterpretarlo.
 */

import type { GeoPoint } from "../catalog/types";

export const smnSourceName = "SMN - Servicio Meteorologico Nacional";

export interface OfficialWeatherObservation {
  readonly stationName: string;
  readonly province: string;
  readonly location: GeoPoint;
  readonly observedAt: Date;
  /** Texto literal publicado por el SMN; `null` si no informa la condicion. */
  readonly condition: string | null;
  readonly visibilityKilometres: number | null;
  readonly temperatureCelsius: number | null;
  readonly apparentTemperatureCelsius: number | null;
  readonly relativeHumidityPercent: number | null;
  readonly windDirectionText: string | null;
  readonly windSpeedKilometresPerHour: number | null;
  readonly pressureHectopascals: number | null;
}

export interface OfficialWeatherSnapshot {
  readonly source: string;
  readonly observations: readonly OfficialWeatherObservation[];
}

const earthRadiusKilometres = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/** Distancia en kilometros entre dos puntos por la formula del semiverseno. */
export function distanceKilometres(from: GeoPoint, to: GeoPoint): number {
  const latitudeDelta = toRadians(to.latitude - from.latitude);
  const longitudeDelta = toRadians(to.longitude - from.longitude);
  const fromLatitude = toRadians(from.latitude);
  const toLatitude = toRadians(to.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(fromLatitude) * Math.cos(toLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKilometres * Math.asin(Math.min(1, Math.sqrt(haversine)));
}

/**
 * Elige la estacion observada mas cercana.
 *
 * Solo compara estaciones que publicaron una observacion; nunca rellena el
 * hueco de una estacion sin dato con otra.
 */
export function nearestObservation(
  observations: readonly OfficialWeatherObservation[],
  location: GeoPoint,
): OfficialWeatherObservation | null {
  let nearest: OfficialWeatherObservation | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const observation of observations) {
    const distance = distanceKilometres(location, observation.location);

    if (distance < nearestDistance) {
      nearest = observation;
      nearestDistance = distance;
    }
  }

  return nearest;
}
