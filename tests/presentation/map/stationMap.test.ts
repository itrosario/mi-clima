/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest";
import {
  buildMarkerPopup,
  corridorMapCenter,
  createStationMap,
  type LeafletNamespaceLike,
  type MapMarker,
  markerColors,
  openStreetMapTiles,
} from "@/presentation/map/stationMap";

const marker: MapMarker = {
  stationId: "34",
  name: "Rosario",
  latitude: -32.95,
  longitude: -60.63,
  status: "alert",
  statusLabel: "Alerta",
  detail: "5,10 m",
  href: "/es/estaciones/?id=34",
  linkLabel: "Ver detalle",
};

function createFakeLeaflet() {
  const map = { fitBounds: vi.fn(), remove: vi.fn() };
  const layer = { addTo: vi.fn() };
  layer.addTo.mockReturnValue(layer);
  const stationMarker = { addTo: vi.fn(), bindPopup: vi.fn() };
  stationMarker.addTo.mockReturnValue(stationMarker);
  stationMarker.bindPopup.mockReturnValue(stationMarker);

  const leaflet: LeafletNamespaceLike = {
    map: vi.fn(() => map),
    tileLayer: vi.fn(() => layer),
    circleMarker: vi.fn(() => stationMarker),
    latLngBounds: vi.fn((coordinates) => coordinates),
  };

  return { leaflet, map, layer, stationMarker };
}

describe("buildMarkerPopup", () => {
  it("arma el globo con nombre, estado, nivel y enlace", () => {
    const popup = buildMarkerPopup(window.document, marker);

    expect(popup.className).toBe("map-popup");
    expect(popup.querySelector(".map-popup__title")?.textContent).toBe("Rosario");
    expect(popup.querySelector(".status-badge")?.className).toBe(
      "status-badge status-badge--alert",
    );
    expect(popup.querySelector(".map-popup__detail")?.textContent).toBe("5,10 m");
    expect(popup.querySelector<HTMLAnchorElement>(".map-popup__link")?.getAttribute("href")).toBe(
      "/es/estaciones/?id=34",
    );
  });
});

describe("createStationMap", () => {
  it("dibuja el mapa, las baldosas y una marca por estacion", () => {
    const container = window.document.createElement("div");
    const { leaflet, map, layer, stationMarker } = createFakeLeaflet();
    const other = { ...marker, stationId: "35", name: "Villa", latitude: -33.2, longitude: -60.3 };

    const controller = createStationMap(container, leaflet, [marker, other]);

    expect(leaflet.map).toHaveBeenCalledWith(container, { center: corridorMapCenter, zoom: 7 });
    expect(leaflet.tileLayer).toHaveBeenCalledWith(openStreetMapTiles.url, {
      attribution: openStreetMapTiles.attribution,
      maxZoom: openStreetMapTiles.maxZoom,
    });
    expect(layer.addTo).toHaveBeenCalledWith(map);
    expect(leaflet.circleMarker).toHaveBeenCalledWith([marker.latitude, marker.longitude], {
      radius: 9,
      color: markerColors.alert,
      fillColor: markerColors.alert,
      fillOpacity: 0.85,
    });
    expect(stationMarker.addTo).toHaveBeenCalledTimes(2);
    expect(stationMarker.bindPopup).toHaveBeenCalledTimes(2);
    expect(leaflet.latLngBounds).toHaveBeenCalledWith([
      [marker.latitude, marker.longitude],
      [other.latitude, other.longitude],
    ]);
    expect(map.fitBounds).toHaveBeenCalledTimes(1);

    controller.dispose();
    expect(map.remove).toHaveBeenCalledTimes(1);
  });

  it("no ajusta la vista cuando no hay estaciones", () => {
    const container = window.document.createElement("div");
    const { leaflet, map } = createFakeLeaflet();

    createStationMap(container, leaflet, []);

    expect(map.fitBounds).not.toHaveBeenCalled();
  });
});
