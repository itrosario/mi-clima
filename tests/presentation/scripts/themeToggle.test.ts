/**
 * @vitest-environment happy-dom
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  initThemeToggle,
  readThemeLabels,
  renderThemePreference,
  themeStatusText,
} from "@/presentation/scripts/themeToggle";
import { themeStorageKey } from "@/presentation/theme/themePreference";

beforeEach(() => {
  document.body.replaceChildren();
  document.documentElement.removeAttribute("data-theme");
  window.localStorage.clear();
});

function createToggleButton(dataset: Record<string, string> = {}): HTMLButtonElement {
  const button = document.createElement("button");
  button.setAttribute("data-theme-toggle", "");
  for (const [key, value] of Object.entries(dataset)) {
    button.dataset[key] = value;
  }

  for (const preference of ["auto", "light", "dark"]) {
    const icon = document.createElement("span");
    icon.setAttribute("data-theme-icon", preference);
    button.append(icon);
  }

  const status = document.createElement("span");
  status.setAttribute("data-theme-status", "");
  button.append(status);

  return button;
}

describe("readThemeLabels", () => {
  it("lee las etiquetas traducidas de los atributos del boton", () => {
    const button = createToggleButton({
      themeLabelAuto: "Automatico",
      themeLabelLight: "Claro",
      themeLabelDark: "Oscuro",
    });

    expect(readThemeLabels(button)).toEqual({
      auto: "Automatico",
      light: "Claro",
      dark: "Oscuro",
    });
  });

  it("usa etiquetas neutras cuando el boton no las declara", () => {
    expect(readThemeLabels(createToggleButton())).toEqual({
      auto: "auto",
      light: "light",
      dark: "dark",
    });
  });
});

describe("themeStatusText", () => {
  it("compone el prefijo y la etiqueta de la preferencia", () => {
    expect(themeStatusText("dark", "Tema", { auto: "a", light: "l", dark: "Oscuro" })).toBe(
      "Tema: Oscuro",
    );
  });
});

describe("renderThemePreference", () => {
  it("muestra solo el icono de la preferencia activa y actualiza el texto", () => {
    const button = createToggleButton();

    renderThemePreference(
      button,
      "light",
      { auto: "Automatico", light: "Claro", dark: "Oscuro" },
      "Tema",
    );

    expect(button.dataset.themePreference).toBe("light");
    expect(button.querySelector<HTMLElement>("[data-theme-icon='light']")?.hidden).toBe(false);
    expect(button.querySelector<HTMLElement>("[data-theme-icon='dark']")?.hidden).toBe(true);
    expect(button.querySelector("[data-theme-status]")?.textContent).toBe("Tema: Claro");
  });

  it("no falla cuando el boton no tiene contenedor de estado", () => {
    const button = document.createElement("button");
    button.setAttribute("data-theme-toggle", "");

    expect(() =>
      renderThemePreference(button, "dark", { auto: "a", light: "l", dark: "d" }, "Theme"),
    ).not.toThrow();
  });
});

describe("initThemeToggle", () => {
  it("no hace nada cuando el documento no tiene el boton", () => {
    document.body.innerHTML = "";

    expect(initThemeToggle(document)).toBe(false);
  });

  it("aplica la preferencia guardada al inicializarse", () => {
    window.localStorage.setItem(themeStorageKey, "dark");
    const button = createToggleButton({ themeLabelPrefix: "Tema" });
    document.body.replaceChildren(button);

    expect(initThemeToggle(document)).toBe(true);
    expect(button.querySelector("[data-theme-status]")?.textContent).toBe("Tema: dark");
    expect(button.querySelector<HTMLElement>("[data-theme-icon='dark']")?.hidden).toBe(false);
  });

  it("rota la preferencia en cada pulsacion y la persiste", () => {
    const button = createToggleButton({
      themeLabelPrefix: "Tema",
      themeLabelAuto: "Automatico",
      themeLabelLight: "Claro",
      themeLabelDark: "Oscuro",
    });
    document.body.replaceChildren(button);

    initThemeToggle(document);

    button.click();
    expect(window.localStorage.getItem(themeStorageKey)).toBe("light");
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(button.querySelector("[data-theme-status]")?.textContent).toBe("Tema: Claro");

    button.click();
    expect(window.localStorage.getItem(themeStorageKey)).toBe("dark");
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");

    button.click();
    expect(window.localStorage.getItem(themeStorageKey)).toBe("auto");
    expect(document.documentElement.hasAttribute("data-theme")).toBe(false);
  });

  it("usa un prefijo neutro cuando el boton no lo declara", () => {
    const button = createToggleButton();
    document.body.replaceChildren(button);

    initThemeToggle(document);

    expect(button.querySelector("[data-theme-status]")?.textContent).toBe("Theme: auto");
  });
});
