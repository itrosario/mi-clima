import { describe, expect, it, vi } from "vitest";
import {
  loadCorridorPrefecturaSnapshot,
  normalizePortName,
} from "@/application/prefectura/loadCorridorPrefecturaSnapshot";
import type { PrefecturaSource } from "@/domain/ports/prefecturaSource";
import type { PrefecturaSnapshot } from "@/domain/prefectura/types";
import { createStation } from "../../support/factories";
import { createPrefecturaSnapshot } from "../../support/prefecturaFixtures";

function createSource(snapshot: PrefecturaSnapshot): PrefecturaSource {
  return { fetchSnapshot: vi.fn(async () => snapshot) };
}

describe("normalizePortName", () => {
  it("ignora acentos, mayusculas y espacios repetidos", () => {
    expect(normalizePortName("  Villa   Constitución ")).toBe("VILLA CONSTITUCION");
    expect(normalizePortName("PARANA")).toBe("PARANA");
  });
});

describe("loadCorridorPrefecturaSnapshot", () => {
  it("empareja puertos y estaciones del corredor, y descarta el resto", async () => {
    const stations = [
      createStation({ id: "29", name: "Paraná" }),
      createStation({ id: "34", name: "Rosario" }),
    ];
    const view = await loadCorridorPrefecturaSnapshot(stations, {
      source: createSource(createPrefecturaSnapshot()),
    });

    expect(view.sourceName).toBe("Prefectura Naval Argentina");
    expect(view.fetchedAt).toEqual(new Date("2026-10-22T12:00:00.000Z"));
    expect(view.readings).toHaveLength(1);
    expect(view.readings[0]?.station.id).toBe("34");
    expect(view.readings[0]?.reading.portName).toBe("ROSARIO");
  });

  it("devuelve una vista vacia cuando ningun puerto coincide", async () => {
    const view = await loadCorridorPrefecturaSnapshot([], {
      source: createSource(createPrefecturaSnapshot()),
    });

    expect(view.readings).toEqual([]);
  });
});
