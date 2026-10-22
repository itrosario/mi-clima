import { describe, expect, it } from "vitest";
import {
  coveredRange,
  createSeries,
  dedupePointsByTimestamp,
  earliestPoint,
  filterPointsByRange,
  isSeriesEmpty,
  latestPoint,
  latestValue,
  normalizePoints,
  sortPointsByTime,
} from "@/domain/telemetry/series";
import { createPoint } from "../../support/factories";

const januaryFirst = createPoint("2026-01-01T00:00:00.000Z", 1);
const januarySecond = createPoint("2026-01-02T00:00:00.000Z", 2);
const januaryThird = createPoint("2026-01-03T00:00:00.000Z", 3);

describe("sortPointsByTime", () => {
  it("ordena de forma ascendente sin mutar la entrada", () => {
    const points = [januaryThird, januaryFirst, januarySecond];

    expect(sortPointsByTime(points).map((point) => point.value)).toEqual([1, 2, 3]);
    expect(points.map((point) => point.value)).toEqual([3, 1, 2]);
  });
});

describe("dedupePointsByTimestamp", () => {
  it("conserva el ultimo valor publicado para el mismo instante", () => {
    const points = [
      createPoint("2026-01-01T00:00:00.000Z", 1),
      createPoint("2026-01-01T00:00:00.000Z", 4),
      januarySecond,
    ];

    expect(dedupePointsByTimestamp(points).map((point) => point.value)).toEqual([4, 2]);
  });
});

describe("normalizePoints", () => {
  it("ordena y deduplica en un solo paso", () => {
    const points = [januarySecond, createPoint("2026-01-01T00:00:00.000Z", 9), januaryFirst];

    expect(normalizePoints(points).map((point) => point.value)).toEqual([1, 2]);
  });
});

describe("filterPointsByRange", () => {
  it("incluye ambos extremos del rango", () => {
    const points = [januaryFirst, januarySecond, januaryThird];

    expect(
      filterPointsByRange(points, {
        from: new Date("2026-01-01T00:00:00.000Z"),
        to: new Date("2026-01-02T00:00:00.000Z"),
      }).map((point) => point.value),
    ).toEqual([1, 2]);
  });
});

describe("latestPoint y earliestPoint", () => {
  it("devuelven los extremos de la serie", () => {
    const points = [januarySecond, januaryFirst, januaryThird];

    expect(latestPoint(points)?.value).toBe(3);
    expect(earliestPoint(points)?.value).toBe(1);
  });

  it("devuelven null cuando no hay puntos", () => {
    expect(latestPoint([])).toBeNull();
    expect(earliestPoint([])).toBeNull();
  });
});

describe("latestValue", () => {
  it("devuelve el ultimo valor observado", () => {
    expect(latestValue([januaryThird, januaryFirst])).toBe(3);
    expect(latestValue([])).toBeNull();
  });
});

describe("isSeriesEmpty", () => {
  it("detecta series sin observaciones", () => {
    expect(isSeriesEmpty(createSeries("34", 2, "m", []))).toBe(true);
    expect(isSeriesEmpty(createSeries("34", 2, "m", [januaryFirst]))).toBe(false);
  });
});

describe("createSeries", () => {
  it("normaliza los puntos y conserva la identidad de la serie", () => {
    const series = createSeries("34", 2, "m", [januarySecond, januaryFirst]);

    expect(series.stationId).toBe("34");
    expect(series.variableId).toBe(2);
    expect(series.unit).toBe("m");
    expect(series.points.map((point) => point.value)).toEqual([1, 2]);
  });
});

describe("coveredRange", () => {
  it("devuelve el rango cubierto por los puntos", () => {
    const range = coveredRange([januaryThird, januaryFirst]);

    expect(range?.from.toISOString()).toBe("2026-01-01T00:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-01-03T00:00:00.000Z");
  });

  it("devuelve null cuando no hay puntos", () => {
    expect(coveredRange([])).toBeNull();
  });
});
