/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import type { CorridorPrefecturaView } from "@/application/prefectura/loadCorridorPrefecturaSnapshot";
import type { PrefecturaReading } from "@/domain/prefectura/types";
import { getTranslations } from "@/presentation/i18n";
import { createPrefecturaTable } from "@/presentation/rendering/prefectura";
import { createStation } from "../../support/factories";
import { createPrefecturaSnapshot } from "../../support/pageServices";

const translations = getTranslations("es");

function createView(): CorridorPrefecturaView {
  const snapshot = createPrefecturaSnapshot();

  return {
    fetchedAt: snapshot.fetchedAt,
    sourceName: snapshot.sourceName,
    readings: [
      {
        reading: snapshot.readings[0] as PrefecturaReading,
        station: createStation({ id: "34", name: "Rosario" }),
      },
    ],
  };
}

describe("createPrefecturaTable", () => {
  it("arma la tabla con nivel, variacion, tendencia y umbrales", () => {
    const table = createPrefecturaTable(document, createView(), "es", translations);

    expect(table.className).toBe("data-table-wrapper");
    expect(table.querySelector("caption")?.textContent).toBe("Alturas oficiales de Prefectura");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(1);
    expect(table.textContent).toContain("Rosario");
    expect(table.textContent).toContain("+0,03 m");
    expect(table.textContent).toContain("En ascenso");
    expect(table.textContent).toContain("5,00 m");
  });

  it("usa la raya cuando Prefectura no publica la variacion", () => {
    const view = createView();
    const reading = view.readings[0] as CorridorPrefecturaView["readings"][number];

    const table = createPrefecturaTable(
      document,
      {
        ...view,
        readings: [
          {
            ...reading,
            reading: { ...reading.reading, variationMetres: null },
          },
        ],
      },
      "es",
      translations,
    );

    expect(table.querySelector("tbody tr")?.textContent).toContain("\u2014");
  });

  it("explica cuando Prefectura no publica puertos del corredor", () => {
    const empty = createPrefecturaTable(
      document,
      { fetchedAt: new Date(), sourceName: "Prefectura", readings: [] },
      "es",
      translations,
    );

    expect(empty.textContent).toBe(
      "La Prefectura no publica alturas para las estaciones del corredor.",
    );
  });
});
