import type { Locale } from "./locales";
import { enTranslations } from "./translations/en";
import { esTranslations, type TranslationSchema } from "./translations/es";

export type { Locale } from "./locales";
export {
  defaultLocale,
  isSupportedLocale,
  localeLabels,
  localizePath,
  resolveLocale,
  supportedLocales,
  switchLocalePath,
} from "./locales";

const dictionaries: Record<Locale, TranslationSchema> = {
  es: esTranslations,
  en: enTranslations,
};

/**
 * Devuelve el diccionario completo del idioma solicitado.
 */
export function getTranslations(locale: Locale): TranslationSchema {
  return dictionaries[locale];
}

/**
 * Sustituye marcadores del tipo `{clave}` por los valores indicados.
 *
 * @example interpolate("{count} estaciones", { count: 3 }) -> "3 estaciones"
 */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}
