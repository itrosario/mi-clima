/**
 * Serializacion en texto plano.
 *
 * Pensado para lectura humana y para adjuntar en un correo: encabezado de
 * procedencia, tabla alineada y cierre con la fuente de cada dato.
 */

import type { ExportCell, ExportDataset } from "./types";

function formatCell(cell: ExportCell): string {
  return cell === null ? "" : String(cell);
}

function buildMetadataBlock(dataset: ExportDataset): readonly string[] {
  const { metadata } = dataset;
  const coverage =
    metadata.coverageFrom === null || metadata.coverageTo === null
      ? "sin cobertura informada"
      : `${metadata.coverageFrom.toISOString()} a ${metadata.coverageTo.toISOString()}`;

  return [
    metadata.title,
    "=".repeat(metadata.title.length),
    `Generado: ${metadata.generatedAt.toISOString()}`,
    `Cobertura: ${coverage}`,
    `Estaciones: ${metadata.stationCount}`,
    `Filas: ${metadata.rowCount}`,
    "Fuentes:",
    ...metadata.sources.map(
      (source) =>
        `  - ${source.name}${source.isThirdParty ? " (fuente de terceros)" : ""} — ${source.url}`,
    ),
  ];
}

/** Genera una tabla de ancho fijo con encabezado y separador. */
export function toText(dataset: ExportDataset): string {
  const headerCells = dataset.table.columns.map((column) => column.label);
  const rowCells = dataset.table.rows.map((row) =>
    dataset.table.columns.map((column) => formatCell(row[column.key] ?? null)),
  );

  const columnWidths = headerCells.map((headerCell, columnIndex) =>
    rowCells.reduce((width, cells) => {
      const cellLength = (cells[columnIndex] as string).length;
      return Math.max(width, cellLength);
    }, headerCell.length),
  );

  const renderLine = (cells: readonly string[]): string =>
    cells
      .map((cell, columnIndex) => cell.padEnd(columnWidths[columnIndex] as number, " "))
      .join("  ")
      .trimEnd();

  const separatorLine = columnWidths.map((width) => "-".repeat(width)).join("  ");

  const lines = [
    ...buildMetadataBlock(dataset),
    "",
    renderLine(headerCells),
    separatorLine,
    ...rowCells.map(renderLine),
    "",
  ];

  return lines.join("\n");
}
