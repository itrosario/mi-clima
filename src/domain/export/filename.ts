/**
 * Nombres de archivo de las descargas.
 *
 * El nombre incluye el identificador del conjunto y la fecha de generacion,
 * en formato ISO corto, para que dos descargas del mismo dia no se pisen y
 * para que el archivo se ordene cronologicamente en cualquier sistema.
 */

import type { ExportFormat } from "./types";
import { fileExtensionByFormat } from "./types";

/**
 * Reduce un texto a un identificador seguro para nombres de archivo.
 *
 * Solo conserva letras sin acentos, numeros y guiones.
 */
export function sanitizeSlug(rawSlug: string): string {
  const sanitized = rawSlug
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length > 0 ? sanitized : "datos";
}

/** Fecha en formato `YYYY-MM-DD` (UTC). */
export function formatFileDate(timestamp: Date): string {
  const year = timestamp.getUTCFullYear();
  const month = `${timestamp.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${timestamp.getUTCDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Nombre completo del archivo, por ejemplo `mi-clima-rosario-2026-10-22.csv`. */
export function buildExportFileName(slug: string, format: ExportFormat, generatedAt: Date): string {
  return `${sanitizeSlug(slug)}-${formatFileDate(generatedAt)}.${fileExtensionByFormat[format]}`;
}
