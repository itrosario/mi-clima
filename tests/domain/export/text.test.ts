import { describe, expect, it } from "vitest";
import { toText } from "@/domain/export/text";
import { createExportDataset } from "../../support/exportFixtures";

describe("toText", () => {
  it("arma un encabezado de procedencia y una tabla alineada", () => {
    const text = toText(createExportDataset());

    expect(text).toContain("Niveles del Parana\n==================");
    expect(text).toContain("Generado: 2026-10-22T12:00:00.000Z");
    expect(text).toContain("Cobertura: 2026-10-21T00:00:00.000Z a 2026-10-22T00:00:00.000Z");
    expect(text).toContain("Estaciones: 1");
    expect(text).toContain("Filas: 2");
    expect(text).toContain("Fuentes:");
    expect(text).toContain("  - INA — https://alerta.ina.gob.ar");
    expect(text).toContain("  - Open-Meteo (fuente de terceros) — https://open-meteo.com");
  });

  it("alinea las columnas al ancho del contenido mas largo", () => {
    const text = toText(createExportDataset());
    const lines = text.split("\n");

    expect(lines).toContain("Estacion  Nivel");
    expect(lines).toContain("--------  -----");
    expect(lines).toContain("Rosario   4.1");
    expect(lines).toContain("Santa Fe");
  });

  it("informa la ausencia de cobertura", () => {
    const text = toText(
      createExportDataset({ metadata: { coverageFrom: null, coverageTo: null } }),
    );

    expect(text).toContain("Cobertura: sin cobertura informada");
  });

  it("informa la ausencia de cobertura cuando falta solo un extremo", () => {
    const text = toText(createExportDataset({ metadata: { coverageTo: null } }));

    expect(text).toContain("Cobertura: sin cobertura informada");
  });

  it("cierra con un salto de linea final", () => {
    expect(toText(createExportDataset()).endsWith("\n")).toBe(true);
  });
});
