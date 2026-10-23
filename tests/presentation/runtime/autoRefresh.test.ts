/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  defaultAutoRefreshMilliseconds,
  startAutoRefresh,
} from "@/presentation/runtime/autoRefresh";

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("startAutoRefresh", () => {
  it("actualiza al cumplirse el intervalo y se puede detener", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => undefined);
    const stop = startAutoRefresh({
      document: window.document,
      refresh,
      intervalMilliseconds: 1_000,
    });

    await vi.advanceTimersByTimeAsync(999);
    expect(refresh).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    expect(refresh).toHaveBeenCalledTimes(1);

    stop();
    await vi.advanceTimersByTimeAsync(2_000);
    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("no actualiza mientras la pestana esta oculta y lo hace al volver", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-22T12:00:00.000Z"));
    vi.spyOn(window.document, "visibilityState", "get").mockReturnValue("hidden");
    const refresh = vi.fn(async () => undefined);
    const stop = startAutoRefresh({
      document: window.document,
      refresh,
      intervalMilliseconds: 1_000,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    expect(refresh).not.toHaveBeenCalled();

    vi.spyOn(window.document, "visibilityState", "get").mockReturnValue("visible");
    window.document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);

    expect(refresh).toHaveBeenCalledTimes(1);
    stop();
  });

  it("tolera un fallo del refresco y sigue con el siguiente ciclo", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => {
      throw new Error("sin red");
    });
    const stop = startAutoRefresh({
      document: window.document,
      refresh,
      intervalMilliseconds: 1_000,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(refresh).toHaveBeenCalledTimes(2);
    stop();
  });

  it("se cancela cuando la pagina se descarga", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => undefined);

    const stop = startAutoRefresh({
      document: window.document,
      refresh,
      intervalMilliseconds: 1_000,
    });
    window.dispatchEvent(new Event("pagehide"));
    stop();

    await vi.advanceTimersByTimeAsync(2_000);

    expect(refresh).not.toHaveBeenCalled();
  });

  it("no se reprograma si se detiene durante el refresco", async () => {
    vi.useFakeTimers();
    let stop = (): void => undefined;
    const refresh = vi.fn(async () => {
      stop();
    });
    stop = startAutoRefresh({
      document: window.document,
      refresh,
      intervalMilliseconds: 1_000,
    });

    await vi.advanceTimersByTimeAsync(1_000);
    await vi.advanceTimersByTimeAsync(1_000);

    expect(refresh).toHaveBeenCalledTimes(1);
  });

  it("descarta un disparo que llega despues de detenerse", async () => {
    const pendingCallbacks: (() => void)[] = [];
    const view = {
      setTimeout: (handler: () => void): number => {
        pendingCallbacks.push(handler);
        return 1;
      },
      clearTimeout: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };
    const fakeDocument = {
      defaultView: view,
      visibilityState: "visible",
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    } as unknown as Document;
    const refresh = vi.fn(async () => undefined);
    const stop = startAutoRefresh({ document: fakeDocument, refresh });

    stop();
    stop();
    pendingCallbacks[0]?.();

    await Promise.resolve();

    expect(refresh).not.toHaveBeenCalled();
  });

  it("no refresca al volver si aun no paso el intervalo", async () => {
    vi.useFakeTimers();
    const refresh = vi.fn(async () => undefined);
    const stop = startAutoRefresh({
      document: window.document,
      refresh,
      intervalMilliseconds: 1_000,
    });

    window.document.dispatchEvent(new Event("visibilitychange"));
    await vi.advanceTimersByTimeAsync(0);

    expect(refresh).not.toHaveBeenCalled();
    stop();
  });

  it("no hace nada si el documento no tiene ventana", () => {
    const stop = startAutoRefresh({
      document: { defaultView: null } as unknown as Document,
      refresh: vi.fn(),
    });

    expect(stop).not.toThrow();
  });

  it("usa una hora por defecto", () => {
    expect(defaultAutoRefreshMilliseconds).toBe(3_600_000);
  });
});
