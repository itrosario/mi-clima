/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { loadStationReadings } from "@/application/station/loadStationReadings";
import { getTranslations } from "@/presentation/i18n";
import type { MapMarker } from "@/presentation/map/stationMap";
import {
  buildStationMarkers,
  sortReadingsBySeverity,
  startAlertsPage,
} from "@/presentation/pages/alerts";
import { requireElement } from "@/presentation/runtime/dom";
import { FakeHydrologySource } from "../../support/applicationFakes";
import { createStation, createThresholds } from "../../support/factories";
import { corridorSeries, createPageServices } from "../../support/pageServices";

const alertsMarkup = `
  <div data-emergency-banner hidden><p data-emergency-message></p></div>
  <form data-range-form>
    <input name="from" />
    <input name="to" />
    <button type="submit">Aplicar</button>
  </form>
  <div data-range-summary></div>
  <div data-summary-tiles></div>
  <div data-alert-cards></div>
  <div data-status-legend></div>
  <div data-station-map></div>
  <div data-prefectura-table></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(): Document {
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = alertsMarkup;

  return window.document;
}

function createStations() {
  return [
    createStation({
      id: "19",
      name: "Corrientes",
      thresholds: createThresholds({ alert: 5, evacuation: 5.25 }),
    }),
    createStation({
      id: "29",
      name: "Parana",
      thresholds: createThresholds({ alert: 4 }),
    }),
    createStation({ id: "30", name: "Santa Fe" }),
    createStation({ id: "33", name: "San Lorenzo" }),
    createStation({ id: "34", name: "Rosario" }),
    createStation({
      id: "35",
      name: "Villa Constitucion",
      location: null,
      thresholds: createThresholds({ lowWater: null, alert: null, evacuation: null }),
    }),
  ];
}

function createHydrology() {
  return new FakeHydrologySource({
    "19": corridorSeries("19", 5.4),
    "29": corridorSeries("29", 4.5),
    "30": corridorSeries("30", 1),
    "33": corridorSeries("33", 3),
    "34": corridorSeries("34", 3.5),
    "35": corridorSeries("35", 2),
  });
}

function createMapFactory() {
  const dispose = vi.fn();
  const factory = vi.fn(async (_container: HTMLElement, _markers: readonly MapMarker[]) => ({
    dispose,
  }));

  return { factory, dispose };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("sortReadingsBySeverity", () => {
  it("ordena de evacuacion a sin umbral", async () => {
    const readings = await loadStationReadings(
      { stations: createStations(), range: { from: new Date(), to: new Date() } },
      { hydrologySource: createHydrology(), clock: { now: () => new Date() } },
    );

    expect(sortReadingsBySeverity(readings).map((reading) => reading.station.id)).toEqual([
      "19",
      "29",
      "30",
      "33",
      "34",
      "35",
    ]);
  });
});

describe("buildStationMarkers", () => {
  it("descarta estaciones sin ubicacion", async () => {
    const readings = await loadStationReadings(
      { stations: createStations(), range: { from: new Date(), to: new Date() } },
      { hydrologySource: createHydrology(), clock: { now: () => new Date() } },
    );
    const markers = buildStationMarkers(readings, "es", getTranslations("es"));

    expect(markers).toHaveLength(5);
    expect(markers[0]?.stationId).toBe("19");
    expect(markers[0]?.detail).toContain("5,40 m");
  });
});

describe("startAlertsPage", () => {
  it("dibuja tarjetas ordenadas, leyenda, mapa y alturas de Prefectura", async () => {
    const document = prepareDocument();
    const map = createMapFactory();

    await startAlertsPage({
      document,
      services: createPageServices({ stations: createStations(), hydrology: createHydrology() }),
      mapFactory: map.factory,
    });

    const cards = [...requireElement(document, "[data-alert-cards]").querySelectorAll("h3")];
    expect(cards.map((card) => card.textContent)).toEqual([
      "Corrientes",
      "Parana",
      "Santa Fe",
      "San Lorenzo",
      "Rosario",
      "Villa Constitucion",
    ]);
    expect(requireElement(document, "[data-status-legend]").childElementCount).toBe(5);
    expect(requireElement(document, "[data-prefectura-table]").textContent).toContain("Rosario");
    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(true);
    expect(requireElement<HTMLElement>(document, "[data-emergency-banner]").hidden).toBe(false);
    expect(map.factory).toHaveBeenCalledTimes(1);
    expect(map.factory.mock.calls[0]?.[1]).toHaveLength(5);
  });

  it("explica cuando Prefectura no responde, sin romper el resto", async () => {
    const document = prepareDocument();

    await startAlertsPage({
      document,
      services: createPageServices({
        prefectura: {
          async fetchSnapshot() {
            throw new Error("proxy caido");
          },
        },
      }),
    });

    expect(requireElement(document, "[data-prefectura-table]").textContent).toBe(
      "No se pudieron obtener las alturas de Prefectura en este momento.",
    );
    expect(requireElement(document, "[data-alert-cards]").childElementCount).toBeGreaterThan(0);
  });

  it("avisa cuando el mapa no se puede inicializar", async () => {
    const document = prepareDocument();

    await startAlertsPage({
      document,
      services: createPageServices(),
      mapFactory: async () => {
        throw new Error("sin leaflet");
      },
    });

    expect(requireElement(document, "[data-station-map]").textContent).toBe(
      "El mapa no esta disponible en este momento.",
    );
  });

  it("vuelve a consultar y reemplaza el mapa al enviar el formulario", async () => {
    const document = prepareDocument();
    const map = createMapFactory();

    await startAlertsPage({
      document,
      services: createPageServices(),
      mapFactory: map.factory,
    });

    const form = requireElement<HTMLFormElement>(document, "[data-range-form]");
    requireElement<HTMLInputElement>(form, "input[name='from']").value = "2026-10-01";
    requireElement<HTMLInputElement>(form, "input[name='to']").value = "2026-10-10";
    form.requestSubmit();

    await vi.waitFor(() => expect(map.factory).toHaveBeenCalledTimes(2));
    expect(map.dispose).toHaveBeenCalledTimes(1);
  });

  it("muestra el error cuando el catalogo no trae el corredor", async () => {
    const document = prepareDocument();

    await startAlertsPage({
      document,
      services: createPageServices({ stations: [] }),
    });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toContain(
      "No se encontraron estaciones del corredor",
    );
  });

  it("informa cuando Prefectura no publica puertos del corredor", async () => {
    const document = prepareDocument();

    await startAlertsPage({
      document,
      services: createPageServices({
        stations: [createStation({ id: "34", name: "Puerto Ausente" })],
        hydrology: new FakeHydrologySource({}),
      }),
    });

    expect(requireElement(document, "[data-prefectura-table]").textContent).toBe(
      "La Prefectura no publica alturas para las estaciones del corredor.",
    );
  });

  it("funciona sin formulario, mapa ni aviso de emergencia", async () => {
    window.document.documentElement.lang = "es";
    window.document.body.innerHTML = `
      <div data-summary-tiles></div>
      <div data-alert-cards></div>
      <div data-status-legend></div>
      <div data-prefectura-table></div>
    `;
    const document = window.document;

    await startAlertsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-alert-cards]").childElementCount).toBeGreaterThan(0);
    expect(requireElement(document, "[data-status-legend]").childElementCount).toBe(5);
  });
});
