import { describe, expect, it } from "vitest";
import { buildTelemetryDataset, telemetryColumns } from "@/domain/export/dataset";
import { createSeries } from "@/domain/telemetry/series";
import { createPoint, createStation } from "../../support/factories";

const descriptor = {
  title: "Niveles del Parana",
  slug: "niveles-parana",
  generatedAt: new Date("2026-10-22T12:00:00.000Z"),
  sources: [{ name: "INA", url: "https://alerta.ina.gob.ar", isThirdParty: false }],
};

const rosario = createStation({ id: "34", name: "Rosario" });
const santaFe = createStation({
  id: "30",
  name: "Santa Fe",
  reach: {
    id: "parana-medio",
    name: "Parana medio",
    riverId: "parana",
  },
});

const heightSeries = createSeries("34", 2, "m", [
  createPoint("2026-10-21T00:00:00.000Z", 4),
  createPoint("2026-10-22T00:00:00.000Z", 4.2),
]);

const flowSeries = createSeries("30", 4, "m3/s", [createPoint("2026-10-22T06:00:00.000Z", 18000)]);

describe("telemetryColumns", () => {
  it("publica el orden estable de columnas del dataset maestro", () => {
    expect(telemetryColumns.map((column) => column.key)).toEqual([
      "stationId",
      "stationName",
      "river",
      "reach",
      "timestamp",
      "variable",
      "unit",
      "value",
      "source",
    ]);
  });
});

describe("buildTelemetryDataset", () => {
  it("produce una fila por observacion con su procedencia", () => {
    const dataset = buildTelemetryDataset(
      [
        { station: rosario, series: heightSeries, variableName: "Altura", sourceName: "INA" },
        { station: santaFe, series: flowSeries, variableName: "Caudal", sourceName: "INA" },
      ],
      descriptor,
    );

    expect(dataset.table.rows).toEqual([
      {
        stationId: "34",
        stationName: "Rosario",
        river: "Parana",
        reach: "Parana medio",
        timestamp: "2026-10-21T00:00:00.000Z",
        variable: "Altura",
        unit: "m",
        value: 4,
        source: "INA",
      },
      {
        stationId: "34",
        stationName: "Rosario",
        river: "Parana",
        reach: "Parana medio",
        timestamp: "2026-10-22T00:00:00.000Z",
        variable: "Altura",
        unit: "m",
        value: 4.2,
        source: "INA",
      },
      {
        stationId: "30",
        stationName: "Santa Fe",
        river: "Parana",
        reach: "Parana medio",
        timestamp: "2026-10-22T06:00:00.000Z",
        variable: "Caudal",
        unit: "m3/s",
        value: 18000,
        source: "INA",
      },
    ]);
  });

  it("cuenta estaciones distintas y filas totales", () => {
    const dataset = buildTelemetryDataset(
      [
        { station: rosario, series: heightSeries, variableName: "Altura", sourceName: "INA" },
        { station: santaFe, series: flowSeries, variableName: "Caudal", sourceName: "INA" },
      ],
      descriptor,
    );

    expect(dataset.metadata.stationCount).toBe(2);
    expect(dataset.metadata.rowCount).toBe(3);
  });

  it("no duplica la estacion cuando aporta mas de una serie", () => {
    const dataset = buildTelemetryDataset(
      [
        { station: rosario, series: heightSeries, variableName: "Altura", sourceName: "INA" },
        {
          station: rosario,
          series: createSeries("34", 4, "m3/s", [createPoint("2026-10-20T00:00:00.000Z", 19000)]),
          variableName: "Caudal",
          sourceName: "INA",
        },
      ],
      descriptor,
    );

    expect(dataset.metadata.stationCount).toBe(1);
  });

  it("informa la cobertura minima y maxima del conjunto", () => {
    const dataset = buildTelemetryDataset(
      [
        { station: rosario, series: heightSeries, variableName: "Altura", sourceName: "INA" },
        { station: santaFe, series: flowSeries, variableName: "Caudal", sourceName: "INA" },
      ],
      descriptor,
    );

    expect(dataset.metadata.coverageFrom?.toISOString()).toBe("2026-10-21T00:00:00.000Z");
    expect(dataset.metadata.coverageTo?.toISOString()).toBe("2026-10-22T06:00:00.000Z");
  });

  it("conserva la cobertura en null cuando no hay observaciones", () => {
    const dataset = buildTelemetryDataset(
      [
        {
          station: rosario,
          series: createSeries("34", 2, "m", []),
          variableName: "Altura",
          sourceName: "INA",
        },
      ],
      descriptor,
    );

    expect(dataset.metadata.coverageFrom).toBeNull();
    expect(dataset.metadata.coverageTo).toBeNull();
    expect(dataset.metadata.rowCount).toBe(0);
  });

  it("traslada los metadatos del descriptor", () => {
    const dataset = buildTelemetryDataset([], descriptor);

    expect(dataset.metadata.title).toBe("Niveles del Parana");
    expect(dataset.metadata.slug).toBe("niveles-parana");
    expect(dataset.metadata.generatedAt).toBe(descriptor.generatedAt);
    expect(dataset.metadata.sources).toEqual(descriptor.sources);
  });
});
