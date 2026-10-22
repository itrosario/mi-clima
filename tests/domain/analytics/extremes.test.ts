import { describe, expect, it } from "vitest";
import {
  computeAnnualExtremes,
  computeYearlyMaxima,
  toDailyExtremes,
} from "@/domain/analytics/extremes";
import { createPoint, createThresholds } from "../../support/factories";

const observations = [
  createPoint("2025-12-31T10:00:00.000Z", 4),
  createPoint("2026-01-01T02:00:00.000Z", 5.1),
  createPoint("2026-01-01T14:00:00.000Z", 5.3),
  createPoint("2026-01-02T10:00:00.000Z", 1.2),
];

describe("toDailyExtremes", () => {
  it("agrega los registros por dia en orden cronologico", () => {
    const daily = toDailyExtremes([...observations].reverse());

    expect(daily.map((day) => day.dateKey)).toEqual(["2025-12-31", "2026-01-01", "2026-01-02"]);
    expect(daily[1]?.maximum).toBe(5.3);
    expect(daily[1]?.minimum).toBe(5.1);
    expect(daily[1]?.mean).toBeCloseTo(5.2, 10);
    expect(daily[1]?.sampleCount).toBe(2);
  });

  it("devuelve una lista vacia sin observaciones", () => {
    expect(toDailyExtremes([])).toEqual([]);
  });
});

describe("computeAnnualExtremes", () => {
  it("calcula extremos y dias en alerta por anio", () => {
    const annual = computeAnnualExtremes(observations, createThresholds());

    expect(annual).toEqual([
      {
        year: 2025,
        maximum: 4,
        minimum: 4,
        daysAboveAlert: 0,
        daysAboveEvacuation: 0,
        observedDays: 1,
      },
      {
        year: 2026,
        maximum: 5.3,
        minimum: 1.2,
        daysAboveAlert: 1,
        daysAboveEvacuation: 1,
        observedDays: 2,
      },
    ]);
  });

  it("no cuenta dias en alerta cuando no hay umbrales", () => {
    const annual = computeAnnualExtremes(
      observations,
      createThresholds({ lowWater: null, alert: null, evacuation: null }),
    );

    expect(annual.every((year) => year.daysAboveAlert === 0)).toBe(true);
    expect(annual.every((year) => year.daysAboveEvacuation === 0)).toBe(true);
  });
});

describe("computeYearlyMaxima", () => {
  it("devuelve el maximo de cada anio con su fecha", () => {
    expect(computeYearlyMaxima(observations)).toEqual([
      { year: 2025, maximum: 4, dateKey: "2025-12-31" },
      { year: 2026, maximum: 5.3, dateKey: "2026-01-01" },
    ]);
  });

  it("devuelve una lista vacia sin observaciones", () => {
    expect(computeYearlyMaxima([])).toEqual([]);
  });
});
