/**
 * Utilidades temporales de la capa de aplicacion.
 *
 * Los casos de uso piden ventanas relativas ("los ultimos siete dias") y estas
 * funciones las convierten en rangos absolutos, sin depender del reloj global.
 */

import type { DateRange } from "@/domain/telemetry/types";

export const millisecondsPerDay = 86_400_000;

/** Desplaza una fecha la cantidad de dias indicada (puede ser negativa). */
export function shiftDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * millisecondsPerDay);
}

/** Rango que termina en `end` y cubre los `days` dias anteriores. */
export function rangeEndingAt(end: Date, days: number): DateRange {
  return { from: shiftDays(end, -days), to: end };
}
