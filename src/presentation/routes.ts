/**
 * Rutas internas del sitio.
 *
 * Los enlaces se arman en un solo lugar para que el idioma y los parametros
 * de consulta no se dupliquen entre controladores y bloques de render.
 */

import type { StationId } from "@/domain/catalog/types";
import type { Locale } from "./i18n/locales";

export function stationHref(locale: Locale, stationId: StationId): string {
  return `/${locale}/estaciones/?id=${encodeURIComponent(stationId)}`;
}

export function statisticsHref(locale: Locale, stationId: StationId): string {
  return `/${locale}/estadisticas/?id=${encodeURIComponent(stationId)}`;
}
