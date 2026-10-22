import { describe, expect, it } from "vitest";
import {
  coefficientOfVariation,
  mean,
  movingAverage,
  standardDeviation,
  summarizeVariability,
} from "@/domain/analytics/variability";
import { createPoint } from "../../support/factories";

describe("mean", () => {
  it("promedia los valores", () => {
    expect(mean([1, 2, 3])).toBe(2);
  });

  it("devuelve null sin valores", () => {
    expect(mean([])).toBeNull();
  });
});

describe("standardDeviation", () => {
  it("calcula la desviacion poblacional", () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2, 10);
  });

  it("devuelve cero con un unico valor", () => {
    expect(standardDeviation([7])).toBe(0);
  });

  it("devuelve null sin valores", () => {
    expect(standardDeviation([])).toBeNull();
  });
});

describe("coefficientOfVariation", () => {
  it("relaciona la desviacion con la media", () => {
    expect(coefficientOfVariation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(0.4, 10);
  });

  it("devuelve null cuando la media es cero", () => {
    expect(coefficientOfVariation([1, -1])).toBeNull();
  });

  it("devuelve null sin valores", () => {
    expect(coefficientOfVariation([])).toBeNull();
  });
});

describe("movingAverage", () => {
  it("promedia con una ventana temporal hacia atras", () => {
    const points = [
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-02T00:00:00.000Z", 3),
      createPoint("2026-01-06T00:00:00.000Z", 10),
    ];

    const averaged = movingAverage(points, 2);

    expect(averaged.map((point) => point.value)).toEqual([1, 2, 10]);
    expect(averaged.map((point) => point.sampleCount)).toEqual([1, 2, 1]);
  });

  it("descarta varios puntos al avanzar la ventana", () => {
    const points = [
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-01T12:00:00.000Z", 2),
      createPoint("2026-01-03T00:00:00.000Z", 3),
      createPoint("2026-01-03T12:00:00.000Z", 4),
    ];

    const averaged = movingAverage(points, 1);

    expect(averaged.map((point) => point.sampleCount)).toEqual([1, 2, 1, 2]);
    expect(averaged.at(-1)?.value).toBeCloseTo(3.5, 10);
  });

  it("devuelve una lista vacia con ventana invalida o sin puntos", () => {
    const points = [createPoint("2026-01-01T00:00:00.000Z", 1)];

    expect(movingAverage(points, 0)).toEqual([]);
    expect(movingAverage(points, -1)).toEqual([]);
    expect(movingAverage([], 3)).toEqual([]);
  });
});

describe("summarizeVariability", () => {
  it("resume una serie con datos", () => {
    const summary = summarizeVariability([1, 2, 3]);

    expect(summary.mean).toBe(2);
    expect(summary.minimum).toBe(1);
    expect(summary.maximum).toBe(3);
    expect(summary.range).toBe(2);
    expect(summary.standardDeviation).toBeCloseTo(0.816496580927726, 10);
    expect(summary.coefficientOfVariation).toBeCloseTo(0.408248290463863, 10);
    expect(summary.sampleCount).toBe(3);
  });

  it("resume una serie vacia", () => {
    expect(summarizeVariability([])).toEqual({
      mean: null,
      minimum: null,
      maximum: null,
      range: null,
      standardDeviation: null,
      coefficientOfVariation: null,
      sampleCount: 0,
    });
  });
});
