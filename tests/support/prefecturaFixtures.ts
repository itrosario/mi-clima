/**
 * Alturas simuladas de Prefectura.
 *
 * Se comparten entre las pruebas de aplicacion y de presentacion para que el
 * contrato del proxy y el de las tarjetas no se desalineen.
 */

import { vi } from "vitest";
import type { PrefecturaSource } from "@/domain/ports/prefecturaSource";
import type { PrefecturaSnapshot } from "@/domain/prefectura/types";

const fixtureNow = new Date("2026-10-22T12:00:00.000Z");

export function createPrefecturaSnapshot(): PrefecturaSnapshot {
  return {
    fetchedAt: fixtureNow,
    sourceName: "Prefectura Naval Argentina",
    readings: [
      {
        portId: 280,
        portName: "ROSARIO",
        riverName: "PARANA",
        levelMetres: 3.57,
        variationMetres: 0.03,
        periodHours: 12,
        observedAt: new Date("2026-10-22T15:00:00.000Z"),
        trend: "rising",
        alertLevelMetres: 5,
        evacuationLevelMetres: 5.3,
        previousLevelMetres: 3.54,
        previousObservedAt: new Date("2026-10-22T03:00:00.000Z"),
      },
      {
        portId: 999,
        portName: "OTRO PUERTO",
        riverName: "PARANA",
        levelMetres: 2,
        variationMetres: 0,
        periodHours: 12,
        observedAt: null,
        trend: "unknown",
        alertLevelMetres: null,
        evacuationLevelMetres: null,
        previousLevelMetres: null,
        previousObservedAt: null,
      },
    ],
  };
}

export function createFakePrefecturaSource(
  snapshot: PrefecturaSnapshot = createPrefecturaSnapshot(),
): PrefecturaSource {
  return { fetchSnapshot: vi.fn(async () => snapshot) };
}
