import type { ExportDataset } from "@/domain/export/types";

export interface ExportDatasetOverrides {
  readonly metadata?: Partial<ExportDataset["metadata"]>;
  readonly table?: Partial<ExportDataset["table"]>;
}

export function createExportDataset(overrides: ExportDatasetOverrides = {}): ExportDataset {
  const baseDataset: ExportDataset = {
    metadata: {
      title: "Niveles del Parana",
      slug: "niveles-parana",
      generatedAt: new Date("2026-10-22T12:00:00.000Z"),
      sources: [
        {
          name: "INA",
          url: "https://alerta.ina.gob.ar",
          isThirdParty: false,
        },
        {
          name: "Open-Meteo",
          url: "https://open-meteo.com",
          isThirdParty: true,
        },
      ],
      stationCount: 1,
      rowCount: 2,
      coverageFrom: new Date("2026-10-21T00:00:00.000Z"),
      coverageTo: new Date("2026-10-22T00:00:00.000Z"),
    },
    table: {
      columns: [
        { key: "station", label: "Estacion" },
        { key: "value", label: "Nivel" },
      ],
      rows: [
        { station: "Rosario", value: 4.1 },
        { station: "Santa Fe", value: null },
      ],
    },
  };

  return {
    metadata: { ...baseDataset.metadata, ...overrides.metadata },
    table: { ...baseDataset.table, ...overrides.table },
  };
}
