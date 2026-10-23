/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { createChartRenderer, type EChartsModuleLike } from "@/presentation/charts/chartRenderer";

function createFakeModule() {
  const instance = {
    setOption: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const module: EChartsModuleLike = { init: vi.fn(() => instance) };

  return { module, instance };
}

function installFakeResizeObserver() {
  const observe = vi.fn();
  const disconnect = vi.fn();
  const callbacks: (() => void)[] = [];

  class FakeResizeObserver {
    constructor(callback: () => void) {
      callbacks.push(callback);
    }

    readonly observe = observe;
    readonly disconnect = disconnect;
  }

  vi.stubGlobal("ResizeObserver", FakeResizeObserver);

  return {
    trigger: () => callbacks[0]?.(),
    observe,
    disconnect,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("createChartRenderer", () => {
  it("delega el dibujo, el redimensionado y la liberacion", () => {
    const observer = installFakeResizeObserver();
    const container = window.document.createElement("div");
    const { module, instance } = createFakeModule();

    const renderer = createChartRenderer(container, module);
    const option = { series: [] };

    renderer.render(option);
    renderer.resize();
    observer.trigger();
    renderer.dispose();

    expect(module.init).toHaveBeenCalledWith(container);
    expect(observer.observe).toHaveBeenCalledWith(container);
    expect(instance.setOption).toHaveBeenCalledWith(option);
    expect(instance.resize).toHaveBeenCalledTimes(2);
    expect(observer.disconnect).toHaveBeenCalledTimes(1);
    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });
});
