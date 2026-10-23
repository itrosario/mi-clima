/**
 * Contrato comun de las paginas.
 *
 * Cada vista recibe opcionalmente el documento, los servicios ya compuestos y
 * las fabricas de graficos y mapas. En el navegador no se pasa nada y la
 * pagina arma sus propias dependencias; en las pruebas se inyectan dobles.
 */

import type { ChartRenderer } from "../charts/chartRenderer";
import type { MapController, MapMarker } from "../map/stationMap";
import type { AppServices } from "../runtime/appServices";

export type ChartFactory = (container: HTMLElement) => Promise<ChartRenderer>;

export type MapFactory = (
  container: HTMLElement,
  markers: readonly MapMarker[],
) => Promise<MapController>;

export interface PageOptions {
  readonly document?: Document;
  readonly services?: AppServices;
  readonly chartFactory?: ChartFactory;
  readonly mapFactory?: MapFactory;
}
