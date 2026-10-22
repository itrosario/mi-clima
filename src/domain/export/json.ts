/**
 * Serializacion JSON.
 *
 * Incluye los metadatos de procedencia junto con las filas: un archivo JSON
 * exportado sin saber de donde salio el dato es un archivo inservible.
 */

import type { ExportDataset } from "./types";

interface JsonExportPayload {
  readonly title: string;
  readonly generatedAt: string;
  readonly coverage: {
    readonly from: string | null;
    readonly to: string | null;
  };
  readonly rowCount: number;
  readonly stationCount: number;
  readonly sources: readonly {
    readonly name: string;
    readonly url: string;
    readonly isThirdParty: boolean;
  }[];
  readonly columns: readonly string[];
  readonly rows: readonly Record<string, string | number | null>[];
}

export function toJson(dataset: ExportDataset): string {
  const payload: JsonExportPayload = {
    title: dataset.metadata.title,
    generatedAt: dataset.metadata.generatedAt.toISOString(),
    coverage: {
      from: dataset.metadata.coverageFrom?.toISOString() ?? null,
      to: dataset.metadata.coverageTo?.toISOString() ?? null,
    },
    rowCount: dataset.metadata.rowCount,
    stationCount: dataset.metadata.stationCount,
    sources: dataset.metadata.sources.map((source) => ({
      name: source.name,
      url: source.url,
      isThirdParty: source.isThirdParty,
    })),
    columns: dataset.table.columns.map((column) => column.key),
    rows: dataset.table.rows.map((row) => ({ ...row })),
  };

  return `${JSON.stringify(payload, null, 2)}\n`;
}
