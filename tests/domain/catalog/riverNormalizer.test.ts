import { describe, expect, it } from "vitest";
import {
  curatedRiverRules,
  normalizeRiverKey,
  normalizeRiverName,
  toRiverSlug,
} from "@/domain/catalog/riverNormalizer";

describe("normalizeRiverKey", () => {
  it("pasa a mayusculas y quita acentos", () => {
    expect(normalizeRiverKey("Paraná")).toBe("PARANA");
    expect(normalizeRiverKey("Río de la Plata")).toBe("RIO DE LA PLATA");
  });

  it("colapsa puntuacion y espacios repetidos", () => {
    expect(normalizeRiverKey("  Paraná   Medio. ")).toBe("PARANA MEDIO");
    expect(normalizeRiverKey("PARANA-MEDIO")).toBe("PARANA MEDIO");
  });

  it("devuelve cadena vacia cuando el nombre solo tiene simbolos", () => {
    expect(normalizeRiverKey(" -.- ")).toBe("");
  });
});

describe("toRiverSlug", () => {
  it("convierte una clave normalizada en un identificador de URL", () => {
    expect(toRiverSlug("PARANA DE LAS PALMAS")).toBe("parana-de-las-palmas");
  });
});

describe("normalizeRiverName", () => {
  it("devuelve null cuando el origen no informa el rio", () => {
    expect(normalizeRiverName(null)).toBeNull();
    expect(normalizeRiverName(undefined)).toBeNull();
    expect(normalizeRiverName("")).toBeNull();
    expect(normalizeRiverName("   ")).toBeNull();
    expect(normalizeRiverName("...")).toBeNull();
  });

  it.each([
    ["PARANAMED", "parana", "Parana", "parana-medio", "Parana medio"],
    ["PARANAINF", "parana", "Parana", "parana-inferior", "Parana inferior"],
    ["PARANASUP", "parana", "Parana", "parana-superior", "Parana superior"],
    ["Paraná", "parana", "Parana", "parana-general", "Parana"],
    ["PARANA SUPERIOR", "parana", "Parana", "parana-superior", "Parana superior"],
    ["PARANA SUP", "parana", "Parana", "parana-superior", "Parana superior"],
    ["PARANA MEDIO", "parana", "Parana", "parana-medio", "Parana medio"],
    ["PARANA INFERIOR", "parana", "Parana", "parana-inferior", "Parana inferior"],
    ["PARANA INF", "parana", "Parana", "parana-inferior", "Parana inferior"],
    [
      "Paraná de las Palmas",
      "parana-de-las-palmas",
      "Parana de las Palmas",
      "parana-de-las-palmas",
      "Parana de las Palmas",
    ],
    ["Paraguay", "paraguay", "Paraguay", "paraguay", "Paraguay"],
    ["Uruguay", "uruguay", "Uruguay", "uruguay", "Uruguay"],
    ["Río de la Plata", "rio-de-la-plata", "Rio de la Plata", "rio-de-la-plata", "Rio de la Plata"],
    ["Bermejo", "bermejo", "Bermejo", "bermejo", "Bermejo"],
    ["Pilcomayo", "pilcomayo", "Pilcomayo", "pilcomayo", "Pilcomayo"],
    ["Salado", "salado", "Salado", "salado", "Salado"],
    [
      "Salado del Norte",
      "salado-del-norte",
      "Salado del Norte",
      "salado-del-norte",
      "Salado del Norte",
    ],
    ["Colorado", "colorado", "Colorado", "colorado", "Colorado"],
    ["Negro", "negro", "Negro", "negro", "Negro"],
    ["Dulce", "dulce", "Dulce", "dulce", "Dulce"],
    ["Limay", "limay", "Limay", "limay", "Limay"],
    ["Neuquén", "neuquen", "Neuquen", "neuquen", "Neuquen"],
    ["Santa Cruz", "santa-cruz", "Santa Cruz", "santa-cruz", "Santa Cruz"],
    ["Chubut", "chubut", "Chubut", "chubut", "Chubut"],
    ["Quequén", "quequen", "Quequen", "quequen", "Quequen"],
    ["Sauce", "sauce", "Sauce", "sauce", "Sauce"],
    ["Tercero", "tercero", "Tercero", "tercero", "Tercero"],
    ["Arrecifes", "arrecifes", "Arrecifes", "arrecifes", "Arrecifes"],
    ["Coronda", "coronda", "Coronda", "coronda", "Coronda"],
    ["Ludeña", "ludena", "Ludena", "ludena", "Ludena"],
    ["Riachuelo", "riachuelo", "Riachuelo", "riachuelo", "Riachuelo"],
    ["Itu", "itu", "Itu", "itu", "Itu"],
  ])("normaliza el rio %s al catalogo curado", (rawName, id, name, reachId, reachName) => {
    expect(normalizeRiverName(rawName)).toEqual({
      id,
      name,
      reachId,
      reachName,
      isCurated: true,
    });
  });

  it("deriva un rio no curado a partir de su nombre", () => {
    expect(normalizeRiverName("Arroyo Seco")).toEqual({
      id: "arroyo-seco",
      name: "Arroyo Seco",
      reachId: "arroyo-seco-general",
      reachName: "Tramo general",
      isCurated: false,
    });
  });

  it("mantiene el catalogo curado con patrones validos", () => {
    expect(curatedRiverRules.length).toBeGreaterThan(0);
    for (const rule of curatedRiverRules) {
      expect(rule.pattern).toBeInstanceOf(RegExp);
    }
  });
});
