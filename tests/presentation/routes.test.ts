import { describe, expect, it } from "vitest";
import { stationHref, statisticsHref } from "@/presentation/routes";

describe("rutas internas", () => {
  it("arma el enlace a la ficha de una estacion", () => {
    expect(stationHref("es", "34")).toBe("/es/estaciones/?id=34");
  });

  it("arma el enlace a las estadisticas de una estacion", () => {
    expect(statisticsHref("en", "34")).toBe("/en/estadisticas/?id=34");
  });

  it("escapa identificadores con caracteres especiales", () => {
    expect(stationHref("es", "a b")).toBe("/es/estaciones/?id=a%20b");
  });
});
