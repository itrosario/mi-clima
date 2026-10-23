import { describe, expect, it, vi } from "vitest";
import { loadEChartsModule } from "@/presentation/charts/echartsLoader";

vi.mock("echarts", () => ({
  init: vi.fn(),
}));

describe("loadEChartsModule", () => {
  it("carga la libreria de graficos", async () => {
    const module = await loadEChartsModule();

    expect(typeof module.init).toBe("function");
  });
});
