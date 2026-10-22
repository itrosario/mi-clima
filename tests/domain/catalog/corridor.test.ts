import { describe, expect, it } from "vitest";
import {
  homeStationId,
  paranaCorridorStationIds,
  paranaCorridorStations,
  selectCorridorStations,
} from "@/domain/catalog/corridor";
import { createStation } from "../../support/factories";

describe("corredor del Parana", () => {
  it("ordena las estaciones de aguas arriba hacia aguas abajo", () => {
    expect(paranaCorridorStationIds).toEqual(["19", "29", "30", "33", "34", "35"]);
  });

  it("identifica a Rosario como estacion de referencia", () => {
    expect(homeStationId).toBe("34");
  });

  it("publica una etiqueta legible por estacion", () => {
    expect(paranaCorridorStations.map((station) => station.label)).toEqual([
      "Corrientes",
      "Parana",
      "Santa Fe",
      "San Lorenzo",
      "Rosario",
      "Villa Constitucion",
    ]);
  });
});

describe("selectCorridorStations", () => {
  it("respeta el orden del corredor y descarta las estaciones ausentes", () => {
    const stations = ["35", "34", "19", "30"].map((id) => createStation({ id }));

    expect(selectCorridorStations(stations).map((station) => station.id)).toEqual([
      "19",
      "30",
      "34",
      "35",
    ]);
  });

  it("devuelve una lista vacia cuando el origen no publica ninguna estacion del corredor", () => {
    expect(selectCorridorStations([createStation({ id: "999" })])).toEqual([]);
  });

  it("acepta un corredor alternativo", () => {
    const stations = [createStation({ id: "a" }), createStation({ id: "b" })];

    expect(
      selectCorridorStations(stations, [
        { id: "b", label: "B" },
        { id: "a", label: "A" },
      ]).map((station) => station.id),
    ).toEqual(["b", "a"]);
  });
});
