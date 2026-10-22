import { describe, expect, it } from "vitest";
import type { Clock } from "@/domain/ports/clock";
import { MemoryCache } from "@/infrastructure/cache/memoryCache";

class MutableClock implements Clock {
  current = new Date("2026-10-22T12:00:00.000Z");

  now(): Date {
    return this.current;
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

describe("MemoryCache", () => {
  it("guarda y recupera un valor", async () => {
    const cache = new MemoryCache();

    await cache.write("clave", { valor: 1 });

    await expect(cache.read<{ valor: number }>("clave")).resolves.toEqual({ valor: 1 });
  });

  it("devuelve null cuando la clave no existe", async () => {
    const cache = new MemoryCache();

    await expect(cache.read("ausente")).resolves.toBeNull();
  });

  it("vence la entrada cuando pasa el tiempo de vida", async () => {
    const clock = new MutableClock();
    const cache = new MemoryCache(clock);

    await cache.write("clave", "valor", 60);
    clock.advance(60_001);

    await expect(cache.read("clave")).resolves.toBeNull();
  });

  it("conserva la entrada mientras el tiempo de vida no vencio", async () => {
    const clock = new MutableClock();
    const cache = new MemoryCache(clock);

    await cache.write("clave", "valor", 60);
    clock.advance(59_000);

    await expect(cache.read("clave")).resolves.toBe("valor");
  });

  it("no vence las entradas sin tiempo de vida", async () => {
    const clock = new MutableClock();
    const cache = new MemoryCache(clock);

    await cache.write("clave", "valor");
    clock.advance(365 * 24 * 60 * 60 * 1000);

    await expect(cache.read("clave")).resolves.toBe("valor");
  });

  it("elimina una entrada a pedido", async () => {
    const cache = new MemoryCache();

    await cache.write("clave", "valor");
    await cache.remove("clave");

    await expect(cache.read("clave")).resolves.toBeNull();
  });
});
