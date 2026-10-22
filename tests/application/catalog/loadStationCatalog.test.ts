import { describe, expect, it } from "vitest";
import {
  loadStationCatalog,
  stationCatalogCacheKey,
  stationCatalogCacheSeconds,
} from "@/application/catalog/loadStationCatalog";
import { FakeCache, FakeClock, FakeStationCatalogSource } from "../../support/applicationFakes";
import { createStation } from "../../support/factories";

const now = new Date("2026-10-22T12:00:00.000Z");

function createDependencies(stations = [createStation()]) {
  const cache = new FakeCache();
  const source = new FakeStationCatalogSource(stations);
  const clock = new FakeClock(now);

  return { cache, source, clock, dependencies: { cache, source, clock } };
}

describe("loadStationCatalog", () => {
  it("consulta la fuente y guarda el catalogo con su vigencia", async () => {
    const { cache, source, dependencies } = createDependencies([
      createStation({ id: "35", name: "Zeta" }),
      createStation({ id: "34", name: "Alfa" }),
    ]);

    const snapshot = await loadStationCatalog(dependencies);

    expect(snapshot.fromCache).toBe(false);
    expect(snapshot.fetchedAt).toBe(now);
    expect(snapshot.catalog.stations.map((station) => station.name)).toEqual(["Alfa", "Zeta"]);
    expect(source.signals).toHaveLength(1);
    expect(cache.writes[0]).toMatchObject({
      key: stationCatalogCacheKey,
      ttlSeconds: stationCatalogCacheSeconds,
    });
    expect(cache.writes[0]?.value).toMatchObject({ fetchedAt: now.toISOString() });
  });

  it("reutiliza el catalogo guardado y rehidrata las fechas", async () => {
    const { cache, source, dependencies } = createDependencies();
    cache.entries.set(stationCatalogCacheKey, {
      fetchedAt: "2026-10-22T10:00:00.000Z",
      stations: [
        { ...createStation(), updatedAt: "2026-10-20T00:00:00.000Z" },
        createStation({ id: "35", updatedAt: null }),
      ],
    });

    const snapshot = await loadStationCatalog(dependencies);

    expect(snapshot.fromCache).toBe(true);
    expect(snapshot.fetchedAt.toISOString()).toBe("2026-10-22T10:00:00.000Z");
    expect(source.signals).toHaveLength(0);
    expect(snapshot.catalog.stations[0]?.updatedAt).toBeInstanceOf(Date);
    expect(snapshot.catalog.stations[1]?.updatedAt).toBeNull();
  });

  it("descarta una entrada con forma inesperada", async () => {
    const { cache, source, dependencies } = createDependencies();
    cache.entries.set(stationCatalogCacheKey, { fetchedAt: now.toISOString(), stations: "no" });

    const snapshot = await loadStationCatalog(dependencies);

    expect(snapshot.fromCache).toBe(false);
    expect(source.signals).toHaveLength(1);
  });

  it("descarta una entrada con fecha invalida", async () => {
    const { cache, source, dependencies } = createDependencies();
    cache.entries.set(stationCatalogCacheKey, { fetchedAt: "no es fecha", stations: [] });

    const snapshot = await loadStationCatalog(dependencies);

    expect(snapshot.fromCache).toBe(false);
    expect(source.signals).toHaveLength(1);
  });

  it("propaga la senal de cancelacion a la fuente", async () => {
    const { source, dependencies } = createDependencies();
    const controller = new AbortController();

    await loadStationCatalog(dependencies, controller.signal);

    expect(source.signals[0]).toBe(controller.signal);
  });
});
