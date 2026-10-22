import { describe, expect, it } from "vitest";
import {
  buildWeatherUrl,
  OpenMeteoError,
  OpenMeteoSource,
} from "@/infrastructure/openMeteo/openMeteoSource";
import { FakeHttpPort, jsonResponse } from "../../support/fakeHttpPort";
import { openMeteoPayload } from "../../support/inaFixtures";

const rosario = { latitude: -32.95, longitude: -60.63 };
const request = {
  location: rosario,
  timezone: "America/Argentina/Cordoba",
  forecastDays: 7,
};

describe("buildWeatherUrl", () => {
  it("compone la consulta con ubicacion, variables, zona y dias", () => {
    const url = new URL(buildWeatherUrl("https://api.test/forecast", request));

    expect(url.searchParams.get("latitude")).toBe("-32.95");
    expect(url.searchParams.get("longitude")).toBe("-60.63");
    expect(url.searchParams.get("current")).toContain("temperature_2m");
    expect(url.searchParams.get("daily")).toContain("weather_code");
    expect(url.searchParams.get("timezone")).toBe("America/Argentina/Cordoba");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
  });
});

describe("OpenMeteoSource", () => {
  it("devuelve la instantanea traducida", async () => {
    const http = new FakeHttpPort(jsonResponse(openMeteoPayload));
    const snapshot = await new OpenMeteoSource(http).fetchWeather(request);

    expect(snapshot.current?.temperatureCelsius).toBe(23.2);
    expect(snapshot.forecast).toHaveLength(2);
    expect(http.requests[0]?.method).toBe("GET");
  });

  it("apunta a la URL configurada y propaga la senal", async () => {
    const http = new FakeHttpPort(jsonResponse(openMeteoPayload));
    const controller = new AbortController();

    await new OpenMeteoSource(http, "https://api.test/forecast").fetchWeather(
      request,
      controller.signal,
    );

    expect(http.requests[0]?.url).toContain("https://api.test/forecast?");
    expect(http.signals[0]).toBe(controller.signal);
  });

  it("falla cuando el estado no es exitoso", async () => {
    const http = new FakeHttpPort({ status: 404, headers: {}, body: "no" });

    const error = await new OpenMeteoSource(http).fetchWeather(request).catch((cause) => cause);

    expect(error).toBeInstanceOf(OpenMeteoError);
    expect(error.status).toBe(404);
  });

  it("falla cuando la respuesta no es JSON", async () => {
    const http = new FakeHttpPort({ status: 200, headers: {}, body: "<html>" });

    await expect(new OpenMeteoSource(http).fetchWeather(request)).rejects.toThrow(
      "respuesta ilegible",
    );
  });

  it("falla cuando la respuesta no trae coordenadas", async () => {
    const http = new FakeHttpPort(jsonResponse({ timezone: "UTC" }));

    await expect(new OpenMeteoSource(http).fetchWeather(request)).rejects.toThrow(
      "respuesta inesperada",
    );
  });
});
