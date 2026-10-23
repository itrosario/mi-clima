import { describe, expect, it } from "vitest";
import { movingAverage } from "@/domain/analytics/variability";
import {
  buildCorridorChartInput,
  buildStationChartInput,
} from "@/presentation/charts/readingSeries";
import { createPoint, createStation } from "../../support/factories";
import { createReading } from "../../support/readingFactory";

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

    const input = buildCorridorChartInput([first, second], "es", "m", "Corredor");

    expect(input.categories).toEqual(["21/10", "22/10"]);
    expect(input.series).toEqual([
      { name: "Rosario", values: [4, 5] },
      { name: "Villa", values: [3, null] },
    ]);
  });

  it("omite estaciones sin dias observados", () => {
    const withData = createReading({ station: createStation({ id: "34" }) });
    const withoutData = createReading({
      station: createStation({ id: "35", name: "Villa" }),
      points: [],
    });

    const input = buildCorridorChartInput([withData, withoutData], "en", "m", "Corredor");

    expect(input.series.map((series) => series.name)).toEqual(["Rosario"]);
  });

  it("devuelve un grafico vacio sin lecturas", () => {
    const input = buildCorridorChartInput([], "es", "m", "Corredor");

    expect(input.categories).toEqual([]);
    expect(input.series).toEqual([]);
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
