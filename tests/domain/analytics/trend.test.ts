import { describe, expect, it } from "vitest";
import {
  analyzeTrend,
  defaultSteadyThresholdPerDay,
  resolveTrendDirection,
} from "@/domain/analytics/trend";
import { createPoint } from "../../support/factories";

describe("analyzeTrend", () => {
  it("no se pronuncia con menos de dos puntos", () => {
    expect(analyzeTrend([])).toEqual({
      direction: "unknown",
      slopePerDay: null,
      rateOfChangePerDay: null,
      firstValue: null,
      lastValue: null,
      delta: null,
      pointCount: 0,
      windowDays: 0,
      rSquared: null,
    });

    expect(analyzeTrend([createPoint("2026-01-01T00:00:00.000Z", 3)]).direction).toBe("unknown");
  });

  it("no se pronuncia cuando todos los puntos comparten instante", () => {
    const trend = analyzeTrend([
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-01T00:00:00.000Z", 2),
    ]);

    expect(trend.direction).toBe("unknown");
    expect(trend.windowDays).toBe(0);
    expect(trend.pointCount).toBe(2);
  });

  it("detecta un ascenso y calcula la velocidad", () => {
    const trend = analyzeTrend([
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-03T00:00:00.000Z", 1.5),
    ]);

    expect(trend.direction).toBe("rising");
    expect(trend.slopePerDay).toBeCloseTo(0.25, 10);
    expect(trend.rateOfChangePerDay).toBeCloseTo(0.25, 10);
    expect(trend.delta).toBeCloseTo(0.5, 10);
    expect(trend.firstValue).toBe(1);
    expect(trend.lastValue).toBe(1.5);
    expect(trend.windowDays).toBe(2);
    expect(trend.pointCount).toBe(2);
    expect(trend.rSquared).toBeCloseTo(1, 10);
  });

  it("detecta un descenso aunque los puntos lleguen desordenados", () => {
    const trend = analyzeTrend([
      createPoint("2026-01-03T00:00:00.000Z", 2),
      createPoint("2026-01-01T00:00:00.000Z", 4),
      createPoint("2026-01-02T00:00:00.000Z", 3),
    ]);

    expect(trend.direction).toBe("falling");
    expect(trend.slopePerDay).toBeCloseTo(-1, 10);
    expect(trend.delta).toBeCloseTo(-2, 10);
  });

  it("considera estable una variacion por debajo del umbral", () => {
    const trend = analyzeTrend([
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-02T00:00:00.000Z", 1.0005),
    ]);

    expect(trend.direction).toBe("steady");
  });

  it("acepta un umbral de estabilidad propio", () => {
    const points = [
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-02T00:00:00.000Z", 1.05),
    ];

    expect(analyzeTrend(points).direction).toBe("rising");
    expect(analyzeTrend(points, { steadyThresholdPerDay: 0.1 }).direction).toBe("steady");
  });
});

describe("resolveTrendDirection", () => {
  it("clasifica la pendiente contra el umbral", () => {
    expect(resolveTrendDirection(0.5, 0.001)).toBe("rising");
    expect(resolveTrendDirection(-0.5, 0.001)).toBe("falling");
    expect(resolveTrendDirection(0.0005, 0.001)).toBe("steady");
    expect(resolveTrendDirection(-0.0005, 0.001)).toBe("steady");
    expect(defaultSteadyThresholdPerDay).toBe(0.001);
  });
});
