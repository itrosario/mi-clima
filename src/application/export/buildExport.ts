/**
 * Armado de archivos descargables.
 *
 * Toda descarga pasa por el mismo camino: se construye un dataset plano con
 * procedencia y se serializa al formato pedido. El archivo de una estacion y
 * el dataset maestro solo difieren en las series de entrada.
 */

import { toCsv } from "@/domain/export/csv";
import type { DatasetDescriptor, SeriesExportInput } from "@/domain/export/dataset";
import { buildTelemetryDataset } from "@/domain/export/dataset";
import { buildExportFileName } from "@/domain/export/filename";
import { toJson } from "@/domain/export/json";
import { toText } from "@/domain/export/text";
import type { ExportDataset, ExportFormat } from "@/domain/export/types";
import { mimeTypeByFormat } from "@/domain/export/types";

export interface ExportBuildRequest {
  readonly inputs: readonly SeriesExportInput[];
  readonly descriptor: DatasetDescriptor;
  readonly format: ExportFormat;
}

export interface ExportFile {
  readonly fileName: string;
  readonly mimeType: string;
  readonly content: string;
}

/** Serializa el dataset al formato pedido. */
export function serializeDataset(dataset: ExportDataset, format: ExportFormat): string {
  switch (format) {
    case "csv":
      return toCsv(dataset);
    case "json":
      return toJson(dataset);
    case "txt":
      return toText(dataset);
  }
}

/** Construye el archivo listo para descargar. */
export function buildExport(request: ExportBuildRequest): ExportFile {
  const dataset = buildTelemetryDataset(request.inputs, request.descriptor);

  return {
    fileName: buildExportFileName(
      dataset.metadata.slug,
      request.format,
      dataset.metadata.generatedAt,
    ),
    mimeType: mimeTypeByFormat[request.format],
    content: serializeDataset(dataset, request.format),
  };
}
