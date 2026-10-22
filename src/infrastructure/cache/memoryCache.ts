/**
 * Cache en memoria.
 *
 * Se usa para las tablas de percentiles, que pesan varios megabytes y no
 * entran comodamente en `sessionStorage`. Vive lo que vive la pestana: al
 * cerrarla se descarta, igual que el resto de la cache del sitio.
 */

import type { CachePort } from "@/domain/ports/cache";
import type { Clock } from "@/domain/ports/clock";
import { systemClock } from "@/domain/ports/clock";

interface MemoryEntry {
  readonly expiresAt: number | null;
  readonly value: unknown;
}

export class MemoryCache implements CachePort {
  private readonly entries = new Map<string, MemoryEntry>();
  private readonly clock: Clock;

  constructor(clock: Clock = systemClock) {
    this.clock = clock;
  }

  async read<T>(key: string): Promise<T | null> {
    const entry = this.entries.get(key);

    if (entry === undefined) {
      return null;
    }

    if (entry.expiresAt !== null && entry.expiresAt <= this.clock.now().getTime()) {
      this.entries.delete(key);
      return null;
    }

    return entry.value as T;
  }

  async write<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.entries.set(key, {
      expiresAt: ttlSeconds === undefined ? null : this.clock.now().getTime() + ttlSeconds * 1000,
      value,
    });
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
  }
}
