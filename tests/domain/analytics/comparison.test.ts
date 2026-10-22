import { describe, expect, it } from "vitest";
import { compareStationReadings } from "@/domain/analytics/comparison";

const readings = [
  { stationId: "19", name: "Corrientes", value: 3.2 },
  { stationId: "30", name: "Santa Fe", value: 3.8 },
  { stationId: "34", name: "Rosario", value: 4.1 },
];

describe("compareStationReadings", () => {
  it("compara cada estacion contra la referencia y contra la anterior", () => {
    const comparison = compareStationReadings(readings, "34");

    expect(comparison.map((entry) => entry.stationId)).toEqual(["19", "30", "34"]);
    expect(comparison[0]?.differenceFromReference).toBeCloseTo(-0.9, 10);
    expect(comparison[1]?.differenceFromReference).toBeCloseTo(-0.3, 10);
    expect(comparison[2]?.differenceFromReference).toBe(0);
    expect(comparison[0]?.dropFromPrevious).toBeNull();
    expect(comparison[1]?.dropFromPrevious).toBeCloseTo(-0.6, 10);
    expect(comparison[2]?.dropFromPrevious).toBeCloseTo(-0.3, 10);
  });

  it("deja la diferencia en null cuando la referencia no esta en la lista", () => {
    const comparison = compareStationReadings(readings, "999");

    expect(comparison.every((entry) => entry.differenceFromReference === null)).toBe(true);
  });

  it("devuelve una lista vacia sin lecturas", () => {
    expect(compareStationReadings([], "34")).toEqual([]);
  });

  it("respeta el orden recibido como perfil longitudinal", () => {
    const comparison = compareStationReadings(
      [
        { stationId: "34", name: "Rosario", value: 4 },
        { stationId: "35", name: "Villa Constitucion", value: 3.5 },
      ],
      "34",
    );

    expect(comparison[1]?.dropFromPrevious).toBeCloseTo(0.5, 10);
  });
});
