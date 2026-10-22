import { describe, expect, it } from "vitest";
import { buildRiverCatalogue } from "@/application/catalog/buildRiverCatalogue";
import { unknownReachId, unknownRiverId } from "@/domain/catalog/types";
import { createReach, createRiver, createStation } from "../../support/factories";

describe("buildRiverCatalogue", () => {
  it("agrupa por rio y tramo, ordena y cuenta estaciones", () => {
    const catalogue = buildRiverCatalogue([
      createStation({
        id: "30",
        name: "Santa Fe",
        river: createRiver({ id: "parana", name: "Parana" }),
        reach: createReach({ id: "parana-medio", name: "Parana medio", riverId: "parana" }),
      }),
      createStation({
        id: "34",
        name: "Rosario",
        river: createRiver({ id: "parana", name: "Parana" }),
        reach: createReach({
          id: "parana-inferior",
          name: "Parana inferior",
          riverId: "parana",
        }),
      }),
      createStation({
        id: "29",
        name: "Parana",
        river: createRiver({ id: "parana", name: "Parana" }),
        reach: createReach({ id: "parana-medio", name: "Parana medio", riverId: "parana" }),
      }),
      createStation({
        id: "19",
        name: "Corrientes",
        river: createRiver({ id: "paraguay", name: "Paraguay" }),
        reach: createReach({ id: "paraguay-general", name: "Paraguay", riverId: "paraguay" }),
      }),
    ]);

    expect(catalogue.rivers.map((river) => river.river.name)).toEqual(["Paraguay", "Parana"]);
    expect(catalogue.rivers[1]?.stationCount).toBe(3);
    expect(catalogue.rivers[1]?.reaches.map((reach) => reach.reach.name)).toEqual([
      "Parana inferior",
      "Parana medio",
    ]);
    expect(catalogue.rivers[1]?.reaches[1]?.stations.map((station) => station.id)).toEqual([
      "29",
      "30",
    ]);
    expect(catalogue.stationsWithoutRiver).toEqual([]);
  });

  it("separa las estaciones sin rio informado y las ordena", () => {
    const catalogue = buildRiverCatalogue([
      createStation({
        id: "2",
        name: "Zeta",
        river: createRiver({ id: unknownRiverId, name: "Sin rio informado" }),
        reach: createReach({
          id: unknownReachId,
          name: "Tramo no informado",
          riverId: unknownRiverId,
        }),
      }),
      createStation({
        id: "1",
        name: "Alfa",
        river: createRiver({ id: unknownRiverId, name: "Sin rio informado" }),
        reach: createReach({
          id: unknownReachId,
          name: "Tramo no informado",
          riverId: unknownRiverId,
        }),
      }),
    ]);

    expect(catalogue.rivers).toEqual([]);
    expect(catalogue.stationsWithoutRiver.map((station) => station.id)).toEqual(["1", "2"]);
  });

  it("agrupa varias estaciones del mismo tramo", () => {
    const catalogue = buildRiverCatalogue([
      createStation({ id: "34", name: "Rosario" }),
      createStation({ id: "35", name: "Villa Constitucion" }),
    ]);

    expect(catalogue.rivers).toHaveLength(1);
    expect(catalogue.rivers[0]?.reaches).toHaveLength(1);
    expect(catalogue.rivers[0]?.reaches[0]?.stations.map((station) => station.id)).toEqual([
      "34",
      "35",
    ]);
  });
});
