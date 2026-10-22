/**
 * Configuracion de idiomas del sitio.
 *
 * El sitio publica un unico arbol de rutas por idioma: `/es/...` y `/en/...`.
 */
export const supportedLocales = ["es", "en"] as const;

export type Locale = (typeof supportedLocales)[number];

export const defaultLocale: Locale = "es";

export const localeLabels: Record<Locale, string> = {
  es: "ES",
  en: "EN",
};

export function isSupportedLocale(candidate: string): candidate is Locale {
  return supportedLocales.some((locale) => locale === candidate);
}

export function resolveLocale(candidate: string | undefined | null): Locale {
  if (candidate && isSupportedLocale(candidate)) {
    return candidate;
  }
  return defaultLocale;
}

/**
 * Antepone el locale a una ruta interna sin locale.
 *
 * @example localizePath("en", "/rios/") -> "/en/rios/"
 */
export function localizePath(locale: Locale, path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  if (normalizedPath === "/") {
    return `/${locale}/`;
  }
  return `/${locale}${normalizedPath}`;
}

/**
 * Calcula la ruta equivalente en otro idioma a partir de la ruta actual.
 */
export function switchLocalePath(currentPathname: string, targetLocale: Locale): string {
  const hasTrailingSlash = currentPathname.endsWith("/");
  const segments = currentPathname.split("/").filter((segment) => segment.length > 0);

  if (segments.length > 0 && isSupportedLocale(segments[0] as string)) {
    segments.shift();
  }

  const restOfPath =
    segments.length > 0 ? `/${segments.join("/")}${hasTrailingSlash ? "/" : ""}` : "/";

  return localizePath(targetLocale, restOfPath);
}
