import { describe, expect, it } from "vitest";
import { hasAnyThreshold } from "@/domain/catalog/types";
import { systemClock } from "@/domain/ports/clock";
import { createThresholds } from "../../support/factories";

describe("hasAnyThreshold", () => {
  it("reconoce una estacion con al menos un umbral publicado", () => {
    expect(hasAnyThreshold(createThresholds())).toBe(true);
    expect(hasAnyThreshold(createThresholds({ lowWater: null, alert: 5, evacuation: null }))).toBe(
      true,
    );
    expect(
      hasAnyThreshold(createThresholds({ lowWater: 1.6, alert: null, evacuation: null })),
    ).toBe(true);
    expect(
      hasAnyThreshold(createThresholds({ lowWater: null, alert: null, evacuation: 5.2 })),
    ).toBe(true);
  });

  it("descarta una estacion sin umbrales", () => {
    expect(
      hasAnyThreshold(createThresholds({ lowWater: null, alert: null, evacuation: null })),
    ).toBe(false);
  });
});

describe("systemClock", () => {
  it("devuelve la hora actual", () => {
    const before = Date.now();
    const now = systemClock.now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});
