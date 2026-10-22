/**
 * Lectura defensiva de respuestas JSON.
 *
 * Las respuestas de terceros no garantizan tipos: un numero puede venir como
 * cadena y un campo puede faltar. Estas funciones traducen sin lanzar, para
 * que el adaptador decida que hacer con el hueco.
 */

export function isRecord(candidate: unknown): candidate is Record<string, unknown> {
  return typeof candidate === "object" && candidate !== null && !Array.isArray(candidate);
}

export function toFiniteNumber(candidate: unknown): number | null {
  if (typeof candidate === "number") {
    return Number.isFinite(candidate) ? candidate : null;
  }
  if (typeof candidate === "string" && candidate.trim().length > 0) {
    const parsed = Number(candidate);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function toNonEmptyText(candidate: unknown): string | null {
  if (typeof candidate !== "string") {
    return null;
  }
  const trimmed = candidate.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** Lee un elemento de un arreglo sin confiar en que el campo sea un arreglo. */
export function readArrayItem(candidate: unknown, index: number): unknown {
  if (!Array.isArray(candidate)) {
    return null;
  }
  return candidate[index];
}

/** Devuelve el arreglo cuando el campo es un arreglo; si no, uno vacio. */
export function readArray(candidate: unknown): readonly unknown[] {
  return Array.isArray(candidate) ? candidate : [];
}
