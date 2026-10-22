/**
 * Preferencia de tema visual del sitio.
 *
 * El sitio admite tres modos: seguir al sistema operativo, forzar el tema
 * claro o forzar el tema oscuro. La preferencia se persiste en
 * `localStorage` para que la eleccion sobreviva a la navegacion.
 */

export const themeStorageKey = "mi-clima-theme";

export type ThemePreference = "auto" | "light" | "dark";

export const themePreferences: readonly ThemePreference[] = ["auto", "light", "dark"];

export function isThemePreference(
  candidate: string | null | undefined,
): candidate is ThemePreference {
  return (
    candidate !== null &&
    candidate !== undefined &&
    themePreferences.includes(candidate as ThemePreference)
  );
}

export function resolveThemePreference(candidate: string | null | undefined): ThemePreference {
  return isThemePreference(candidate) ? candidate : "auto";
}

export function readStoredThemePreference(storage: Storage | undefined): ThemePreference {
  if (!storage) {
    return "auto";
  }
  try {
    return resolveThemePreference(storage.getItem(themeStorageKey));
  } catch {
    return "auto";
  }
}

export function storeThemePreference(
  storage: Storage | undefined,
  preference: ThemePreference,
): void {
  if (!storage) {
    return;
  }
  try {
    storage.setItem(themeStorageKey, preference);
  } catch {
    // Almacenamiento no disponible (modo privado): la preferencia solo dura la sesion.
  }
}

export function systemPrefersDark(mediaQueryList: MediaQueryList | undefined): boolean {
  return mediaQueryList?.matches ?? false;
}

/**
 * Aplica la preferencia sobre el elemento raiz del documento.
 *
 * En modo `auto` se quita el atributo para que la hoja de estilos resuelva
 * el tema con `prefers-color-scheme`.
 */
export function applyThemePreference(root: HTMLElement | null, preference: ThemePreference): void {
  if (!root) {
    return;
  }
  if (preference === "auto") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", preference);
}

const nextThemePreference: Readonly<Record<ThemePreference, ThemePreference>> = {
  auto: "light",
  light: "dark",
  dark: "auto",
};

export function cycleThemePreference(current: ThemePreference): ThemePreference {
  // `current` puede llegar desde `localStorage`, que en tiempo de ejecucion no
  // garantiza el tipo: ante un valor desconocido se vuelve a automatico.
  return nextThemePreference[current] ?? "auto";
}
