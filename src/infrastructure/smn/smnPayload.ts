/**
 * Normalizacion de los datos abiertos del SMN.
 *
 * El SMN publica dos archivos de texto de ancho fijo y campos separados por
 * punto y coma. Se leen con posiciones explicitas y se convierten al modelo
 * del dominio sin completar ningun valor: lo que la fuente no informa queda
 * como `null`.
 *
 * Los textos llegan en Windows-1252 y las horas en hora oficial argentina
 * (UTC-3, sin horario de verano).
 */

import type { GeoPoint } from "@/domain/catalog/types";
import {
  type OfficialWeatherObservation,
  type OfficialWeatherSnapshot,
  smnSourceName,
} from "@/domain/weather/official";
import { isRecord, toFiniteNumber, toNonEmptyText } from "../parsing/jsonValues";

const stationColumns = {
  name: [0, 31],
  province: [31, 68],
  latitudeDegrees: [68, 72],
  latitudeMinutes: [72, 79],
  longitudeDegrees: [85, 89],
  longitudeMinutes: [89, 97],
} as const;

const monthNames = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
] as const;

const argentinaOffsetMilliseconds = 3 * 60 * 60 * 1000;

export interface SmnStation {
  readonly name: string;
  readonly province: string;
  readonly location: GeoPoint;
}

export interface SmnRawObservation {
  readonly stationName: string;
  readonly observedAt: Date;
  readonly condition: string | null;
  readonly visibilityKilometres: number | null;
  readonly temperatureCelsius: number | null;
  readonly apparentTemperatureCelsius: number | null;
  readonly relativeHumidityPercent: number | null;
  readonly windDirectionText: string | null;
  readonly windSpeedKilometresPerHour: number | null;
  readonly pressureHectopascals: number | null;
}

function sliceColumn(line: string, [start, end]: readonly [number, number]): string {
  return line.slice(start, end).trim();
}

function normalizeStationName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toUpperCase();
}

function toDecimalDegrees(degreesText: string, minutesText: string): number | null {
  const degrees = Number(degreesText);
  const minutes = Number(minutesText);

  if (!Number.isFinite(degrees) || !Number.isFinite(minutes) || minutes < 0 || minutes >= 60) {
    return null;
  }

  const sign = degrees < 0 ? -1 : 1;

  return sign * (Math.abs(degrees) + minutes / 60);
}

/** Convierte una linea del listado de estaciones; `null` si esta incompleta. */
function parseStationLine(line: string): SmnStation | null {
  if (line.length < 97) {
    return null;
  }

  const name = sliceColumn(line, stationColumns.name);
  const province = sliceColumn(line, stationColumns.province);
  const latitude = toDecimalDegrees(
    sliceColumn(line, stationColumns.latitudeDegrees),
    sliceColumn(line, stationColumns.latitudeMinutes),
  );
  const longitude = toDecimalDegrees(
    sliceColumn(line, stationColumns.longitudeDegrees),
    sliceColumn(line, stationColumns.longitudeMinutes),
  );

  if (name.length === 0 || province.length === 0 || latitude === null || longitude === null) {
    return null;
  }

  return { name, province, location: { latitude, longitude } };
}

/** Lee el listado de estaciones y lo indexa por nombre normalizado. */
export function parseSmnStations(text: string): ReadonlyMap<string, SmnStation> {
  const stations = new Map<string, SmnStation>();

  for (const line of text.split(/\r?\n/).slice(2)) {
    const station = parseStationLine(line);

    if (station !== null) {
      stations.set(normalizeStationName(station.name), station);
    }
  }

  return stations;
}

function parsePublishedNumber(candidate: string | undefined): number | null {
  const match = candidate?.trim().match(/^-?\d+(?:[.,]\d+)?/);

  if (match === null || match === undefined) {
    return null;
  }

  const value = Number((match[0] ?? "").replace(",", "."));

  return Number.isFinite(value) ? value : null;
}

function parseWind(candidate: string | undefined): {
  readonly directionText: string | null;
  readonly speedKilometresPerHour: number | null;
} {
  const text = candidate?.trim() ?? "";
  const match = text.match(/^(.*?)\s+(-?\d+(?:[.,]\d+)?)$/);

  if (match === null) {
    return { directionText: toNonEmptyText(text), speedKilometresPerHour: null };
  }

  const direction = toNonEmptyText(match[1] ?? "");
  const speed = Number((match[2] ?? "").replace(",", "."));

  return {
    directionText: direction,
    speedKilometresPerHour: Number.isFinite(speed) ? speed : null,
  };
}

/** Interpreta una fecha y hora del SMN como hora oficial argentina. */
export function parseSmnDateTime(dateText: string, timeText: string): Date | null {
  const dateMatch = dateText.trim().match(/^(\d{1,2})-([a-z]+)-(\d{4})$/i);
  const timeMatch = timeText.trim().match(/^(\d{1,2}):(\d{2})$/);

  if (dateMatch === null || timeMatch === null) {
    return null;
  }

  const day = Number(dateMatch[1]);
  const month = monthNames.indexOf(
    (dateMatch[2] ?? "").toLowerCase() as (typeof monthNames)[number],
  );
  const year = Number(dateMatch[3]);
  const hour = Number(timeMatch[1]);
  const minute = Number(timeMatch[2]);

  if (month < 0 || hour > 23 || minute > 59) {
    return null;
  }

  const local = Date.UTC(year, month, day, hour, minute);
  const probe = new Date(local);

  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month ||
    probe.getUTCDate() !== day ||
    probe.getUTCHours() !== hour ||
    probe.getUTCMinutes() !== minute
  ) {
    return null;
  }

  return new Date(local + argentinaOffsetMilliseconds);
}

