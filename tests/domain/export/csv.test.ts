import { describe, expect, it } from "vitest";
import { escapeCsvCell, toCsv } from "@/domain/export/csv";
import { createExportDataset } from "../../support/exportFixtures";

describe("escapeCsvCell", () => {
  it("deja pasar los valores simples", () => {
    expect(escapeCsvCell("Rosario")).toBe("Rosario");
    expect(escapeCsvCell(4.1)).toBe("4.1");
    expect(escapeCsvCell(0)).toBe("0");
  });

  it("convierte null en campo vacio", () => {
    expect(escapeCsvCell(null)).toBe("");
  });

  it("encierra entre comillas los valores con separador", () => {
    expect(escapeCsvCell("Rosario;Santa Fe")).toBe('"Rosario;Santa Fe"');
  });

  it("duplica las comillas internas", () => {
    expect(escapeCsvCell('dice "hola"')).toBe('"dice ""hola"""');
  });

  it("encierra los valores con saltos de linea", () => {
    expect(escapeCsvCell("linea 1\nlinea 2")).toBe('"linea 1\nlinea 2"');
    expect(escapeCsvCell("linea 1\rlinea 2")).toBe('"linea 1\rlinea 2"');
  });
});

describe("toCsv", () => {
  it("genera encabezado, filas y BOM con separador punto y coma", () => {
    const csv = toCsv(createExportDataset());

    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toBe("\uFEFFEstacion;Nivel\r\nRosario;4.1\r\nSanta Fe;\r\n");
  });

  it("respeta el orden de las columnas del dataset", () => {
    const csv = toCsv(
      createExportDataset({
        table: {
          columns: [
            { key: "value", label: "Nivel" },
            { key: "station", label: "Estacion" },
          ],
          rows: [{ station: "Rosario", value: 4.1 }],
        },
      }),
    );

    expect(csv).toContain("Nivel;Estacion");
    expect(csv).toContain("4.1;Rosario");
  });

  it("completa con campo vacio las columnas ausentes en una fila", () => {
    const csv = toCsv(
      createExportDataset({
        table: {
          columns: [
            { key: "station", label: "Estacion" },
            { key: "missing", label: "Faltante" },
          ],
          rows: [{ station: "Rosario" }],
        },
      }),
    );

    expect(csv).toContain("Rosario;");
  });
});
