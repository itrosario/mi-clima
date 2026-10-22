/**
 * Puerto de cache.
 *
 * Dos implementaciones conviven: `sessionStorage` para el dataset del dia y
 * la Cache API del navegador para las tablas de percentiles, que son grandes
 * y cambian poco.
 */

export interface CachePort {
  /** Devuelve `null` cuando no hay entrada o cuando ya vencio. */
  read<T>(key: string): Promise<T | null>;
  /** Escribe una entrada con vigencia opcional en segundos. */
  write<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Elimina una entrada puntual. */
  remove(key: string): Promise<void>;
}
