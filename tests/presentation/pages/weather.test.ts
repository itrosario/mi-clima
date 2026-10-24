/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { startWeatherPage } from "@/presentation/pages/weather";
import { requireElement } from "@/presentation/runtime/dom";
import {
  createFailingOfficialWeatherSource,
  createFailingWeatherSource,
  createPageServices,
} from "../../support/pageServices";

const weatherMarkup = `
  <div data-weather-official></div>
  <div data-weather-official-source></div>
  <div data-weather-current></div>
  <div data-weather-forecast></div>
  <div data-weather-source></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(): Document {
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = weatherMarkup;

  return window.document;
}

describe("startWeatherPage", () => {
  it("dibuja la condicion actual, el pronostico y la fuente", async () => {
    const document = prepareDocument();

    await startWeatherPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-weather-current]").childElementCount).toBeGreaterThan(0);
    expect(requireElement(document, "[data-weather-forecast]").textContent).toContain("Lluvia");
    expect(requireElement(document, "[data-weather-source]").textContent).toContain("Open-Meteo");
    expect(requireElement(document, "[data-weather-official]").textContent).toContain(
      "ROSARIO AERO",
    );
    expect(requireElement(document, "[data-weather-official-source]").textContent).toContain("SMN");
    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(true);
  });

  it("mantiene el pronostico cuando la observacion oficial falla", async () => {
    const document = prepareDocument();

    await startWeatherPage({
      document,
      services: createPageServices({ officialWeather: createFailingOfficialWeatherSource() }),
    });

    expect(requireElement(document, "[data-weather-official]").textContent).toContain(
      "No hay una observacion oficial",
    );
    expect(requireElement(document, "[data-weather-forecast]").textContent).toContain("Lluvia");
    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(true);
  });

  it("muestra el error y permite reintentar", async () => {
    const document = prepareDocument();

    await startWeatherPage({
      document,
      services: createPageServices({ weather: createFailingWeatherSource() }),
    });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toContain(
      "clima no disponible",
    );
  });
});
