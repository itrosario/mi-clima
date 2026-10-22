import { describe, expect, it } from "vitest";
import { createStationCatalog, normalizeSearchText } from "@/domain/catalog/stationCatalog";
import { createReach, createRiver, createStation } from "../../support/factories";

const rosario = createStation({ id: "34", name: "Rosario" });
const sanLorenzo = createStation({
  id: "33",
  name: "San Lorenzo",
  networkId: 6,
  networkName: "Red INTA",
});
const santaFe = createStation({
  id: "30",
  name: "Santa Fe",
  reach: createReach({ id: "parana-medio", name: "Parana medio" }),
  networkId: 5,
  networkName: "SSRH",
});
const corrientes = createStation({
  id: "19",
  name: "Corrientes",
  river: createRiver({ id: "parana", name: "Parana" }),
  reach: createReach({ id: "parana-superior", name: "Parana superior" }),
});
const concordia = createStation({
  id: "71",
  name: "Concordia",
  river: createRiver({ id: "uruguay", name: "Uruguay", aliases: ["URUGUAY"] }),
  reach: createReach({ id: "uruguay", name: "Uruguay", riverId: "uruguay" }),
});

const allStations = [rosario, sanLorenzo, santaFe, corrientes, concordia];

describe("normalizeSearchText", () => {
  it("quita acentos, mayusculas y espacios sobrantes", () => {
    expect(normalizeSearchText("  Paraná MEDIO ")).toBe("parana medio");
  });
});

describe("createStationCatalog", () => {
  it("ordena las estaciones por nombre sin importar el orden de entrada", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.stations.map((station) => station.name)).toEqual([
      "Concordia",
      "Corrientes",
      "Rosario",
      "San Lorenzo",
      "Santa Fe",
    ]);
  });

  it("agrupa rios y tramos con su cantidad de estaciones", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.rivers.map((river) => river.name)).toEqual(["Parana", "Uruguay"]);
    const parana = catalog.rivers[0];
    expect(parana?.stationCount).toBe(4);
    expect(parana?.reaches.map((reach) => reach.name)).toEqual(["Parana medio", "Parana superior"]);
    expect(parana?.reaches.map((reach) => reach.stationCount)).toEqual([3, 1]);
  });

  it("busca por identificador", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.findById("34")?.name).toBe("Rosario");
    expect(catalog.findById("999")).toBeNull();
  });

  it("filtra por rio", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.filter({ riverId: "uruguay" }).map((station) => station.id)).toEqual(["71"]);
  });

  it("filtra por tramo", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.filter({ reachId: "parana-superior" }).map((station) => station.id)).toEqual([
      "19",
    ]);
  });

  it("filtra por red de medicion", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.filter({ networkId: 6 }).map((station) => station.id)).toEqual(["33"]);
  });

  it("busca sin distinguir acentos ni mayusculas", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.filter({ searchTerm: "SANTA" }).map((station) => station.id)).toEqual(["30"]);
    expect(catalog.filter({ searchTerm: "paraná superior" }).map((station) => station.id)).toEqual([
      "19",
    ]);
    expect(catalog.filter({ searchTerm: "prefectura" }).map((station) => station.id)).toEqual([
      "71",
      "19",
      "34",
    ]);
  });

  it("devuelve todas las estaciones cuando el termino esta vacio", () => {
    const catalog = createStationCatalog(allStations);

    expect(catalog.filter({}).length).toBe(5);
    expect(catalog.filter({ searchTerm: "   " }).length).toBe(5);
  });

  it("combina criterios de filtro", () => {
    const catalog = createStationCatalog(allStations);

    expect(
      catalog
        .filter({ riverId: "parana", reachId: "parana-medio", searchTerm: "rosario" })
        .map((station) => station.id),
    ).toEqual(["34"]);
  });
});
