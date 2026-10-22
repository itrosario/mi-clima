import { describe, expect, it } from "vitest";
import {
  defaultLocale,
  isSupportedLocale,
  localeLabels,
  localizePath,
  resolveLocale,
  supportedLocales,
  switchLocalePath,
} from "../../../src/presentation/i18n/locales";

describe("supportedLocales", () => {
  it("expone castellano e ingles como unicos idiomas soportados", () => {
    expect(supportedLocales).toEqual(["es", "en"]);
  });

  it("asocia una etiqueta visible a cada idioma", () => {
    for (const locale of supportedLocales) {
      expect(localeLabels[locale]).toBe(locale.toUpperCase());
    }
  });
});

describe("isSupportedLocale", () => {
  it("acepta los idiomas soportados", () => {
    expect(isSupportedLocale("es")).toBe(true);
    expect(isSupportedLocale("en")).toBe(true);
  });

  it("rechaza cualquier otro valor", () => {
    expect(isSupportedLocale("fr")).toBe(false);
    expect(isSupportedLocale("")).toBe(false);
  });
});

describe("resolveLocale", () => {
  it("devuelve el idioma cuando esta soportado", () => {
    expect(resolveLocale("en")).toBe("en");
  });

  it("cae en el idioma por defecto ante valores ausentes o no soportados", () => {
    expect(resolveLocale(undefined)).toBe(defaultLocale);
    expect(resolveLocale(null)).toBe(defaultLocale);
    expect(resolveLocale("fr")).toBe(defaultLocale);
  });
});

describe("localizePath", () => {
  it("antepone el idioma a la raiz", () => {
    expect(localizePath("es", "/")).toBe("/es/");
  });

  it("antepone el idioma a una ruta interna", () => {
    expect(localizePath("en", "/rios/")).toBe("/en/rios/");
  });

  it("normaliza las rutas que no empiezan por barra", () => {
    expect(localizePath("en", "rios/")).toBe("/en/rios/");
  });
});

describe("switchLocalePath", () => {
  it("cambia de idioma conservando la seccion", () => {
    expect(switchLocalePath("/es/rios/", "en")).toBe("/en/rios/");
  });

  it("cambia de idioma en la raiz", () => {
    expect(switchLocalePath("/en/", "es")).toBe("/es/");
  });

  it("añade el idioma cuando la ruta no lo tiene", () => {
    expect(switchLocalePath("/", "en")).toBe("/en/");
  });

  it("cambia de idioma en una seccion profunda", () => {
    expect(switchLocalePath("/es/estadisticas/", "en")).toBe("/en/estadisticas/");
  });

  it("conserva la ausencia de barra final", () => {
    expect(switchLocalePath("/es/rios", "en")).toBe("/en/rios");
  });

  it("agrega el idioma cuando la ruta no lo tiene y no es la raiz", () => {
    expect(switchLocalePath("/estadisticas/", "en")).toBe("/en/estadisticas/");
  });
});
