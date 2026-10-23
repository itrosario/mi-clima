/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import type { FloodSummary } from "@/domain/flood/types";
import { getTranslations } from "@/presentation/i18n";
import { evacuatingStationNames, updateEmergencyBanner } from "@/presentation/rendering/emergency";
import { createStation } from "../../support/factories";
import { createReading } from "../../support/readingFactory";

const translations = getTranslations("es");

function createSummary(evacuatingStationIds: readonly string[]): FloodSummary {
  return {
    total: evacuatingStationIds.length,
    countsByStatus: {
      low: 0,
      normal: 0,
      alert: 0,
      evacuation: evacuatingStationIds.length,
      undefined: 0,
    },
    highestStatus: evacuatingStationIds.length > 0 ? "evacuation" : "undefined",
    alertingStationIds: [],
    evacuatingStationIds,
  };
}

describe("evacuatingStationNames", () => {
  it("traduce identificadores a nombres y ordena alfabeticamente", () => {
    const readings = [
      createReading({ station: createStation({ id: "34", name: "Rosario" }) }),
      createReading({ station: createStation({ id: "35", name: "Villa Constitucion" }) }),
    ];

    expect(evacuatingStationNames(createSummary(["35", "34"]), readings)).toEqual([
      "Rosario",
      "Villa Constitucion",
    ]);
  });

  it("conserva el identificador cuando no hay lectura de esa estacion", () => {
    expect(evacuatingStationNames(createSummary(["999"]), [])).toEqual(["999"]);
  });
});

describe("updateEmergencyBanner", () => {
  it("muestra el aviso con las estaciones evacuadas", () => {
    document.body.innerHTML = `
      <div data-emergency-banner hidden>
        <p data-emergency-message></p>
      </div>
    `;

    updateEmergencyBanner(document, ["Rosario"], translations);

    const banner = document.querySelector<HTMLElement>("[data-emergency-banner]");
    expect(banner?.hidden).toBe(false);
    expect(document.querySelector("[data-emergency-message]")?.textContent).toContain("Rosario");
  });

  it("oculta el aviso cuando no hay evacuaciones", () => {
    document.body.innerHTML = `
      <div data-emergency-banner>
        <p data-emergency-message></p>
      </div>
    `;

    updateEmergencyBanner(document, [], translations);

    expect(document.querySelector<HTMLElement>("[data-emergency-banner]")?.hidden).toBe(true);
  });

  it("funciona aunque la vista no tenga el aviso", () => {
    document.body.innerHTML = "";

    updateEmergencyBanner(document, ["Rosario"], translations);

    expect(document.body.childElementCount).toBe(0);
  });

  it("muestra el aviso aunque falte el mensaje interno", () => {
    document.body.innerHTML = "<div data-emergency-banner hidden></div>";

    updateEmergencyBanner(document, ["Rosario"], translations);

    expect(document.querySelector<HTMLElement>("[data-emergency-banner]")?.hidden).toBe(false);
  });
});
