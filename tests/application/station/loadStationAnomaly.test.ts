import { describe, expect, it } from "vitest";
import {
  loadPercentileTable,
  loadStationAnomaly,
  percentileCacheKey,
  percentileCacheSeconds,
} from "@/application/station/loadStationAnomaly";
import { dayOfYear } from "@/domain/analytics/anomaly";
import { FakeCache, FakePercentilesSource } from "../../support/applicationFakes";

const observedAt = new Date("2026-10-22T03:00:00.000Z");

const table = {
  stationId: "34",
  variableId: 2,
  profiles: [
    {
      dayOfYear: dayOfYear(observedAt),
      percentiles: [
        { percentile: 10, value: 1 },
        { percentile: 50, value: 3 },
        { percentile: 90, value: 5 },
      ],
    },
  ],
};

describe("percentileCacheKey", () => {
  it("incluye estacion y variable", () => {
    expect(percentileCacheKey("34", 2)).toBe("percentiles:34:2");
  });
});

describe("loadPercentileTable", () => {
  it("consulta la fuente y guarda la tabla en cache", async () => {
    const cache = new FakeCache();
    const source = new FakePercentilesSource({ "34": table });
    const controller = new AbortController();

    const loaded = await loadPercentileTable(
      "34",
      2,
      { cache, percentilesSource: source },
      controller.signal,
    );

    expect(loaded).toBe(table);
    expect(source.calls[0]?.request).toEqual({ stationId: "34", variableId: 2 });
    expect(source.calls[0]?.signal).toBe(controller.signal);
    expect(cache.writes[0]).toMatchObject({
      key: "percentiles:34:2",
      ttlSeconds: percentileCacheSeconds,
    });
  });

  it("reutiliza la tabla guardada sin consultar la fuente", async () => {
    const cache = new FakeCache();
    cache.entries.set("percentiles:34:2", table);
    const source = new FakePercentilesSource({ "34": table });

    const loaded = await loadPercentileTable("34", 2, { cache, percentilesSource: source });

    expect(loaded).toBe(table);
    expect(source.calls).toEqual([]);
  });

  it("devuelve null cuando la serie no publica percentiles", async () => {
    const cache = new FakeCache();
    const source = new FakePercentilesSource({ "34": null });

    await expect(
      loadPercentileTable("34", 2, { cache, percentilesSource: source }),
    ).resolves.toBeNull();
    expect(cache.writes).toEqual([]);
  });
});

describe("loadStationAnomaly", () => {
  it("compara el valor observado con el perfil del dia", async () => {
    const cache = new FakeCache();
    const source = new FakePercentilesSource({ "34": table });

    const result = await loadStationAnomaly(
      { stationId: "34", variableId: 2, observedValue: 4, observedAt },
      { cache, percentilesSource: source },
    );

    expect(result?.profile?.dayOfYear).toBe(dayOfYear(observedAt));
    expect(result?.anomaly).toMatchObject({
      observed: 4,
      expected: 3,
      absolute: 1,
      percentileRank: 70,
      band: "above-normal",
    });
  });

  it("devuelve null cuando no hay referencia historica", async () => {
    const cache = new FakeCache();
    const source = new FakePercentilesSource({ "34": null });

    await expect(
      loadStationAnomaly(
        { stationId: "34", variableId: 2, observedValue: 4, observedAt },
        { cache, percentilesSource: source },
      ),
    ).resolves.toBeNull();
  });

  it("informa la anomalia como desconocida cuando la tabla esta vacia", async () => {
    const cache = new FakeCache();
    const source = new FakePercentilesSource({
      "34": { stationId: "34", variableId: 2, profiles: [] },
    });

    const result = await loadStationAnomaly(
      { stationId: "34", variableId: 2, observedValue: 4, observedAt },
      { cache, percentilesSource: source },
    );

    expect(result?.profile).toBeNull();
    expect(result?.anomaly.band).toBe("unknown");
    expect(result?.anomaly.expected).toBeNull();
  });
});
