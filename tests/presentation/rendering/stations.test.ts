/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { getTranslations } from "@/presentation/i18n";
import { createStationCatalogue } from "@/presentation/rendering/stations";
import { createAnomalyTiles, createTrendTiles } from "@/presentation/rendering/statistics";
import { createStation } from "../../support/factories";
import { createReading } from "../../support/readingFactory";

const translations = getTranslations("es");

describe("createStationCatalogue", () => {
  it("arma una tabla navegable con rio, tramo y red", () => {
    const table = createStationCatalogue(
      document,
      [createStation({ id: "34", name: "Rosario" })],
      "es",
      translations,
    );

    expect(table.querySelector("caption")?.textContent).toBe("Todas las estaciones");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(table.querySelector("tbody a")?.getAttribute("href")).toBe("/es/estaciones/?id=34");
    expect(table.textContent).toContain("Escalas Prefectura Nacional");
  });

  it("muestra un estado vacio sin estaciones", () => {
    const empty = createStationCatalogue(document, [], "es", translations);

    expect(empty.textContent).toBe("Sin datos disponibles");
  });
});

describe("createAnomalyTiles", () => {
  it("presenta todos los indicadores de la anomalia", () => {
    const tiles = createAnomalyTiles(
      document,
      {
        observed: 5,
        expected: 4,
        absolute: 1,
        relative: 0.25,
        percentileRank: 90,
        band: "high",
      },
      "es",
      translations,
    );

    expect(tiles).toHaveLength(5);
    expect(tiles[0]?.textContent).toContain("5,00 m");
    expect(tiles[2]?.textContent).toContain("+1,00 m");
    expect(tiles[2]?.textContent).toContain("25,0 %");
    expect(tiles[3]?.textContent).toContain("90");
    expect(tiles[4]?.textContent).toContain("Por encima de lo normal");
  });

  it("usa la raya cuando la tabla no alcanza", () => {
    const tiles = createAnomalyTiles(
      document,
      {
        observed: 5,
        expected: null,
        absolute: null,
        relative: null,
        percentileRank: null,
        band: "unknown",
      },
      "es",
      translations,
    );

    expect(tiles[2]?.textContent).toContain("\u2014");
    expect(tiles[4]?.textContent).toContain("Sin clasificacion");
  });
});

describe("createTrendTiles", () => {
  it("presenta pendiente, velocidad y variabilidad", () => {
    const reading = createReading();
    const tiles = createTrendTiles(document, reading, "es", translations);

    expect(tiles).toHaveLength(4);
    expect(tiles[0]?.textContent).toContain("m/d");
    expect(tiles[2]?.textContent).toContain("m");
    expect(tiles[3]?.textContent).toContain("%");
  });

  it("usa la raya cuando la serie no alcanza", () => {
    const reading = createReading();
    const tiles = createTrendTiles(
      document,
      {
        ...reading,
        trend: {
          ...reading.trend,
          slopePerDay: null,
          rateOfChangePerDay: null,
        },
        variability: {
          ...reading.variability,
          standardDeviation: null,
          coefficientOfVariation: null,
        },
      },
      "es",
      translations,
    );

    expect(tiles[0]?.textContent).toContain("\u2014");
    expect(tiles[1]?.textContent).toContain("\u2014");
    expect(tiles[3]?.textContent).toContain("\u2014");
  });
});
