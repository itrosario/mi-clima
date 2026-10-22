import { describe, expect, it } from "vitest";
import type { DailyPercentileProfile, PercentileEntry } from "@/domain/analytics/anomaly";
import {
  computeAnomaly,
  dayOfYear,
  estimatePercentileRank,
  findDailyProfile,
  interpolatePercentileValue,
  resolveAnomalyBand,
} from "@/domain/analytics/anomaly";

const standardPercentiles: readonly PercentileEntry[] = [
  { percentile: 5, value: 1 },
  { percentile: 25, value: 2 },
  { percentile: 50, value: 3 },
  { percentile: 75, value: 4 },
  { percentile: 95, value: 5 },
];

describe("dayOfYear", () => {
  it("cuenta los dias del anio en UTC", () => {
    expect(dayOfYear(new Date("2026-01-01T00:00:00.000Z"))).toBe(1);
    expect(dayOfYear(new Date("2026-03-01T00:00:00.000Z"))).toBe(60);
    expect(dayOfYear(new Date("2026-12-31T23:59:59.000Z"))).toBe(365);
    expect(dayOfYear(new Date("2024-12-31T00:00:00.000Z"))).toBe(366);
  });
});

describe("findDailyProfile", () => {
  it("devuelve null cuando no hay perfiles", () => {
    expect(findDailyProfile([], new Date("2026-01-01T00:00:00.000Z"))).toBeNull();
  });

  it("encuentra el perfil del mismo dia", () => {
    const profiles: readonly DailyPercentileProfile[] = [
      { dayOfYear: 10, percentiles: standardPercentiles },
      { dayOfYear: 20, percentiles: [] },
    ];

    expect(findDailyProfile(profiles, new Date("2026-01-20T00:00:00.000Z"))?.dayOfYear).toBe(20);
  });

  it("elige el perfil mas cercano cuando falta el dia exacto", () => {
    const profiles: readonly DailyPercentileProfile[] = [
      { dayOfYear: 10, percentiles: [] },
      { dayOfYear: 14, percentiles: [] },
      { dayOfYear: 20, percentiles: [] },
    ];

    expect(findDailyProfile(profiles, new Date("2026-01-13T00:00:00.000Z"))?.dayOfYear).toBe(14);
  });

  it("mide la distancia de forma circular entre fin y principio de anio", () => {
    const profiles: readonly DailyPercentileProfile[] = [
      { dayOfYear: 100, percentiles: [] },
      { dayOfYear: 365, percentiles: [] },
    ];

    expect(findDailyProfile(profiles, new Date("2026-01-01T00:00:00.000Z"))?.dayOfYear).toBe(365);
  });
});

describe("interpolatePercentileValue", () => {
  it("devuelve null sin percentiles", () => {
    expect(interpolatePercentileValue([], 50)).toBeNull();
  });

  it("devuelve el extremo conocido fuera de la tabla", () => {
    expect(interpolatePercentileValue(standardPercentiles, 1)).toBe(1);
    expect(interpolatePercentileValue(standardPercentiles, 99)).toBe(5);
  });

  it("devuelve el valor exacto cuando el percentil coincide", () => {
    expect(interpolatePercentileValue(standardPercentiles, 50)).toBe(3);
  });

  it("interpola linealmente entre dos percentiles", () => {
    expect(interpolatePercentileValue(standardPercentiles, 37.5)).toBeCloseTo(2.5, 10);
  });

  it("ordena la tabla antes de interpolar", () => {
    const unordered: readonly PercentileEntry[] = [
      { percentile: 95, value: 5 },
      { percentile: 5, value: 1 },
      { percentile: 50, value: 3 },
    ];

    expect(interpolatePercentileValue(unordered, 50)).toBe(3);
  });
});

describe("estimatePercentileRank", () => {
  it("devuelve null sin percentiles", () => {
    expect(estimatePercentileRank([], 3)).toBeNull();
  });

  it("devuelve los extremos cuando el valor queda fuera de la tabla", () => {
    expect(estimatePercentileRank(standardPercentiles, 0)).toBe(5);
    expect(estimatePercentileRank(standardPercentiles, 9)).toBe(95);
  });

  it("estima el percentil interpolando entre valores", () => {
    expect(estimatePercentileRank(standardPercentiles, 2.5)).toBeCloseTo(37.5, 10);
  });

  it("ordena la tabla por valor antes de estimar", () => {
    const unordered: readonly PercentileEntry[] = [
      { percentile: 95, value: 5 },
      { percentile: 5, value: 1 },
      { percentile: 50, value: 3 },
    ];

    expect(estimatePercentileRank(unordered, 3)).toBe(50);
  });
});

describe("resolveAnomalyBand", () => {
  it.each([
    [null, "unknown"],
    [5, "very-low"],
    [15, "low"],
    [30, "below-normal"],
    [50, "normal"],
    [70, "above-normal"],
    [80, "high"],
    [95, "very-high"],
    [10, "low"],
    [25, "below-normal"],
    [40, "normal"],
    [60, "normal"],
    [75, "above-normal"],
    [90, "high"],
  ])("clasifica el percentil %s como %s", (percentileRank, band) => {
    expect(resolveAnomalyBand(percentileRank as number | null)).toBe(band);
  });
});

describe("computeAnomaly", () => {
  it("informa la anomalia contra el perfil historico", () => {
    const anomaly = computeAnomaly(3.5, { dayOfYear: 295, percentiles: standardPercentiles });

    expect(anomaly.expected).toBe(3);
    expect(anomaly.absolute).toBeCloseTo(0.5, 10);
    expect(anomaly.relative).toBeCloseTo(0.1666666667, 8);
    expect(anomaly.percentileRank).toBeCloseTo(62.5, 10);
    expect(anomaly.band).toBe("above-normal");
  });

  it("no inventa una anomalia cuando falta el perfil", () => {
    expect(computeAnomaly(3.5, null)).toEqual({
      observed: 3.5,
      expected: null,
      absolute: null,
      relative: null,
      percentileRank: null,
      band: "unknown",
    });
  });

  it("no calcula la diferencia relativa cuando el valor esperado es cero", () => {
    const anomaly = computeAnomaly(2, {
      dayOfYear: 1,
      percentiles: [
        { percentile: 50, value: 0 },
        { percentile: 90, value: 1 },
      ],
    });

    expect(anomaly.expected).toBe(0);
    expect(anomaly.absolute).toBe(2);
    expect(anomaly.relative).toBeNull();
  });

  it("no inventa la anomalia cuando el perfil no publica percentiles", () => {
    const anomaly = computeAnomaly(2, { dayOfYear: 1, percentiles: [] });

    expect(anomaly.expected).toBeNull();
    expect(anomaly.absolute).toBeNull();
    expect(anomaly.relative).toBeNull();
    expect(anomaly.percentileRank).toBeNull();
    expect(anomaly.band).toBe("unknown");
  });
});
