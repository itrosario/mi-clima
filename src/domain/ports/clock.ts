/**
 * Puerto de reloj.
 *
 * El dominio no llama a `Date.now()`: recibe la hora desde afuera. Asi los
 * casos de uso son deterministas en las pruebas y la interfaz puede mostrar
 * "actualizado hace 3 minutos" sin depender del reloj del sistema.
 */

export interface Clock {
  now(): Date;
}

/** Reloj real. */
export const systemClock: Clock = {
  now: () => new Date(),
};
