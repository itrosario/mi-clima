/**
 * Puerto de cache.
 *
 * Dos implementaciones conviven: `sessionStorage` para el catalogo y los
 * datasets pequenos, y una cache en memoria para las tablas de percentiles,
 * que pesan varios megabytes. Ambas mueren al cerrar la pestana.
 */

export interface CachePort {
  /** Devuelve `null` cuando no hay entrada o cuando ya vencio. */
  read<T>(key: string): Promise<T | null>;
  /** Escribe una entrada con vigencia opcional en segundos. */
  write<T>(key: string, value: T, ttlSeconds?: number): Promise<void>;
  /** Elimina una entrada puntual. */
  remove(key: string): Promise<void>;
}
