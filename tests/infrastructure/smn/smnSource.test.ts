import { describe, expect, it } from "vitest";
import { SmnSource } from "@/infrastructure/smn/smnSource";
import { FakeHttpPort, jsonResponse } from "../../support/fakeHttpPort";

const payload = {
  source: "SMN",
  observations: [
    {
      stationName: "ROSARIO AERO",
      province: "SANTA FE",
      location: { latitude: -32.9, longitude: -60.77 },
      observedAt: "2026-10-23T19:00:00.000Z",
      condition: "Parcialmente nublado",
      visibilityKilometres: 15,
      temperatureCelsius: 16.1,
      apparentTemperatureCelsius: null,
      relativeHumidityPercent: 79,
      windDirectionText: "Sur",
      windSpeedKilometresPerHour: 16,
      pressureHectopascals: 993.6,
    },
  ],
};

describe("SmnSource", () => {
  it("consulta el proxy y normaliza las fechas", async () => {
    const http = new FakeHttpPort(jsonResponse(payload));
    const source = new SmnSource(http, "/api/smn");
    const controller = new AbortController();

    const snapshot = await source.fetchSnapshot(controller.signal);

    expect(http.requests).toEqual([{ url: "/api/smn", method: "GET" }]);
    expect(http.signals).toEqual([controller.signal]);
    expect(snapshot.observations[0]?.observedAt).toEqual(new Date("2026-10-23T19:00:00.000Z"));
  });

  it("informa el estado cuando el proxy falla", async () => {
    const source = new SmnSource(new FakeHttpPort({ status: 502, headers: {}, body: "sin datos" }));

    await expect(source.fetchSnapshot()).rejects.toMatchObject({
      name: "SmnSourceError",
      status: 502,
    });
  });

  it("rechaza una respuesta ilegible", async () => {
    const source = new SmnSource(
      new FakeHttpPort({ status: 200, headers: {}, body: "no es json" }),
    );

    await expect(source.fetchSnapshot()).rejects.toThrow("ilegible");
  });

  it("rechaza una respuesta con forma inesperada", async () => {
    const source = new SmnSource(new FakeHttpPort(jsonResponse({ observations: "no" })));

    await expect(source.fetchSnapshot()).rejects.toThrow("inesperada");
  });
});
