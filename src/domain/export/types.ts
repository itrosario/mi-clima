/**
 * Modelo de exportacion de datos.
 *
 * Un `ExportDataset` es una tabla plana con metadatos de procedencia. Los
 * formatos CSV, JSON y texto se generan a partir de este modelo, de modo que
 * los tres incluyan exactamente la misma informacion.
 */

export type ExportFormat = "csv" | "json" | "txt";

export const exportFormats: readonly ExportFormat[] = ["csv", "json", "txt"];

export interface SourceAttribution {
  /** Nombre publico del organismo o servicio. */
  readonly name: string;
  /** URL de referencia. */
  readonly url: string;
  /** `true` si la fuente no es un organismo oficial argentino. */
  readonly isThirdParty: boolean;
}

export interface ExportColumn {
  readonly key: string;
  readonly label: string;
}

export type ExportCell = string | number | null;

export interface ExportTable {
  readonly columns: readonly ExportColumn[];
  readonly rows: readonly Readonly<Record<string, ExportCell>>[];
}

export interface DatasetMetadata {
  readonly title: string;
  /** Identificador estable para el nombre de archivo. */
  readonly slug: string;
  readonly generatedAt: Date;
  readonly sources: readonly SourceAttribution[];
  readonly stationCount: number;
  readonly rowCount: number;
  /** Rango temporal cubierto por los datos. */
  readonly coverageFrom: Date | null;
  readonly coverageTo: Date | null;
}

export interface ExportDataset {
  readonly metadata: DatasetMetadata;
  readonly table: ExportTable;
}

export const mimeTypeByFormat: Readonly<Record<ExportFormat, string>> = {
  csv: "text/csv;charset=utf-8",
  json: "application/json;charset=utf-8",
  txt: "text/plain;charset=utf-8",
};

export const fileExtensionByFormat: Readonly<Record<ExportFormat, string>> = {
  csv: "csv",
  json: "json",
  txt: "txt",
};
