/**
 * Serializacion CSV.
 *
 * Decisiones explicitas:
 * - separador punto y coma, que es el que espera Excel en configuracion
 *   regional argentina;
 * - BOM UTF-8 al principio para que los acentos se abran bien;
 * - comillas dobles solo cuando el valor las necesita, duplicando las
 *   comillas internas segun RFC 4180.
 */

import type { ExportCell, ExportDataset } from "./types";

const utf8ByteOrderMark = "\uFEFF";
const fieldSeparator = ";";

export function escapeCsvCell(cell: ExportCell): string {
  if (cell === null) {
    return "";
  }

  const text = String(cell);
  const needsQuoting =
    text.includes(fieldSeparator) ||
    text.includes('"') ||
    text.includes("\n") ||
    text.includes("\r");

  if (!needsQuoting) {
    return text;
  }

  return `"${text.replaceAll('"', '""')}"`;
}

/** Genera el CSV completo, con encabezado y BOM. */
export function toCsv(dataset: ExportDataset): string {
  const headerLine = dataset.table.columns
    .map((column) => escapeCsvCell(column.label))
    .join(fieldSeparator);

  const dataLines = dataset.table.rows.map((row) =>
    dataset.table.columns
      .map((column) => escapeCsvCell(row[column.key] ?? null))
      .join(fieldSeparator),
  );

  return `${utf8ByteOrderMark}${[headerLine, ...dataLines].join("\r\n")}\r\n`;
}
