/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest";
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

describe("createChartRenderer", () => {
  it("delega el dibujo, el redimensionado y la liberacion", () => {
    const container = window.document.createElement("div");
    const { module, instance } = createFakeModule();

    const renderer = createChartRenderer(container, module);
    const option = { series: [] };

    renderer.render(option);
    renderer.resize();
    renderer.dispose();

    expect(module.init).toHaveBeenCalledWith(container);
    expect(instance.setOption).toHaveBeenCalledWith(option);
    expect(instance.resize).toHaveBeenCalledTimes(1);
    expect(instance.dispose).toHaveBeenCalledTimes(1);
  });
});
