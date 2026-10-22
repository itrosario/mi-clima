/**
 * Cache de sesion.
 *
 * Guarda valores pequenos en `sessionStorage`: sobrevive a la navegacion entre
 * paginas del sitio y muere cuando se cierra la pestana, que es exactamente lo
 * que pide el proyecto. Si el navegador rechaza la escritura (modo privado,
 * cuota llena) la aplicacion sigue funcionando sin cache.
 */

import type { CachePort } from "@/domain/ports/cache";
import type { Clock } from "@/domain/ports/clock";
import { systemClock } from "@/domain/ports/clock";

interface StoredEntry {
  readonly expiresAt: number | null;
  readonly value: unknown;
}

export class SessionStorageCache implements CachePort {
  private readonly storage: Storage | undefined;
  private readonly clock: Clock;
  private readonly keyPrefix: string;

  constructor(storage: Storage | undefined, clock: Clock = systemClock, keyPrefix = "mi-clima:") {
    this.storage = storage;
    this.clock = clock;
    this.keyPrefix = keyPrefix;
  }

  async read<T>(key: string): Promise<T | null> {
    const rawEntry = this.readRawEntry(key);

    if (rawEntry === null) {
      return null;
    }

    if (rawEntry.expiresAt !== null && rawEntry.expiresAt <= this.clock.now().getTime()) {
      this.remove(key);
      return null;
    }

    return rawEntry.value as T;
  }

  async write<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      this.storage?.setItem(
        this.keyPrefix + key,
        JSON.stringify(this.buildEntry(value, ttlSeconds)),
      );
    } catch {
      // Cuota agotada o almacenamiento bloqueado: se sigue sin cache.
    }
  }

  async remove(key: string): Promise<void> {
    try {
      this.storage?.removeItem(this.keyPrefix + key);
    } catch {
      // Almacenamiento bloqueado: no hay nada que eliminar.
    }
  }

  private buildEntry(value: unknown, ttlSeconds: number | undefined): StoredEntry {
    const expiresAt =
      ttlSeconds === undefined ? null : this.clock.now().getTime() + ttlSeconds * 1000;

    return { expiresAt, value };
  }

  private readRawEntry(key: string): StoredEntry | null {
    const serializedEntry = this.readSerializedEntry(key);

    if (serializedEntry === null) {
      return null;
    }

    try {
      return JSON.parse(serializedEntry) as StoredEntry;
    } catch {
      return null;
    }
  }

  private readSerializedEntry(key: string): string | null {
    try {
      return this.storage?.getItem(this.keyPrefix + key) ?? null;
    } catch {
      return null;
    }
  }
}
