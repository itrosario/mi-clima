import { describe, expect, it } from "vitest";
import { getTranslations, interpolate } from "../../../src/presentation/i18n";
import { enTranslations } from "../../../src/presentation/i18n/translations/en";
import { esTranslations } from "../../../src/presentation/i18n/translations/es";

type DictionaryValue = string | { [key: string]: DictionaryValue };

function flattenDictionary(
  dictionary: Record<string, DictionaryValue>,
  prefix = "",
): Record<string, string> {
  const flattened: Record<string, string> = {};

  for (const [key, value] of Object.entries(dictionary)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === "string") {
      flattened[path] = value;
      continue;
    }
    Object.assign(flattened, flattenDictionary(value, path));
  }

  return flattened;
}

describe("getTranslations", () => {
  it("devuelve el diccionario castellano", () => {
    expect(getTranslations("es").site.title).toBe("Mi Clima");
  });

  it("devuelve el diccionario ingles", () => {
    expect(getTranslations("en").site.title).toBe("My Climate");
  });
});

describe("paridad de diccionarios", () => {
  it("expone exactamente las mismas claves en ambos idiomas", () => {
    const spanishKeys = Object.keys(flattenDictionary(esTranslations)).sort();
    const englishKeys = Object.keys(flattenDictionary(enTranslations)).sort();

    expect(englishKeys).toEqual(spanishKeys);
  });

  it("no deja ninguna cadena vacia", () => {
    for (const [path, value] of Object.entries(flattenDictionary(esTranslations))) {
      expect(value.trim(), `es.${path} esta vacia`).not.toBe("");
    }
    for (const [path, value] of Object.entries(flattenDictionary(enTranslations))) {
      expect(value.trim(), `en.${path} esta vacia`).not.toBe("");
    }
  });
});

describe("interpolate", () => {
  it("sustituye los marcadores por los valores indicados", () => {
    expect(interpolate("{count} estaciones", { count: 3 })).toBe("3 estaciones");
  });

  it("sustituye varios marcadores en la misma plantilla", () => {
    expect(interpolate("{a} de {b}", { a: "Rosario", b: "Parana" })).toBe("Rosario de Parana");
  });

  it("conserva el marcador cuando no hay valor para la clave", () => {
    expect(interpolate("{count} estaciones", {})).toBe("{count} estaciones");
  });

  it("acepta valores no numericos", () => {
    expect(interpolate("{name}", { name: "Rosario" })).toBe("Rosario");
  });
});
