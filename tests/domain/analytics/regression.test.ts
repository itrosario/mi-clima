import { describe, expect, it } from "vitest";
import { linearRegression } from "@/domain/analytics/regression";

describe("linearRegression", () => {
  it("devuelve una recta plana cuando hay menos de dos pares", () => {
    expect(linearRegression([], [])).toEqual({
      slope: 0,
      intercept: 0,
      rSquared: 0,
      sampleCount: 0,
    });
    expect(linearRegression([1], [10])).toEqual({
      slope: 0,
      intercept: 0,
      rSquared: 0,
      sampleCount: 1,
    });
  });

  it("usa la cantidad de pares que permite la serie mas corta", () => {
    const regression = linearRegression([0, 1, 2], [1, 3]);

    expect(regression.sampleCount).toBe(2);
    expect(regression.slope).toBeCloseTo(2, 10);
  });

  it("ajusta una recta perfecta", () => {
    const regression = linearRegression([0, 1, 2, 3], [1, 3, 5, 7]);

    expect(regression.slope).toBeCloseTo(2, 10);
    expect(regression.intercept).toBeCloseTo(1, 10);
    expect(regression.rSquared).toBeCloseTo(1, 10);
  });

  it("devuelve pendiente cero cuando todos los x son iguales", () => {
    const regression = linearRegression([2, 2, 2], [5, 7, 9]);

    expect(regression.slope).toBe(0);
    expect(regression.intercept).toBeCloseTo(7, 10);
  });

  it("trata una y constante como ajuste perfecto", () => {
    const regression = linearRegression([0, 1, 2], [4, 4, 4]);

    expect(regression.slope).toBe(0);
    expect(regression.intercept).toBeCloseTo(4, 10);
    expect(regression.rSquared).toBe(1);
  });

  it("mide la bondad del ajuste cuando los datos tienen dispersion", () => {
    const regression = linearRegression([0, 1, 2, 3], [1, 4, 2, 6]);

    expect(regression.rSquared).toBeGreaterThan(0);
    expect(regression.rSquared).toBeLessThan(1);
  });
});
