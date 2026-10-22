import { describe, expect, it } from "vitest";
import {
  defaultForecastDays,
  loadWeather,
  rosarioLocation,
  rosarioTimezone,
} from "@/application/weather/loadWeather";
import type { WeatherSnapshot } from "@/domain/weather/types";
import { FakeClock, FakeWeatherSource } from "../../support/applicationFakes";

const now = new Date("2026-10-22T12:00:00.000Z");

const snapshot: WeatherSnapshot = {
  location: rosarioLocation,
  timezone: rosarioTimezone,
  current: null,
  forecast: [],
  forecastSourceName: "Open-Meteo",
};

describe("loadWeather", () => {
  it("consulta Rosario con los valores por defecto", async () => {
    const source = new FakeWeatherSource(snapshot);
    const clock = new FakeClock(now);
    const controller = new AbortController();

    const view = await loadWeather({ source, clock }, {}, controller.signal);

    expect(source.calls[0]?.request).toEqual({
      location: rosarioLocation,
      timezone: rosarioTimezone,
      forecastDays: defaultForecastDays,
    });
    expect(source.calls[0]?.signal).toBe(controller.signal);
    expect(view.snapshot).toBe(snapshot);
    expect(view.fetchedAt).toBe(now);
    expect(view.isOfficial).toBe(false);
    expect(view.attribution).toMatchObject({ name: "Open-Meteo", isThirdParty: true });
  });

  it("permite pedir otra ubicacion, zona y cantidad de dias", async () => {
    const source = new FakeWeatherSource(snapshot);

    await loadWeather(
      { source, clock: new FakeClock(now) },
      {
        location: { latitude: -31.4, longitude: -64.2 },
        timezone: "America/Argentina/Cordoba",
        forecastDays: 3,
      },
    );

    expect(source.calls[0]?.request.forecastDays).toBe(3);
    expect(source.calls[0]?.request.location).toEqual({ latitude: -31.4, longitude: -64.2 });
  });
});
