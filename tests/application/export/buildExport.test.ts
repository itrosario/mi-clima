import { describe, expect, it } from "vitest";
import { buildExport, serializeDataset } from "@/application/export/buildExport";
import { inaAttribution } from "@/application/shared/attributions";
import type { DatasetDescriptor, SeriesExportInput } from "@/domain/export/dataset";
import { buildTelemetryDataset } from "@/domain/export/dataset";
import { createSeries } from "@/domain/telemetry/series";
import { createPoint, createStation } from "../../support/factories";

const generatedAt = new Date("2026-10-22T12:00:00.000Z");

const descriptor: DatasetDescriptor = {
  title: "Niveles del Parana",
  slug: "rosario",
  generatedAt,
  sources: [inaAttribution],
};

const inputs: readonly SeriesExportInput[] = [
  {
    station: createStation(),
    series: createSeries("34", 2, "m", [
      createPoint("2026-10-21T03:00:00.000Z", 4.8),
      createPoint("2026-10-22T03:00:00.000Z", 5.1),
    ]),
    variableName: "Altura del agua",
    sourceName: "INA",
  },
];

describe("serializeDataset", () => {
  const dataset = buildTelemetryDataset(inputs, descriptor);

  it("genera CSV con BOM y encabezado", () => {
    const content = serializeDataset(dataset, "csv");

    expect(content.startsWith("\uFEFF")).toBe(true);
    expect(content).toContain("station_id;station_name");
    expect(content).toContain("34;Rosario");
  });

  it("genera JSON con metadatos y filas", () => {
    const payload = JSON.parse(serializeDataset(dataset, "json"));

    expect(payload.title).toBe("Niveles del Parana");
    expect(payload.rowCount).toBe(2);
    expect(payload.rows[1]).toMatchObject({ stationId: "34", value: 5.1 });
  });

  it("genera texto plano legible", () => {
    const content = serializeDataset(dataset, "txt");

    expect(content).toContain("Niveles del Parana");
    expect(content).toContain("INA");
    expect(content).toContain("Rosario");
  });
});

describe("buildExport", () => {
  it("arma el archivo con nombre y tipo por formato", () => {
    const csvFile = buildExport({ inputs, descriptor, format: "csv" });
    const jsonFile = buildExport({ inputs, descriptor, format: "json" });
    const textFile = buildExport({ inputs, descriptor, format: "txt" });

    expect(csvFile.fileName).toBe("rosario-2026-10-22.csv");
    expect(csvFile.mimeType).toBe("text/csv;charset=utf-8");
    expect(jsonFile.fileName).toBe("rosario-2026-10-22.json");
    expect(jsonFile.mimeType).toBe("application/json;charset=utf-8");
    expect(textFile.fileName).toBe("rosario-2026-10-22.txt");
    expect(textFile.mimeType).toBe("text/plain;charset=utf-8");
    expect(csvFile.content).toContain("Rosario");
  });
});
