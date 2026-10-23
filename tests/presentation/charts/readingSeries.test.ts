import { describe, expect, it } from "vitest";
import { movingAverage } from "@/domain/analytics/variability";
import {
  buildCorridorChartInput,
  buildStationChartInput,
  type CorridorChartOptions,
} from "@/presentation/charts/readingSeries";
import { createPoint, createStation } from "../../support/factories";
import { createReading } from "../../support/readingFactory";

const absoluteOptions: CorridorChartOptions = {
  locale: "es",
  unit: "m",
  description: "Corredor",
  mode: "absolute",
  averageReferenceLabel: "100 = promedio",
};

const indexOptions: CorridorChartOptions = {
  ...absoluteOptions,
  unit: "% del promedio",
  description: "Índice del corredor",
  mode: "index",
};

describe("buildCorridorChartInput", () => {
  it("alinea los promedios diarios por fecha", () => {
    const first = createReading({
      station: createStation({ id: "34", name: "Rosario" }),
      points: [
        createPoint("2026-10-21T03:00:00.000Z", 4),
        createPoint("2026-10-22T03:00:00.000Z", 5),
      ],
    });
    const second = createReading({
      station: createStation({ id: "35", name: "Villa" }),
      points: [createPoint("2026-10-21T03:00:00.000Z", 3)],
    });

    const input = buildCorridorChartInput([first, second], absoluteOptions);

    expect(input.categories).toEqual(["21/10", "22/10"]);
    expect(input.series).toEqual([
      { name: "Rosario", values: [4, 5] },
      { name: "Villa", values: [3, null] },
    ]);
    expect(input.referenceLine).toBeUndefined();
  });

  it("expresa cada curva como porcentaje de su propio promedio", () => {
    const first = createReading({
      station: createStation({ id: "34", name: "Rosario" }),
      points: [
        createPoint("2026-10-21T03:00:00.000Z", 4),
        createPoint("2026-10-22T03:00:00.000Z", 6),
      ],
    });
    const second = createReading({
      station: createStation({ id: "35", name: "Villa" }),
      points: [createPoint("2026-10-21T03:00:00.000Z", 3)],
    });

    const input = buildCorridorChartInput([first, second], indexOptions);

    expect(input.series).toEqual([
      { name: "Rosario", values: [80, 120] },
      { name: "Villa", values: [100, null] },
    ]);
    expect(input.unit).toBe("% del promedio");
    expect(input.description).toBe("Índice del corredor");
    expect(input.referenceLine).toEqual({ value: 100, label: "100 = promedio" });
  });

  it("deja el indice vacio cuando el promedio de la estacion es cero", () => {
    const reading = createReading({
      station: createStation({ id: "34", name: "Rosario" }),
      points: [createPoint("2026-10-21T03:00:00.000Z", 0)],
    });

    const input = buildCorridorChartInput([reading], indexOptions);

    expect(input.series[0]?.values).toEqual([null]);
  });

  it("omite estaciones sin dias observados", () => {
    const withData = createReading({ station: createStation({ id: "34" }) });
    const withoutData = createReading({
      station: createStation({ id: "35", name: "Villa" }),
      points: [],
    });

    const input = buildCorridorChartInput([withData, withoutData], absoluteOptions);

    expect(input.series.map((series) => series.name)).toEqual(["Rosario"]);
  });

  it("devuelve un grafico vacio sin lecturas", () => {
    const input = buildCorridorChartInput([], indexOptions);

    expect(input.categories).toEqual([]);
    expect(input.series).toEqual([]);
    expect(input.referenceLine).toEqual({ value: 100, label: "100 = promedio" });
  });
});

describe("buildStationChartInput", () => {
  const points = [
    createPoint("2026-10-21T03:00:00.000Z", 4),
    createPoint("2026-10-22T03:00:00.000Z", 5),
  ];

  it("superpone la media movil cuando existe", () => {
    const input = buildStationChartInput(points, movingAverage(points, 7), "es", "m", "Rosario");

    expect(input.categories).toEqual(["21/10", "22/10"]);
    expect(input.series).toHaveLength(2);
    expect(input.series[0]?.values).toEqual([4, 5]);
    expect(input.series[1]?.values).toEqual([4, 4.5]);
  });

  it("dibuja solo la serie observada sin media movil", () => {
    const input = buildStationChartInput(points, [], "es", "m", "Rosario");

    expect(input.series).toHaveLength(1);
  });

  it("deja vacios los puntos que la media movil no cubre", () => {
    const partialAverage = movingAverage([points[1] as (typeof points)[number]], 7);

    const input = buildStationChartInput(points, partialAverage, "es", "m", "Rosario");

    expect(input.series[1]?.values).toEqual([null, 5]);
  });
});
