/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { startStationsPage } from "@/presentation/pages/stations";
import { requireElement } from "@/presentation/runtime/dom";
import { FakeHydrologySource } from "../../support/applicationFakes";
import { createPageServices } from "../../support/pageServices";

const stationsMarkup = `
  <div data-status-legend></div>
  <div data-station-detail></div>
  <div data-station-catalogue></div>
  <div data-station-chart></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(url = "/es/estaciones/"): Document {
  window.history.replaceState({}, "", url);
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = stationsMarkup;

  return window.document;
}

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

describe("startStationsPage", () => {
  it("lista el catalogo completo cuando no hay estacion pedida", async () => {
    const document = prepareDocument();

    await startStationsPage({ document, services: createPageServices() });

    expect(document.querySelectorAll("[data-station-catalogue] tbody tr")).toHaveLength(6);
    expect(requireElement(document, "[data-station-detail]").childElementCount).toBe(0);
    expect(requireElement(document, "[data-status-legend]").childElementCount).toBe(5);
  });

  it("muestra la ficha y el grafico de la estacion pedida", async () => {
    const document = prepareDocument("/es/estaciones/?id=34");
    const render = vi.fn();

    await startStationsPage({
      document,
      services: createPageServices(),
      chartFactory: async () => ({
        render,
        resize: vi.fn(),
        dispose: vi.fn(),
      }),
    });

    const detail = requireElement(document, "[data-station-detail]");
    expect(detail.textContent).toContain("Rosario");
    expect(detail.textContent).toContain("Volver al catalogo");
    expect(requireElement(document, "[data-station-catalogue]").childElementCount).toBe(0);
    expect(render).toHaveBeenCalledTimes(1);
  });

  it("funciona sin fabrica de graficos", async () => {
    const document = prepareDocument("/es/estaciones/?id=34");

    await startStationsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-station-detail]").textContent).toContain("Rosario");
  });

  it("explica cuando la estacion pedida no existe", async () => {
    const document = prepareDocument("/es/estaciones/?id=999");

    await startStationsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-station-detail]").textContent).toBe(
      "La estacion pedida no figura en el catalogo publicado.",
    );
  });

  it("muestra la ficha aunque no haya observaciones", async () => {
    const document = prepareDocument("/es/estaciones/?id=34");
    const chartFactory = vi.fn(async () => ({
      render: vi.fn(),
      resize: vi.fn(),
      dispose: vi.fn(),
    }));

    await startStationsPage({
      document,
      services: createPageServices({ hydrology: new FakeHydrologySource({}) }),
      chartFactory,
    });

    expect(requireElement(document, "[data-station-detail]").textContent).toContain("Rosario");
    expect(chartFactory).not.toHaveBeenCalled();
  });

  it("muestra el error cuando falla la consulta de la serie", async () => {
    const document = prepareDocument("/es/estaciones/?id=34");
    const hydrology = new FakeHydrologySource(() => {
      throw new Error("serie caida");
    });

    await startStationsPage({ document, services: createPageServices({ hydrology }) });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toContain("serie caida");
  });
});
