/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { createStationCard, type StationCardLabels } from "@/presentation/rendering/stationCard";
import { createReading } from "../../support/readingFactory";

const labels: StationCardLabels = {
  level: "Nivel",
  alertThreshold: "Alerta",
  trend: "Tendencia",
  updatedAt: "Actualizado",
  detail: "Ver detalle",
  status: {
    low: "Aguas bajas",
    normal: "Normal",
    alert: "Alerta",
    evacuation: "Evacuacion",
    undefined: "Sin umbral",
  },
  trendDirection: {
    rising: "En ascenso",
    falling: "En descenso",
    steady: "Estable",
    unknown: "Sin tendencia",
  },
};

describe("createStationCard", () => {
  it("resume nivel, umbral y tendencia de la estacion", () => {
    const card = createStationCard(window.document, {
      reading: createReading(),
      locale: "es",
      labels,
      unit: "m",
      detailHref: "/es/estaciones/?id=34",
    });

    expect(card.dataset.stationId).toBe("34");
    expect(card.querySelector(".station-card__name")?.textContent).toBe("Rosario");
    expect(card.querySelector(".status-badge")?.textContent).toBe("Alerta");
    expect(card.querySelector(".station-card__meta")?.textContent).toBe(
      "Parana \u00b7 Parana medio",
    );
    expect(card.textContent).toContain("5,10 m");
    expect(card.textContent).toContain("5,00 m");
    expect(card.textContent).toContain("En ascenso");
    expect(card.textContent).toContain("m/d");
    expect(card.querySelector(".station-card__updated")?.textContent).toContain("Actualizado:");
    expect(card.querySelector<HTMLAnchorElement>(".station-card__link")?.getAttribute("href")).toBe(
      "/es/estaciones/?id=34",
    );
    expect(card.querySelector<HTMLAnchorElement>(".station-card__link")?.textContent).toBe(
      "Ver detalle",
    );
  });

  it("informa una estacion sin umbrales ni datos", () => {
    const card = createStationCard(window.document, {
      reading: createReading({ points: [] }),
      locale: "es",
      labels,
      unit: "m",
      detailHref: "/es/estaciones/?id=34",
    });

    expect(card.querySelector(".status-badge")?.textContent).toBe("Sin umbral");
    expect(card.textContent).toContain("Sin tendencia");
    expect(card.textContent).not.toContain("m/d");
    expect(card.querySelector(".station-card__updated")?.textContent).toContain("\u2014");
  });
});
