/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import type { WeatherView } from "@/application/weather/loadWeather";
import { getTranslations } from "@/presentation/i18n";
import { renderWeatherBlocks } from "@/presentation/rendering/weather";
import { weatherSnapshot } from "../../support/pageServices";

const translations = getTranslations("es");

function prepareDocument(): Document {
  window.document.body.innerHTML = `
    <div data-weather-current></div>
    <div data-weather-forecast></div>
    <div data-weather-source></div>
  `;

  return window.document;
}

function createView(overrides: Partial<WeatherView> = {}): WeatherView {
  return {
    snapshot: weatherSnapshot,
    fetchedAt: new Date("2026-10-22T12:00:00.000Z"),
    isOfficial: false,
    attribution: {
      name: "Open-Meteo",
      url: "https://open-meteo.com/",
      isThirdParty: true,
    },
    ...overrides,
  };
}

describe("renderWeatherBlocks", () => {
  it("dibuja condicion, pronostico y procedencia", () => {
    const document = prepareDocument();

    renderWeatherBlocks(document, createView(), "es", translations);

    expect(document.querySelector("[data-weather-current]")?.textContent).toContain(
      "Parcialmente nublado",
    );
    expect(document.querySelector("[data-weather-forecast]")?.textContent).toContain("Minima");
    expect(document.querySelector("[data-weather-source]")?.textContent).toContain("Open-Meteo");
  });

  it("explica cuando no hay condicion actual", () => {
    const document = prepareDocument();

    renderWeatherBlocks(
      document,
      createView({ snapshot: { ...weatherSnapshot, current: null } }),
      "es",
      translations,
    );

    expect(document.querySelector("[data-weather-current]")?.textContent).toBe(
      "No hay una observacion reciente disponible.",
    );
  });

  it("explica cuando el clima no esta disponible", () => {
    const document = prepareDocument();

    renderWeatherBlocks(document, null, "es", translations);

    expect(document.querySelector("[data-weather-current]")?.textContent).toBe(
      "El pronostico no esta disponible en este momento.",
    );
    expect(document.querySelector("[data-weather-forecast]")?.textContent).toBe("");
    expect(document.querySelector("[data-weather-source]")?.textContent).toBe("");
  });
});
