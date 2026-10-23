/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { loadLeafletModule } from "@/presentation/map/leafletLoader";

describe("loadLeafletModule", () => {
  it("carga la libreria de mapas", async () => {
    const module = await loadLeafletModule();

    expect(typeof module.map).toBe("function");
    expect(typeof module.circleMarker).toBe("function");
  });
});
