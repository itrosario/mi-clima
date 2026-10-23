import { describe, expect, it, vi } from "vitest";
import type { HttpPort } from "@/domain/ports/http";
import {
  PrefecturaApiError,
  PrefecturaApiSource,
  parsePrefecturaSnapshotPayload,
} from "@/infrastructure/prefectura/prefecturaApiSource";

const payload = JSON.stringify({
  fetchedAt: "2026-10-22T16:00:00.000Z",
  sourceName: "Prefectura Naval Argentina",
  readings: [
    {
      portId: 280,
      portName: "ROSARIO",
      riverName: "PARANA",
      levelMetres: 3.57,
      variationMetres: 0.03,
      periodHours: 12,
      observedAt: "2026-10-22T15:00:00.000Z",
      trend: "rising",
      alertLevelMetres: 5,
      evacuationLevelMetres: 5.3,
      previousLevelMetres: 3.54,
      previousObservedAt: null,
    },
  ],
});

function createHttp(status: number, body: string): HttpPort {
  return { send: vi.fn(async () => ({ status, headers: {}, body })) };
}

describe("parsePrefecturaSnapshotPayload", () => {
  it("traduce las fechas ISO y conserva los valores", () => {
    const snapshot = parsePrefecturaSnapshotPayload(payload);
    const reading = snapshot.readings[0];

    expect(snapshot.fetchedAt.toISOString()).toBe("2026-10-22T16:00:00.000Z");
    expect(snapshot.sourceName).toBe("Prefectura Naval Argentina");
    expect(reading?.observedAt?.toISOString()).toBe("2026-10-22T15:00:00.000Z");
    expect(reading?.previousObservedAt).toBeNull();
    expect(reading?.trend).toBe("rising");
    expect(reading?.alertLevelMetres).toBe(5);
  });
});

describe("PrefecturaApiSource", () => {
  it("consulta el proxy y devuelve el snapshot", async () => {
    const http = createHttp(200, payload);
    const source = new PrefecturaApiSource(http);

    const snapshot = await source.fetchSnapshot();

    expect(snapshot.readings).toHaveLength(1);
    expect(http.send).toHaveBeenCalledWith(
      {
        url: "/api/prefectura",
        method: "GET",
        headers: { accept: "application/json" },
      },
      undefined,
    );
  });

  it("propaga el estado cuando el proxy falla", async () => {
    const source = new PrefecturaApiSource(createHttp(502, "{}"));

    await expect(source.fetchSnapshot()).rejects.toBeInstanceOf(PrefecturaApiError);
    await expect(source.fetchSnapshot()).rejects.toMatchObject({ status: 502 });
  });
});
