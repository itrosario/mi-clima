/**
 * Carga diferida de Leaflet.
 *
 * Solo el mapa de alertas necesita la libreria. Se importa al inicializar la
 * pagina y su hoja de estilos viaja con el mismo paquete.
 */

import type { LeafletNamespaceLike } from "./stationMap";

export async function loadLeafletModule(): Promise<LeafletNamespaceLike> {
  const module = await import("leaflet");

  return module.default as unknown as LeafletNamespaceLike;
}
