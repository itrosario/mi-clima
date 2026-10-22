import { describe, expect, it } from "vitest";
import type { Clock } from "@/domain/ports/clock";
import { SessionStorageCache } from "@/infrastructure/cache/sessionStorageCache";

class MutableClock implements Clock {
  current = new Date("2026-10-22T12:00:00.000Z");

  now(): Date {
    return this.current;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

class FakeStorage implements Storage {
  private readonly entries = new Map<string, string>();

  get length(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
  }

  getItem(key: string): string | null {
    return this.entries.get(key) ?? null;
  }

  key(index: number): string | null {
    return [...this.entries.keys()][index] ?? null;
  }

  removeItem(key: string): void {
    this.entries.delete(key);
  }

  setItem(key: string, value: string): void {
    this.entries.set(key, value);
  }
}

class BrokenStorage implements Storage {
  get length(): number {
    return 0;
  }

  clear(): void {
    throw new Error("bloqueado");
  }

  getItem(): string | null {
    throw new Error("bloqueado");
  }

  key(): string | null {
    throw new Error("bloqueado");
  }

  removeItem(): void {
    throw new Error("bloqueado");
  }

  setItem(): void {
    throw new Error("bloqueado");
  }
}

describe("SessionStorageCache", () => {
  it("guarda y recupera un valor con el prefijo del sitio", async () => {
    const storage = new FakeStorage();
    const cache = new SessionStorageCache(storage);

    await cache.write("catalogo", { estaciones: 6 });

    expect(storage.getItem("mi-clima:catalogo")).toContain("estaciones");
    await expect(cache.read<{ estaciones: number }>("catalogo")).resolves.toEqual({
      estaciones: 6,
    });
  });

  it("devuelve null cuando la clave no existe", async () => {
    const cache = new SessionStorageCache(new FakeStorage());

    await expect(cache.read("ausente")).resolves.toBeNull();
  });

  it("vence la entrada cuando pasa el tiempo de vida", async () => {
    const clock = new MutableClock();
    const storage = new FakeStorage();
    const cache = new SessionStorageCache(storage, clock);

    await cache.write("clave", "valor", 30);
    clock.advance(30_001);

    await expect(cache.read("clave")).resolves.toBeNull();
    expect(storage.getItem("mi-clima:clave")).toBeNull();
  });

  it("no vence las entradas sin tiempo de vida", async () => {
    const clock = new MutableClock();
    const cache = new SessionStorageCache(new FakeStorage(), clock);

    await cache.write("clave", "valor");
    clock.advance(365 * 24 * 60 * 60 * 1000);

    await expect(cache.read("clave")).resolves.toBe("valor");
  });

  it("descarta una entrada ilegible", async () => {
    const storage = new FakeStorage();
    storage.setItem("mi-clima:rota", "{no es json");
    const cache = new SessionStorageCache(storage);

    await expect(cache.read("rota")).resolves.toBeNull();
  });

  it("elimina una entrada a pedido", async () => {
    const storage = new FakeStorage();
    const cache = new SessionStorageCache(storage);

    await cache.write("clave", "valor");
    await cache.remove("clave");

    await expect(cache.read("clave")).resolves.toBeNull();
  });

  it("funciona sin almacenamiento disponible", async () => {
    const cache = new SessionStorageCache(undefined);

    await expect(cache.write("clave", "valor")).resolves.toBeUndefined();
    await expect(cache.read("clave")).resolves.toBeNull();
    await expect(cache.remove("clave")).resolves.toBeUndefined();
  });

  it("tolera un almacenamiento bloqueado", async () => {
    const cache = new SessionStorageCache(new BrokenStorage());

    await expect(cache.write("clave", "valor", 60)).resolves.toBeUndefined();
    await expect(cache.read("clave")).resolves.toBeNull();
    await expect(cache.remove("clave")).resolves.toBeUndefined();
  });
});
