/**
 * Mapa de estaciones sobre OpenStreetMap.
 *
 * El modulo declara solo la parte de la API de Leaflet que usa el sitio. Cada
 * estacion se dibuja como un circulo del color del semaforo y su globo se arma
 * con nodos del documento, nunca con HTML interpolado.
 */

import type { FloodStatus } from "@/domain/flood/types";
import { createTextElement } from "../runtime/dom";

export interface MapMarker {
  readonly stationId: string;
  readonly name: string;
  readonly latitude: number;
  readonly longitude: number;
  readonly status: FloodStatus;
  readonly statusLabel: string;
  readonly detail: string;
  readonly href: string;
  readonly linkLabel: string;
}

export interface LeafletMarkerLike {
  addTo(target: LeafletMapLike): LeafletMarkerLike;
  bindPopup(content: HTMLElement): LeafletMarkerLike;
}

export interface LeafletMapLike {
  fitBounds(bounds: unknown): void;
  invalidateSize(): void;
  remove(): void;
}

export interface LeafletLayerLike {
  addTo(map: LeafletMapLike): LeafletLayerLike;
}

export interface LeafletNamespaceLike {
  map(container: HTMLElement, options: { center: [number, number]; zoom: number }): LeafletMapLike;
  tileLayer(url: string, options: { attribution: string; maxZoom: number }): LeafletLayerLike;
  circleMarker(
    coordinates: [number, number],
    options: { radius: number; color: string; fillColor: string; fillOpacity: number },
  ): LeafletMarkerLike;
  latLngBounds(coordinates: readonly [number, number][]): unknown;
}

export interface MapController {
  dispose(): void;
}

/** Centro del corredor Rosario - Corrientes. */
export const corridorMapCenter: [number, number] = [-31.6, -60.7];

export const openStreetMapTiles = {
  url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution: "&copy; colaboradores de OpenStreetMap",
  maxZoom: 18,
};

export const markerColors: Record<FloodStatus, string> = {
  evacuation: "#b3261e",
  alert: "#9a6400",
  normal: "#167a5b",
  low: "#3d6fb4",
  undefined: "#64747d",
};

export function buildMarkerPopup(document: Document, marker: MapMarker): HTMLElement {
  const popup = document.createElement("div");
  popup.className = "map-popup";

  const title = createTextElement(document, "strong", "map-popup__title", marker.name);
  title.id = `map-popup-title-${marker.stationId}`;

  const status = createTextElement(
    document,
    "span",
    `status-badge status-badge--${marker.status}`,
    marker.statusLabel,
  );
  const detail = createTextElement(document, "span", "map-popup__detail", marker.detail);

  const link = document.createElement("a");
  link.className = "map-popup__link";
  link.href = marker.href;
  link.textContent = marker.linkLabel;

  popup.append(title, status, detail, link);

  return popup;
}

export function createStationMap(
  container: HTMLElement,
  leaflet: LeafletNamespaceLike,
  markers: readonly MapMarker[],
): MapController {
  const document = container.ownerDocument;
  const map = leaflet.map(container, { center: corridorMapCenter, zoom: 7 });
  const resizeObserver = new ResizeObserver(() => {
    map.invalidateSize();
  });
  resizeObserver.observe(container);

  leaflet
    .tileLayer(openStreetMapTiles.url, {
      attribution: openStreetMapTiles.attribution,
      maxZoom: openStreetMapTiles.maxZoom,
    })
    .addTo(map);

  for (const marker of markers) {
    const color = markerColors[marker.status];
    leaflet
      .circleMarker([marker.latitude, marker.longitude], {
        radius: 9,
        color,
        fillColor: color,
        fillOpacity: 0.85,
      })
      .addTo(map)
      .bindPopup(buildMarkerPopup(document, marker));
  }

  if (markers.length > 0) {
    map.fitBounds(
      leaflet.latLngBounds(markers.map((marker) => [marker.latitude, marker.longitude])),
    );
  }

  return {
    dispose: () => {
      resizeObserver.disconnect();
      map.remove();
    },
  };
}
