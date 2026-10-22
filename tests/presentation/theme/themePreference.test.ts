/**
 * @vitest-environment happy-dom
 */
import { describe, expect, it } from "vitest";
import type { ThemePreference } from "@/presentation/theme/themePreference";
import {
  applyThemePreference,
  cycleThemePreference,
  isThemePreference,
  readStoredThemePreference,
  resolveThemePreference,
  storeThemePreference,
  systemPrefersDark,
  themePreferences,
  themeStorageKey,
} from "@/presentation/theme/themePreference";

describe("themePreferences", () => {
  it("expone los tres modos de tema soportados", () => {
    expect(themePreferences).toEqual(["auto", "light", "dark"]);
  });
});

describe("isThemePreference", () => {
  it("acepta los modos soportados", () => {
    expect(isThemePreference("auto")).toBe(true);
    expect(isThemePreference("light")).toBe(true);
    expect(isThemePreference("dark")).toBe(true);
  });

  it("rechaza valores ausentes o desconocidos", () => {
    expect(isThemePreference(null)).toBe(false);
    expect(isThemePreference(undefined)).toBe(false);
    expect(isThemePreference("sepia")).toBe(false);
  });
});

describe("resolveThemePreference", () => {
  it("conserva la preferencia cuando es valida", () => {
    expect(resolveThemePreference("dark")).toBe("dark");
  });

  it("cau en automatico ante valores invalidos", () => {
    expect(resolveThemePreference("sepia")).toBe("auto");
    expect(resolveThemePreference(null)).toBe("auto");
  });
});

describe("readStoredThemePreference", () => {
  it("devuelve automatico cuando no hay almacenamiento", () => {
    expect(readStoredThemePreference(undefined)).toBe("auto");
  });

  it("devuelve la preferencia guardada", () => {
    const storage = window.localStorage;
    storage.setItem(themeStorageKey, "dark");

    expect(readStoredThemePreference(storage)).toBe("dark");
  });

  it("devuelve automatico cuando la preferencia guardada no es valida", () => {
    const storage = window.localStorage;
    storage.setItem(themeStorageKey, "sepia");

    expect(readStoredThemePreference(storage)).toBe("auto");
  });

  it("devuelve automatico cuando el almacenamiento falla", () => {
    const brokenStorage = {
      getItem: () => {
        throw new Error("almacenamiento no disponible");
      },
    } as unknown as Storage;

    expect(readStoredThemePreference(brokenStorage)).toBe("auto");
  });
});

describe("storeThemePreference", () => {
  it("guarda la preferencia en el almacenamiento", () => {
    const storage = window.localStorage;

    storeThemePreference(storage, "light");

    expect(storage.getItem(themeStorageKey)).toBe("light");
  });

  it("no falla cuando no hay almacenamiento", () => {
    expect(() => storeThemePreference(undefined, "dark")).not.toThrow();
  });

  it("no falla cuando el almacenamiento rechaza la escritura", () => {
    const brokenStorage = {
      setItem: () => {
        throw new Error("almacenamiento lleno");
      },
    } as unknown as Storage;

    expect(() => storeThemePreference(brokenStorage, "dark")).not.toThrow();
  });
});

describe("systemPrefersDark", () => {
  it("devuelve falso cuando no hay consulta de medios", () => {
    expect(systemPrefersDark(undefined)).toBe(false);
  });

  it("refleja la preferencia del sistema", () => {
    expect(systemPrefersDark({ matches: true } as MediaQueryList)).toBe(true);
    expect(systemPrefersDark({ matches: false } as MediaQueryList)).toBe(false);
  });
});

describe("applyThemePreference", () => {
  it("no hace nada cuando no existe el elemento raiz", () => {
    expect(() => applyThemePreference(null, "dark")).not.toThrow();
  });

  it("fija el tema claro y el oscuro en el elemento raiz", () => {
    const root = document.createElement("html");

    applyThemePreference(root, "light");
    expect(root.getAttribute("data-theme")).toBe("light");

    applyThemePreference(root, "dark");
    expect(root.getAttribute("data-theme")).toBe("dark");
  });

  it("quita el atributo en modo automatico para que resuelva el sistema", () => {
    const root = document.createElement("html");
    root.setAttribute("data-theme", "dark");

    applyThemePreference(root, "auto");

    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});

describe("cycleThemePreference", () => {
  it("rota de automatico a claro", () => {
    expect(cycleThemePreference("auto")).toBe("light");
  });

  it("rota de claro a oscuro", () => {
    expect(cycleThemePreference("light")).toBe("dark");
  });

  it("rota de oscuro a automatico", () => {
    expect(cycleThemePreference("dark")).toBe("auto");
  });

  it("vuelve a automatico ante un valor desconocido en tiempo de ejecucion", () => {
    expect(cycleThemePreference("sepia" as ThemePreference)).toBe("auto");
  });
});

describe("cobertura del almacenamiento compartido", () => {
  it("usa la misma clave de almacenamiento que el arranque del tema", () => {
    expect(themeStorageKey).toBe("mi-clima-theme");
  });

  it("escribe exactamente la clave y el valor indicados", () => {
    const writtenEntries = new Map<string, string>();
    const recordingStorage = {
      getItem: (key: string) => writtenEntries.get(key) ?? null,
      setItem: (key: string, value: string) => {
        writtenEntries.set(key, value);
      },
    } as unknown as Storage;

    storeThemePreference(recordingStorage, "dark");

    expect(writtenEntries.get("mi-clima-theme")).toBe("dark");
  });
});
