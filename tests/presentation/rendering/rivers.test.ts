/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { getTranslations } from "@/presentation/i18n";
import {
  createRiverSections,
  filterStationsByName,
  groupStationsByRiver,
} from "@/presentation/rendering/rivers";
import { createReach, createRiver, createStation } from "../../support/factories";

const translations = getTranslations("es");

function createStations() {
  return [
    createStation({
      id: "1",
      name: "Rosario",
      river: createRiver({ id: "parana", name: "Parana" }),
    }),
    createStation({
      id: "2",
      name: "Santa Fe",
      river: createRiver({ id: "parana", name: "Parana" }),
      reach: createReach({ id: "parana-medio", name: "Parana medio" }),
    }),
    createStation({
      id: "3",
      name: "Corrientes",
      river: createRiver({ id: "parana", name: "Parana" }),
      reach: createReach({ id: "parana-alto", name: "Parana alto" }),
    }),
    createStation({
      id: "4",
      name: "Concordia",
      river: createRiver({ id: "uruguay", name: "Uruguay" }),
      reach: createReach({ id: "uruguay-medio", name: "Uruguay medio", riverId: "uruguay" }),
    }),
  ];
}

describe("groupStationsByRiver", () => {
  it("agrupa por rio y por tramo conservando el orden", () => {
    const groups = groupStationsByRiver(createStations());

    expect(groups).toHaveLength(2);
    expect(groups[0]?.river.id).toBe("parana");
    expect(groups[0]?.stationCount).toBe(3);
    expect(groups[0]?.reaches).toHaveLength(2);
    expect(groups[0]?.reaches[0]?.stations).toHaveLength(2);
    expect(groups[1]?.river.id).toBe("uruguay");
  });

  it("devuelve una lista vacia sin estaciones", () => {
    expect(groupStationsByRiver([])).toEqual([]);
  });
});

describe("filterStationsByName", () => {
  it("filtra sin distinguir acentos ni mayusculas", () => {
    const filtered = filterStationsByName(createStations(), "PARANA MEDIO");

    expect(filtered.map((station) => station.id)).toEqual(["1", "2"]);
  });

  it("devuelve todas cuando la busqueda esta vacia", () => {
    expect(filterStationsByName(createStations(), "   ")).toHaveLength(4);
  });
});

describe("createRiverSections", () => {
  it("arma un bloque por rio con enlaces por estacion", () => {
    const sections = createRiverSections(
      document,
      groupStationsByRiver(createStations()),
      "es",
      translations,
    );

    expect(sections).toHaveLength(2);
    expect(sections[0]?.querySelector(".river-group__title")?.textContent).toBe(
      "Parana · 3 estaciones",
    );
    expect(sections[0]?.querySelectorAll("a")[0]?.getAttribute("href")).toBe(
      "/es/estaciones/?id=1",
    );
  });

  it("explica cuando el filtro no encuentra nada", () => {
    const sections = createRiverSections(document, [], "es", translations);

    expect(sections[0]?.textContent).toBe("Ningun rio coincide con la busqueda.");
  });

  it("usa el singular para un solo rio con una estacion", () => {
    const sections = createRiverSections(
      document,
      groupStationsByRiver([createStations()[3] as ReturnType<typeof createStation>]),
      "en",
      getTranslations("en"),
    );

    expect(sections[0]?.querySelector(".river-group__title")?.textContent).toBe(
      "Uruguay · 1 station",
    );
  });
});
