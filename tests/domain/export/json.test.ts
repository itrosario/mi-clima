import { describe, expect, it } from "vitest";
import { toJson } from "@/domain/export/json";
import { createExportDataset } from "../../support/exportFixtures";

describe("toJson", () => {
  it("incluye metadatos, columnas y filas", () => {
    const payload = JSON.parse(toJson(createExportDataset())) as Record<string, unknown>;

    expect(payload).toMatchObject({
      title: "Niveles del Parana",
      generatedAt: "2026-10-22T12:00:00.000Z",
      coverage: {
        from: "2026-10-21T00:00:00.000Z",
        to: "2026-10-22T00:00:00.000Z",
      },
      rowCount: 2,
      stationCount: 1,
      columns: ["station", "value"],
      rows: [
        { station: "Rosario", value: 4.1 },
        { station: "Santa Fe", value: null },
      ],
    });
  });

  it("informa las fuentes con su caracter oficial o de terceros", () => {
    const payload = JSON.parse(toJson(createExportDataset())) as {
      sources: readonly { name: string; url: string; isThirdParty: boolean }[];
    };

    expect(payload.sources).toEqual([
      { name: "INA", url: "https://alerta.ina.gob.ar", isThirdParty: false },
      { name: "Open-Meteo", url: "https://open-meteo.com", isThirdParty: true },
    ]);
  });

  it("deja la cobertura en null cuando no hay fechas", () => {
    const payload = JSON.parse(
      toJson(createExportDataset({ metadata: { coverageFrom: null, coverageTo: null } })),
    ) as { coverage: { from: string | null; to: string | null } };

    expect(payload.coverage).toEqual({ from: null, to: null });
  });

  it("termina con salto de linea para que el archivo sea estable en git", () => {
    const json = toJson(createExportDataset());

    expect(json.endsWith("}\n")).toBe(true);
    expect(json).toContain("\n  ");
  });

  it("no comparte referencias con las filas del dataset", () => {
    const dataset = createExportDataset();
    const payload = JSON.parse(toJson(dataset)) as { rows: Record<string, unknown>[] };

    (payload.rows[0] as Record<string, unknown>).value = "mutado";

    expect(dataset.table.rows[0]?.value).toBe(4.1);
  });
});
