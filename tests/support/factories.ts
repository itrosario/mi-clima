import type { Reach, River, Station, Thresholds } from "@/domain/catalog/types";
import type { TelemetryPoint } from "@/domain/telemetry/types";

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