/** Convierte una linea del estado del tiempo; `null` si no es interpretable. */
function parseObservationLine(line: string): SmnRawObservation | null {
  const parts = line.split(";");

  if (parts.length < 10) {
    return null;
  }

  const stationName = toNonEmptyText(parts[0]);
  const observedAt = parseSmnDateTime(parts[1] ?? "", parts[2] ?? "");

  if (stationName === null || observedAt === null) {
    return null;
  }

  const wind = parseWind(parts[8]);

  return {
    stationName,
    observedAt,
    condition: toNonEmptyText(parts[3]),
    visibilityKilometres: parsePublishedNumber(parts[4]),
    temperatureCelsius: parsePublishedNumber(parts[5]),
    apparentTemperatureCelsius: parsePublishedNumber(parts[6]),
    relativeHumidityPercent: parsePublishedNumber(parts[7]),
    windDirectionText: wind.directionText,
    windSpeedKilometresPerHour: wind.speedKilometresPerHour,
    pressureHectopascals: parsePublishedNumber(parts[9]),
  };
}

/** Lee el estado del tiempo presente de todas las estaciones publicadas. */
export function parseSmnObservations(text: string): readonly SmnRawObservation[] {
  const observations: SmnRawObservation[] = [];

  for (const line of text.split(/\r?\n/)) {
    const observation = parseObservationLine(line);

    if (observation !== null) {
      observations.push(observation);
    }
  }

  return observations;
}

/**
 * Cruza el listado de estaciones con el estado del tiempo.
 *
 * Una observacion sin estacion conocida se descarta: sin coordenadas no se
 * puede ubicar ni comparar, y no se inventa una posicion.
 */
export function buildSmnSnapshot(
  stationsText: string,
  observationsText: string,
): OfficialWeatherSnapshot {
  const stations = parseSmnStations(stationsText);
  const observations: OfficialWeatherObservation[] = [];

  for (const observation of parseSmnObservations(observationsText)) {
    const station = stations.get(normalizeStationName(observation.stationName));

    if (station !== undefined) {
      observations.push({
        stationName: station.name,
        province: station.province,
        location: station.location,
        observedAt: observation.observedAt,
        condition: observation.condition,
        visibilityKilometres: observation.visibilityKilometres,
        temperatureCelsius: observation.temperatureCelsius,
        apparentTemperatureCelsius: observation.apparentTemperatureCelsius,
        relativeHumidityPercent: observation.relativeHumidityPercent,
        windDirectionText: observation.windDirectionText,
        windSpeedKilometresPerHour: observation.windSpeedKilometresPerHour,
        pressureHectopascals: observation.pressureHectopascals,
      });
    }
  }

  return { source: smnSourceName, observations };
}

function readLocation(candidate: unknown): GeoPoint | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const latitude = toFiniteNumber(candidate.latitude);
  const longitude = toFiniteNumber(candidate.longitude);

  if (latitude === null || longitude === null) {
    return null;
  }

  return { latitude, longitude };
}

function readJsonObservation(candidate: unknown): OfficialWeatherObservation | null {
  if (!isRecord(candidate)) {
    return null;
  }

  const stationName = toNonEmptyText(candidate.stationName);
  const province = toNonEmptyText(candidate.province);
  const location = readLocation(candidate.location);
  const observedAtText = toNonEmptyText(candidate.observedAt);
  const observedAt = observedAtText === null ? null : new Date(observedAtText);

  if (
    stationName === null ||
    province === null ||
    location === null ||
    observedAt === null ||
    Number.isNaN(observedAt.getTime())
  ) {
    return null;
  }

  return {
    stationName,
    province,
    location,
    observedAt,
    condition: toNonEmptyText(candidate.condition),
    visibilityKilometres: toFiniteNumber(candidate.visibilityKilometres),
    temperatureCelsius: toFiniteNumber(candidate.temperatureCelsius),
    apparentTemperatureCelsius: toFiniteNumber(candidate.apparentTemperatureCelsius),
    relativeHumidityPercent: toFiniteNumber(candidate.relativeHumidityPercent),
    windDirectionText: toNonEmptyText(candidate.windDirectionText),
    windSpeedKilometresPerHour: toFiniteNumber(candidate.windSpeedKilometresPerHour),
    pressureHectopascals: toFiniteNumber(candidate.pressureHectopascals),
  };
}

/** Reconstruye la instantanea que el proxy entrega al navegador. */
export function parseSmnSnapshot(payload: unknown): OfficialWeatherSnapshot | null {
  if (!isRecord(payload) || !Array.isArray(payload.observations)) {
    return null;
  }

  const observations = payload.observations
    .map(readJsonObservation)
    .filter((observation): observation is OfficialWeatherObservation => observation !== null);

  return {
    source: toNonEmptyText(payload.source) ?? smnSourceName,
    observations,
  };
}
