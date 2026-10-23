/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { PercentileTable } from "@/domain/analytics/anomaly";
import type { ChartRenderer } from "@/presentation/charts/chartRenderer";
import { startStatisticsPage } from "@/presentation/pages/statistics";
import { requireElement } from "@/presentation/runtime/dom";
import { FakeHydrologySource, FakePercentilesSource } from "../../support/applicationFakes";
import { createStation } from "../../support/factories";
import { corridorSeries, createPageServices } from "../../support/pageServices";

const statisticsMarkup = `
  <select data-station-select></select>
  <select data-moving-window>
    <option value="2">2</option>
    <option value="7">7</option>
    <option value="30">30</option>
  </select>
  <div data-statistics-meta></div>
  <div data-statistics-anomaly></div>
  <div data-statistics-trend></div>
  <div data-statistics-extremes></div>
  <div data-statistics-comparison></div>
  <div data-statistics-chart></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(url = "/es/estadisticas/", markup = statisticsMarkup): Document {
  window.history.replaceState({}, "", url);
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = markup;

  return window.document;
}

function createPercentileTable(stationId: string): PercentileTable {
  return {
    stationId,
    variableId: 2,
    profiles: [
      {
        dayOfYear: 295,
        percentiles: [
          { percentile: 10, value: 3.8 },
          { percentile: 50, value: 4.2 },
          { percentile: 90, value: 5.3 },
        ],
      },
    ],
  };
}

function createChartFactory() {
  const render = vi.fn();
  const factory = vi.fn(
    async (_container: HTMLElement): Promise<ChartRenderer> => ({
      render,
      resize: vi.fn(),
      dispose: vi.fn(),
    }),
  );

  return { render, factory };
}

afterEach(() => {
  window.history.replaceState({}, "", "/");
  vi.unstubAllGlobals();
});

describe("startStatisticsPage", () => {
  it("muestra anomalia, tendencia, extremos, comparacion y grafico", async () => {
    const document = prepareDocument();
    const chart = createChartFactory();

    await startStatisticsPage({
      document,
      services: createPageServices({
        percentiles: new FakePercentilesSource({ "34": createPercentileTable("34") }),
      }),
      chartFactory: chart.factory,
    });

    expect(requireElement(document, "[data-statistics-meta]").textContent).toContain("Rosario");
    expect(requireElement(document, "[data-statistics-anomaly]").childElementCount).toBe(5);
    expect(requireElement(document, "[data-statistics-trend]").textContent).toContain("Pendiente");
    expect(requireElement(document, "[data-statistics-extremes]").textContent).toContain("Anio");
    expect(requireElement(document, "[data-statistics-comparison]").textContent).toContain(
      "Perfil longitudinal",
    );
    expect(requireElement(document, "[data-station-select]").childElementCount).toBe(6);
    expect(chart.render).toHaveBeenCalledTimes(1);
  });

  it("explica cuando la estacion no publica percentiles", async () => {
    const document = prepareDocument();

    await startStatisticsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-statistics-anomaly]").textContent).toBe(
      "La estacion no publica percentiles historicos para esta variable.",
    );
  });

  it("vuelve a la estacion de referencia si el id no existe", async () => {
    const document = prepareDocument("/es/estadisticas/?id=999");

    await startStatisticsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-statistics-meta]").textContent).toContain("Rosario");
    expect(requireElement<HTMLSelectElement>(document, "[data-station-select]").value).toBe("34");
  });

  it("usa la primera estacion si el catalogo no trae la de referencia", async () => {
    const document = prepareDocument("/es/estadisticas/?id=999");
    const hydrology = new FakeHydrologySource({ "99": corridorSeries("99", 4) });

    await startStatisticsPage({
      document,
      services: createPageServices({
        stations: [createStation({ id: "99", name: "Otra estacion" })],
        hydrology,
      }),
    });

    expect(requireElement(document, "[data-statistics-meta]").textContent).toContain(
      "Otra estacion",
    );
    expect(requireElement(document, "[data-statistics-comparison]").textContent).toBe(
      "La estacion no publico observaciones en la ventana consultada.",
    );
  });

  it("explica cuando el catalogo esta vacio", async () => {
    const document = prepareDocument();

    await startStatisticsPage({
      document,
      services: createPageServices({ stations: [] }),
    });

    expect(requireElement(document, "[data-statistics-meta]").textContent).toBe(
      "La estacion pedida no figura en el catalogo publicado.",
    );
  });

  it("muestra un aviso cuando no hay observaciones recientes", async () => {
    const document = prepareDocument();

    await startStatisticsPage({
      document,
      services: createPageServices({ hydrology: new FakeHydrologySource({}) }),
    });

    expect(requireElement(document, "[data-statistics-trend]").textContent).toBe(
      "La estacion no publico observaciones en la ventana consultada.",
    );
  });

  it("recarga al cambiar de estacion y reutiliza el grafico", async () => {
    const document = prepareDocument();
    const chart = createChartFactory();
    const services = createPageServices();
    const hydrology = services.hydrologySource as FakeHydrologySource;

    await startStatisticsPage({ document, services, chartFactory: chart.factory });
    const callsAfterLoad = hydrology.calls.length;

    const stationSelect = requireElement<HTMLSelectElement>(document, "[data-station-select]");
    stationSelect.value = "29";
    stationSelect.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(hydrology.calls.length).toBeGreaterThan(callsAfterLoad));
    const callsAfterStation = hydrology.calls.length;

    const windowSelect = requireElement<HTMLSelectElement>(document, "[data-moving-window]");
    windowSelect.value = "7";
    windowSelect.dispatchEvent(new Event("change"));
    await vi.waitFor(() => expect(hydrology.calls.length).toBeGreaterThan(callsAfterStation));
    await vi.waitFor(() => expect(chart.render).toHaveBeenCalledTimes(3));
    expect(chart.factory).toHaveBeenCalledTimes(1);
  });

  it("usa la ventana movil por defecto si el valor no es valido", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource({});

    await startStatisticsPage({
      document,
      services: createPageServices({ hydrology }),
    });
    const callsBefore = hydrology.calls.length;
    const windowSelect = requireElement<HTMLSelectElement>(document, "[data-moving-window]");
    windowSelect.value = "15";
    windowSelect.dispatchEvent(new Event("change"));

    await vi.waitFor(() => expect(hydrology.calls.length).toBeGreaterThan(callsBefore));
    expect(requireElement(document, "[data-statistics-meta]").textContent).toContain("Rosario");
  });

  it("funciona sin selectores ni grafico", async () => {
    const document = prepareDocument(
      "/es/estadisticas/",
      `
        <div data-statistics-meta></div>
        <div data-statistics-anomaly></div>
        <div data-statistics-trend></div>
        <div data-statistics-extremes></div>
        <div data-statistics-comparison></div>
      `,
    );

    await startStatisticsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-statistics-meta]").textContent).toContain("Rosario");
  });

  it("muestra el error cuando falla la consulta", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource(() => {
      throw new Error("series caidas");
    });

    await startStatisticsPage({
      document,
      services: createPageServices({ hydrology }),
    });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toContain("series caidas");
  });
});
