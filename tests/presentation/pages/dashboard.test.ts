/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import type { ChartRenderer } from "@/presentation/charts/chartRenderer";
import { startDashboardPage } from "@/presentation/pages/dashboard";
import { requireElement } from "@/presentation/runtime/dom";
import { FakeHydrologySource } from "../../support/applicationFakes";
import {
  corridorSeries,
  createFailingWeatherSource,
  createPageServices,
} from "../../support/pageServices";

const dashboardMarkup = `
  <div data-emergency-banner hidden><p data-emergency-message></p></div>
  <form data-range-form>
    <input name="from" />
    <input name="to" />
    <button type="submit">Aplicar</button>
  </form>
  <div data-range-summary></div>
  <div data-summary-tiles></div>
  <div data-status-legend></div>
  <div data-corridor-cards></div>
  <div data-corridor-chart></div>
  <div data-weather-current></div>
  <div data-weather-forecast></div>
  <div data-weather-source></div>
  <div data-comparison-table></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(): Document {
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = dashboardMarkup;

  return window.document;
}

function createFakeChartFactory() {
  const renderer: ChartRenderer = {
    render: vi.fn(),
    resize: vi.fn(),
    dispose: vi.fn(),
  };
  const factory = vi.fn(async () => renderer);

  return { factory, renderer };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("startDashboardPage", () => {
  it("dibuja resumen, tarjetas, clima, leyenda, tabla y grafico", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource({ "34": corridorSeries("34", 5.1) });
    const chart = createFakeChartFactory();

    await startDashboardPage({
      document,
      services: createPageServices({ hydrology }),
      chartFactory: chart.factory,
    });

    expect(requireElement(document, "[data-range-form] input[name='from']")).toHaveProperty(
      "value",
      "2026-10-15",
    );
    expect(requireElement(document, "[data-summary-tiles]").childElementCount).toBe(5);
    expect(requireElement(document, "[data-corridor-cards]").textContent).toContain("Rosario");
    expect(requireElement(document, "[data-status-legend]").childElementCount).toBe(5);
    expect(requireElement(document, "[data-comparison-table]").textContent).toContain(
      "Perfil longitudinal",
    );
    expect(requireElement(document, "[data-weather-current]").textContent).toContain("21,4");
    expect(requireElement(document, "[data-weather-forecast]").textContent).toContain("Lluvia");
    expect(requireElement(document, "[data-weather-source]").textContent).toContain(
      "Pronostico no oficial",
    );
    expect(requireElement(document, "[data-range-summary]").textContent).toContain("Rango");
    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(true);
    expect(requireElement<HTMLElement>(document, "[data-loading]").hidden).toBe(true);
    expect(requireElement<HTMLElement>(document, "[data-emergency-banner]").hidden).toBe(true);

    expect(chart.factory).toHaveBeenCalledTimes(1);
    const option = (chart.renderer.render as ReturnType<typeof vi.fn>).mock.calls[0]?.[0] as {
      series: { name: string }[];
    };
    expect(option.series.map((series) => series.name)).toContain("Rosario");
  });

  it("muestra el cartel de evacuacion cuando una estacion supera ese umbral", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource({ "34": corridorSeries("34", 5.4) });

    await startDashboardPage({ document, services: createPageServices({ hydrology }) });

    const banner = requireElement<HTMLElement>(document, "[data-emergency-banner]");
    expect(banner.hidden).toBe(false);
    expect(requireElement(document, "[data-emergency-message]").textContent).toContain("Rosario");
  });

  it("informa cuando el pronostico no esta disponible", async () => {
    const document = prepareDocument();

    await startDashboardPage({
      document,
      services: createPageServices({ weather: createFailingWeatherSource() }),
    });

    expect(requireElement(document, "[data-weather-current]").textContent).toBe(
      "El pronostico no esta disponible en este momento.",
    );
    expect(requireElement(document, "[data-weather-source]").childElementCount).toBe(0);
  });

  it("falla con un mensaje claro si el catalogo no trae el corredor", async () => {
    const document = prepareDocument();

    await startDashboardPage({ document, services: createPageServices({ stations: [] }) });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toContain(
      "No se encontraron estaciones del corredor",
    );
  });

  it("vuelve a consultar al enviar el formulario y reutiliza el grafico", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource({ "34": corridorSeries("34", 5.1) });
    const chart = createFakeChartFactory();

    await startDashboardPage({
      document,
      services: createPageServices({ hydrology }),
      chartFactory: chart.factory,
    });

    const form = requireElement<HTMLFormElement>(document, "[data-range-form]");
    const from = requireElement<HTMLInputElement>(form, "input[name='from']");
    const to = requireElement<HTMLInputElement>(form, "input[name='to']");
    from.value = "2026-10-01";
    to.value = "2026-10-10";
    form.requestSubmit();

    await vi.waitFor(() => expect(chart.renderer.render).toHaveBeenCalledTimes(2));

    expect(chart.factory).toHaveBeenCalledTimes(1);
    expect(hydrology.calls.at(-1)?.request.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(hydrology.calls.at(-1)?.request.to.toISOString()).toBe("2026-10-11T02:59:59.000Z");
  });

  it("usa el rango por defecto si el formulario tiene fechas invalidas", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource({ "34": corridorSeries("34", 5.1) });

    await startDashboardPage({ document, services: createPageServices({ hydrology }) });

    const form = requireElement<HTMLFormElement>(document, "[data-range-form]");
    requireElement<HTMLInputElement>(form, "input[name='from']").value = "";
    form.requestSubmit();

    await vi.waitFor(() => expect(hydrology.calls).toHaveLength(12));
    expect(hydrology.calls.at(-1)?.request.from.toISOString()).toBe("2026-10-15T12:00:00.000Z");
  });

  it("arma sus propios servicios y muestra el error de red", async () => {
    window.document.documentElement.lang = "es";
    window.document.body.innerHTML = `
      <p data-loading hidden></p>
      <div data-page-error hidden><p data-error-message></p><button data-retry></button></div>
    `;
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => {
        throw new Error("sin red");
      }),
    );

    await startDashboardPage({ document: window.document });

    expect(requireElement<HTMLElement>(window.document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(window.document, "[data-error-message]").textContent).toContain(
      "sin red",
    );
  });
});
