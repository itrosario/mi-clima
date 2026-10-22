import { describe, expect, it } from "vitest";
import {
  formatInaTimestamp,
  parseInaObservation,
  parseInaPercentiles,
  parseInaStation,
  parseInaTimestamp,
  unitForVariable,
  unknownReachId,
  unknownRiverId,
} from "@/infrastructure/ina/inaPayloads";
import {
  firstObservationRow,
  meteorologicalStationRow,
  observationWithoutTimestampRow,
  observationWithoutValueRow,
  percentileRows,
  rosarioStationRow,
  secondObservationRow,
} from "../../support/inaFixtures";

describe("parseInaTimestamp", () => {
  it("interpreta la hora oficial argentina cuando no declara zona", () => {
    const parsed = parseInaTimestamp("2026-10-22T00:00:00");

    expect(parsed?.toISOString()).toBe("2026-10-22T03:00:00.000Z");
  });

  it("respeta la zona cuando el origen la declara", () => {
    const parsed = parseInaTimestamp("2026-10-22T00:00:00Z");

    expect(parsed?.toISOString()).toBe("2026-10-22T00:00:00.000Z");
  });

  it("descarta valores ausentes o invalidos", () => {
    expect(parseInaTimestamp(null)).toBeNull();
    expect(parseInaTimestamp(34)).toBeNull();
    expect(parseInaTimestamp("   ")).toBeNull();
    expect(parseInaTimestamp("no es una fecha")).toBeNull();
  });
});

describe("formatInaTimestamp", () => {
  it("expresa la fecha en hora oficial argentina sin sufijo", () => {
    expect(formatInaTimestamp(new Date("2026-10-22T03:00:00.000Z"))).toBe("2026-10-22T00:00:00");
  });
});

describe("unitForVariable", () => {
  it("devuelve la unidad de las variables conocidas", () => {
    expect(unitForVariable(2)).toBe("m");
    expect(unitForVariable(4)).toBe("m³/s");
    expect(unitForVariable(1)).toBe("mm");
  });

  it("deja la unidad vacia cuando no la conoce", () => {
    expect(unitForVariable(99)).toBe("");
  });
});

describe("parseInaStation", () => {
  it("traduce una estacion hidrometrica completa", () => {
    const station = parseInaStation(rosarioStationRow);

    expect(station).toMatchObject({
      id: "34",
      name: "Rosario",
      river: { id: "parana", name: "Parana", aliases: ["PARANAINF"] },
      reach: { id: "parana-inferior", name: "Parana inferior", riverId: "parana" },
      networkId: 10,
      networkName: "escalas Prefectura Nacional",
      location: { latitude: -32.9432699442268, longitude: -60.6308206029857 },
      thresholds: { lowWater: 1.64, alert: 5, evacuation: 5.25 },
      variableIds: [2],
      updatedAt: null,
    });
  });

  it("completa los datos que el organismo no informa", () => {
    const station = parseInaStation(meteorologicalStationRow);

    expect(station).toMatchObject({
      id: "1722",
      networkId: 0,
      networkName: "Red no informada",
      river: { id: unknownRiverId, name: "Sin rio informado", aliases: [] },
      reach: { id: unknownReachId, name: "Tramo no informado", riverId: unknownRiverId },
      thresholds: { lowWater: null, alert: null, evacuation: null },
      variableIds: [],
    });
  });

  it("descarta una fila sin codigo de estacion", () => {
    expect(parseInaStation({ nombre: "Sin codigo" })).toBeNull();
  });

  it("usa el codigo como nombre cuando falta el nombre", () => {
    expect(parseInaStation({ sitecode: 7 })?.name).toBe("7");
  });

  it("deja la ubicacion en null cuando falta alguna coordenada", () => {
    expect(parseInaStation({ sitecode: 7, lat: -32.9 })?.location).toBeNull();
  });

  it("reconoce las variables declaradas por el organismo", () => {
    expect(parseInaStation({ sitecode: 1, var: "P" })?.variableIds).toEqual([1]);
    expect(parseInaStation({ sitecode: 2, var: null, tipo: "H" })?.variableIds).toEqual([2]);
    expect(parseInaStation({ sitecode: 3, var: null, tipo: "M" })?.variableIds).toEqual([]);
  });

  it("interpreta umbrales publicados como cadenas", () => {
    const station = parseInaStation({
      sitecode: 4,
      nivel_de_aguas_bajas: "1.5",
      nivel_de_alerta: "4.8",
      nivel_de_evacuacion: null,
    });

    expect(station?.thresholds).toEqual({ lowWater: 1.5, alert: 4.8, evacuation: null });
  });

  it("trata como no informado un rio sin letras ni numeros", () => {
    const station = parseInaStation({ sitecode: 5, rio: "***" });

    expect(station?.river.id).toBe(unknownRiverId);
    expect(station?.reach.id).toBe(unknownReachId);
  });
});

describe("parseInaObservation", () => {
  it("traduce una observacion valida", () => {
    const point = parseInaObservation(firstObservationRow);

    expect(point?.timestamp.toISOString()).toBe("2026-10-20T03:00:00.000Z");
    expect(point?.value).toBe(4.1);
  });

  it("interpreta valores publicados como cadena", () => {
    expect(parseInaObservation(secondObservationRow)?.value).toBe(4.25);
  });

  it("descarta observaciones sin instante o sin valor", () => {
    expect(parseInaObservation(observationWithoutTimestampRow)).toBeNull();
    expect(parseInaObservation(observationWithoutValueRow)).toBeNull();
  });
});

describe("parseInaPercentiles", () => {
  it("agrupa la tabla por dia del ano y ordena los percentiles", () => {
    const table = parseInaPercentiles(percentileRows, "34", 2);

    expect(table?.stationId).toBe("34");
    expect(table?.variableId).toBe(2);
    expect(table?.profiles.map((profile) => profile.dayOfYear)).toEqual([100, 295]);
    expect(table?.profiles[1]?.percentiles).toEqual([
      { percentile: 1, value: 1.1 },
      { percentile: 50, value: 3.2 },
      { percentile: 99, value: 6.4 },
    ]);
  });

  it("descarta las filas incompletas", () => {
    const table = parseInaPercentiles(percentileRows, "34", 2);

    expect(table?.profiles[0]?.percentiles).toEqual([{ percentile: 50, value: 2.7 }]);
  });

  it("devuelve null cuando no hay percentiles publicados", () => {
    expect(parseInaPercentiles([], "34", 2)).toBeNull();
  });
});
