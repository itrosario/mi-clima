import type { Reach, River, Station, Thresholds } from "@/domain/catalog/types";
import type { TelemetryPoint } from "@/domain/telemetry/types";
import type { WeatherForecastDay, WeatherObservation } from "@/domain/weather/types";

export function createRiver(overrides: Partial<River> = {}): River {
  return { id: "parana", name: "Parana", aliases: [], ...overrides };
}

export function createReach(overrides: Partial<Reach> = {}): Reach {
  return { id: "parana-medio", name: "Parana medio", riverId: "parana", ...overrides };
}

export function createThresholds(overrides: Partial<Thresholds> = {}): Thresholds {
  return { lowWater: 1.64, alert: 5, evacuation: 5.25, ...overrides };
}

export function createStation(overrides: Partial<Station> = {}): Station {
  return {
    id: "34",
    name: "Rosario",
    river: createRiver(),
    reach: createReach(),
    networkId: 10,
    networkName: "Escalas Prefectura Nacional",
    location: { latitude: -32.95, longitude: -60.63 },
    thresholds: createThresholds(),
    variableIds: [2],
    updatedAt: null,
    ...overrides,
  };
}

export function createPoint(timestamp: string, value: number): TelemetryPoint {
  return { timestamp: new Date(timestamp), value };
}

export function createObservation(overrides: Partial<WeatherObservation> = {}): WeatherObservation {
  return {
    timestamp: new Date("2026-10-22T12:00:00.000Z"),
    temperatureCelsius: 21.4,
    apparentTemperatureCelsius: 20.8,
    relativeHumidityPercent: 68,
    precipitationMillimetres: 0,
    windSpeedKilometresPerHour: 14,
    windDirectionDegrees: 180,
    pressureHectopascals: 1012,
    cloudCoverPercent: 20,
    condition: "partly-cloudy",
    isForecast: false,
    ...overrides,
  };
}

export function createForecastDay(overrides: Partial<WeatherForecastDay> = {}): WeatherForecastDay {
  return {
    date: new Date("2026-10-23T03:00:00.000Z"),
    minimumTemperatureCelsius: 14.2,
    maximumTemperatureCelsius: 23.6,
    precipitationMillimetres: 1.4,
    precipitationProbabilityPercent: 35,
    maximumWindSpeedKilometresPerHour: 26,
    condition: "rain",
    ...overrides,
  };
}
