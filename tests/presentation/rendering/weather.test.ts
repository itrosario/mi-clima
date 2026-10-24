/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import type { OfficialWeatherView } from "@/application/weather/loadOfficialWeather";
import type { WeatherView } from "@/application/weather/loadWeather";
import { getTranslations } from "@/presentation/i18n";
import { renderOfficialWeather, renderWeatherBlocks } from "@/presentation/rendering/weather";
import { officialWeatherObservation, weatherSnapshot } from "../../support/pageServices";

const translations = getTranslations("es");

function prepareDocument(): Document {
  window.document.body.innerHTML = `
    <div data-weather-official></div>
    <div data-weather-official-source></div>
    <div data-weather-current></div>
    <div data-weather-forecast></div>
    <div data-weather-source></div>
  `;

  return window.document;
}

function createOfficialView(): OfficialWeatherView {
  return {
    observation: officialWeatherObservation,
    fetchedAt: new Date("2026-10-22T19:05:00.000Z"),
    isOfficial: true,
    attribution: {
      name: "SMN - Servicio Meteorologico Nacional",
      url: "https://www.smn.gob.ar/",
      isThirdParty: false,
    },
  };
}

describe("renderOfficialWeather", () => {
  it("dibuja la observacion oficial y su procedencia", () => {
    const document = prepareDocument();

    renderOfficialWeather(document, createOfficialView(), "es", translations);

    expect(document.querySelector("[data-weather-official]")?.textContent).toContain(
      "ROSARIO AERO",
    );
    expect(document.querySelector("[data-weather-official]")?.textContent).toContain(
      "Parcialmente nublado",
    );
    expect(document.querySelector("[data-weather-official-source]")?.textContent).toContain("SMN");
  });

  it("explica cuando no hay observacion oficial", () => {
    const document = prepareDocument();

    renderOfficialWeather(
      document,
      { ...createOfficialView(), observation: null },
      "es",
      translations,
    );

    expect(document.querySelector("[data-weather-official]")?.textContent).toContain(
      "No hay una observacion oficial",
    );
    expect(document.querySelector("[data-weather-official-source]")?.textContent).toBe("");
  });

  it("explica el faltante cuando la consulta fallo", () => {
    const document = prepareDocument();

    renderOfficialWeather(document, null, "es", translations);

    expect(document.querySelector("[data-weather-official]")?.textContent).toContain(
      "No hay una observacion oficial",
    );
  });

  it("muestra guiones cuando faltan valores oficiales", () => {
    const document = prepareDocument();

    renderOfficialWeather(
      document,
      {
        ...createOfficialView(),
        observation: {
          ...officialWeatherObservation,
          apparentTemperatureCelsius: null,
          relativeHumidityPercent: null,
          pressureHectopascals: null,
          windSpeedKilometresPerHour: null,
          windDirectionText: null,
          condition: null,
        },
      },
      "es",
      translations,
    );

    expect(document.querySelector("[data-weather-official]")?.textContent).toContain("—");
  });
});

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
