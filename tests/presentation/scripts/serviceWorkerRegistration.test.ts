import { describe, expect, it, vi } from "vitest";
import { registerServiceWorker } from "@/presentation/scripts/serviceWorkerRegistration";

describe("registerServiceWorker", () => {
  it("no falla cuando el navegador no soporta service workers", () => {
    expect(() => registerServiceWorker(undefined)).not.toThrow();
  });

  it("registra el service worker del sitio", () => {
    const register = vi.fn(async () => ({}) as ServiceWorkerRegistration);

    registerServiceWorker({ register });

    expect(register).toHaveBeenCalledWith("/service-worker.js");
  });

  it("tolera un registro rechazado sin romper la pagina", async () => {
    const register = vi.fn(async () => {
      throw new Error("sin service worker");
    });

    registerServiceWorker({ register });

    await Promise.resolve();
    await Promise.resolve();
    expect(register).toHaveBeenCalledWith("/service-worker.js");
  });
});
