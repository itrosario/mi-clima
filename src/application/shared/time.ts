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

/**
 * Redondea hacia abajo a la hora en punto.
 *
 * Las ventanas relativas se piden a la hora cerrada para que todos los
 * visitantes compartan la misma clave de cache durante una hora.
 */
export function startOfHour(date: Date): Date {
  const rounded = new Date(date);
  rounded.setUTCMinutes(0, 0, 0);

  return rounded;
}

/** Rango relativo que termina en la hora en punto anterior a `end`. */
export function rangeEndingAtHour(end: Date, days: number): DateRange {
  return rangeEndingAt(startOfHour(end), days);
}
