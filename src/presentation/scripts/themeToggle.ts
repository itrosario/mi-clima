/**
 * Control del selector de tema visual.
 *
 * El boton se renderiza en el HTML y este modulo lo mejora cuando el
 * JavaScript esta disponible: rota la preferencia, la persiste y actualiza el
 * icono y el texto accesible.
 *
 * Se carga como modulo externo (sin scripts embebidos en el HTML) y no
 * depende de ningun framework.
 */

import {
  applyThemePreference,
  cycleThemePreference,
  readStoredThemePreference,
  storeThemePreference,
  type ThemePreference,
} from "../theme/themePreference";

const defaultLabels: Readonly<Record<ThemePreference, string>> = {
  auto: "auto",
  light: "light",
  dark: "dark",
};

/**
 * Etiquetas visibles para cada preferencia.
 *
 * Se leen de atributos `data-*` del boton porque el idioma lo resuelve el
 * generador del sitio, no este modulo.
 */
export function readThemeLabels(button: HTMLElement): Readonly<Record<ThemePreference, string>> {
  return {
    auto: button.dataset.themeLabelAuto ?? defaultLabels.auto,
    light: button.dataset.themeLabelLight ?? defaultLabels.light,
    dark: button.dataset.themeLabelDark ?? defaultLabels.dark,
  };
}

export function themeStatusText(
  preference: ThemePreference,
  prefix: string,
  labels: Readonly<Record<ThemePreference, string>>,
): string {
  return `${prefix}: ${labels[preference]}`;
}

/**
 * Refleja la preferencia en el boton: oculta los iconos que no corresponden y
 * actualiza el texto para lectores de pantalla.
 */
export function renderThemePreference(
  button: HTMLElement,
  preference: ThemePreference,
  labels: Readonly<Record<ThemePreference, string>>,
  prefix: string,
): void {
  const status = button.querySelector<HTMLElement>("[data-theme-status]");
  if (status) {
    status.textContent = themeStatusText(preference, prefix, labels);
  }

  button.dataset.themePreference = preference;

  for (const icon of button.querySelectorAll<HTMLElement>("[data-theme-icon]")) {
    icon.hidden = icon.dataset.themeIcon !== preference;
  }
}

/**
 * Conecta el boton del tema si esta presente en el documento.
 *
 * Devuelve `true` cuando encontro el boton, util para las pruebas.
 */
export function initThemeToggle(documentRoot: Document = document): boolean {
  const button = documentRoot.querySelector<HTMLElement>("[data-theme-toggle]");
  if (!button) {
    return false;
  }

  const labels = readThemeLabels(button);
  const prefix = button.dataset.themeLabelPrefix ?? "Theme";
  let preference = readStoredThemePreference(documentRoot.defaultView?.localStorage);

  renderThemePreference(button, preference, labels, prefix);

  button.addEventListener("click", () => {
    preference = cycleThemePreference(preference);
    storeThemePreference(documentRoot.defaultView?.localStorage, preference);
    applyThemePreference(documentRoot.documentElement, preference);
    renderThemePreference(button, preference, labels, prefix);
  });

  return true;
}
