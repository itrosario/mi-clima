import type { GeoPoint } from "@/domain/catalog/types";
import type { OfficialWeatherObservation } from "@/domain/weather/official";

/** Construye una linea del listado de estaciones con las columnas del SMN. */
export function smnStationLine(
  name: string,
  province: string,
  latitudeDegrees: string,
  latitudeMinutes: string,
  longitudeDegrees: string,
  longitudeMinutes: string,
): string {
  return (
    name.padEnd(31) +
    province.padEnd(37) +
    latitudeDegrees.padStart(4) +
    latitudeMinutes.padStart(7) +
    " ".repeat(6) +
    longitudeDegrees.padStart(4) +
    longitudeMinutes.padStart(8) +
    "25".padStart(13)
  );
}

export const smnStationsText = [
  "NOMBRE                         PROVINCIA                              LATITUD          LONGITUD       ALTURA  NRO   NroOACI",
  "                                                                    [gr]    [min]    [gr]    [min]       [m]",
  smnStationLine("ROSARIO AERO", "SANTA FE", "-32", "54", "-60", "46"),
  smnStationLine("CORDOBA AERO", "CORDOBA", "-31", "19", "-64", "12"),
].join("\r\n");

export const smnObservationsText = [
  "ROSARIO AERO;23-octubre-2026;16:00;Parcialmente nublado;15 km;16.1;No se calcula; 79;Sur  16;993.6 / ",
  "CORDOBA AERO;23-octubre-2026;15:00;Cubierto;10 km;14,5;13,8; 81;Sudoeste  9;1000.9 / ",
].join("\r\n");

export function createOfficialObservation(
  overrides: Partial<OfficialWeatherObservation> = {},
): OfficialWeatherObservation {
  return {
    stationName: "ROSARIO AERO",
    province: "SANTA FE",
    location: { latitude: -32.9, longitude: -60.77 },
    observedAt: new Date("2026-10-23T19:00:00.000Z"),
    condition: "Parcialmente nublado",
    visibilityKilometres: 15,
    temperatureCelsius: 16.1,
    apparentTemperatureCelsius: null,
    relativeHumidityPercent: 79,
    windDirectionText: "Sur",
    windSpeedKilometresPerHour: 16,
    pressureHectopascals: 993.6,
    ...overrides,
  };
}

export function createOfficialSnapshot(
  observations: readonly OfficialWeatherObservation[] = [createOfficialObservation()],
): { readonly source: string; readonly observations: readonly OfficialWeatherObservation[] } {
  return { source: "SMN - Servicio Meteorologico Nacional", observations };
}

export const rosarioCoordinates: GeoPoint = { latitude: -32.9468, longitude: -60.6393 };
