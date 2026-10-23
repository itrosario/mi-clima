/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { MemoryCache } from "@/infrastructure/cache/memoryCache";
import { SessionStorageCache } from "@/infrastructure/cache/sessionStorageCache";
import { createAppServices, resolveSessionStorage } from "@/presentation/runtime/appServices";
import { FakeClock } from "../../support/applicationFakes";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("resolveSessionStorage", () => {
  it("devuelve el almacenamiento de la pestana cuando existe", () => {
    expect(resolveSessionStorage()).toBe(window.sessionStorage);
  });

  it("tolera navegadores sin sessionStorage", () => {
    vi.stubGlobal("sessionStorage", undefined);

    expect(resolveSessionStorage()).toBeUndefined();
  });
});

describe("createAppServices", () => {
  it("arma las implementaciones reales con el reloj del sistema", () => {
    const services = createAppServices();

    expect(services.catalogCache).toBeInstanceOf(SessionStorageCache);
    expect(services.percentileCache).toBeInstanceOf(MemoryCache);
    expect(typeof services.clock.now()).toBe("object");
    expect(services.catalogSource).toBeDefined();
    expect(services.hydrologySource).toBeDefined();
    expect(services.percentilesSource).toBeDefined();
    expect(services.weatherSource).toBeDefined();
    expect(services.downloadService).toBeDefined();
  });

  it("acepta almacenamiento, documento, reloj y transporte inyectados", async () => {
    const clock = new FakeClock(new Date("2026-10-22T12:00:00.000Z"));
    const fetchImplementation = vi.fn<typeof fetch>();
    const services = createAppServices({
      storage: window.sessionStorage,
      document: window.document,
      clock,
      fetchImplementation,
    });

    await services.catalogCache.write("prueba", { value: 1 });

    expect(services.clock).toBe(clock);
    expect(await services.catalogCache.read<{ value: number }>("prueba")).toEqual({ value: 1 });
    expect(services.downloadService).toBeDefined();
  });
});
