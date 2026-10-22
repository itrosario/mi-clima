/**
 * Puerto de catalogo de estaciones.
 *
 * La capa de aplicacion pide el catalogo; la infraestructura decide de donde
 * sale (INA, cache, fixture).
 */

import type { Station } from "../catalog/types";

export interface StationCatalogSource {
  fetchStations(signal?: AbortSignal): Promise<readonly Station[]>;
}
