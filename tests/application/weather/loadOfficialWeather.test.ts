import { describe, expect, it } from "vitest";
import { loadOfficialWeather } from "@/application/weather/loadOfficialWeather";
import { distanceKilometres, nearestObservation } from "@/domain/weather/official";
import { FakeClock, FakeOfficialWeatherSource } from "../../support/applicationFakes";
import {
  createOfficialObservation,
  createOfficialSnapshot,
  rosarioCoordinates,
} from "../../support/smnFixtures";

const now = new Date("2026-10-23T20:00:00.000Z");

describe("distanceKilometres", () => {
  it("devuelve cero para el mismo punto y crece con la distancia", () => {
    expect(distanceKilometres(rosarioCoordinates, rosarioCoordinates)).toBe(0);
    expect(
      distanceKilometres(rosarioCoordinates, { latitude: -31.4, longitude: -64.2 }),
    ).toBeGreaterThan(300);
  });
});

describe("nearestObservation", () => {
  it("elige la estacion mas cercana", () => {
    const near = createOfficialObservation({ stationName: "ROSARIO AERO" });
    const far = createOfficialObservation({
      stationName: "CORDOBA AERO",
      location: { latitude: -31.3, longitude: -64.2 },
    });

    expect(nearestObservation([far, near], rosarioCoordinates)).toBe(near);
  });

  it("devuelve null sin observaciones", () => {
    expect(nearestObservation([], rosarioCoordinates)).toBeNull();
  });
});

describe("loadOfficialWeather", () => {
  it("consulta la red oficial y entrega la observacion mas cercana", async () => {
    const observation = createOfficialObservation();
    const source = new FakeOfficialWeatherSource(createOfficialSnapshot([observation]));
    const clock = new FakeClock(now);
    const controller = new AbortController();

    const view = await loadOfficialWeather(
      { source, clock },
      rosarioCoordinates,
      controller.signal,
    );

    expect(source.signals).toEqual([controller.signal]);
    expect(view.observation).toBe(observation);
    expect(view.fetchedAt).toBe(now);
    expect(view.isOfficial).toBe(true);
    expect(view.attribution).toMatchObject({
      name: "SMN - Servicio Meteorologico Nacional",
      isThirdParty: false,
    });
  });

  it("usa Rosario por defecto", async () => {
    const observation = createOfficialObservation();
    const source = new FakeOfficialWeatherSource(createOfficialSnapshot([observation]));

    const view = await loadOfficialWeather({ source, clock: new FakeClock(now) });

    expect(view.observation).toBe(observation);
  });

  it("devuelve null cuando la red no publico observaciones", async () => {
    const source = new FakeOfficialWeatherSource(createOfficialSnapshot([]));

    const view = await loadOfficialWeather({ source, clock: new FakeClock(now) });

    expect(view.observation).toBeNull();
  });

  it("no actualiza la estacion elegida si hay otra a igual distancia", async () => {
    const obs1 = createOfficialObservation({ stationName: "A" });
    const obs2 = createOfficialObservation({ stationName: "B" });
    const source = new FakeOfficialWeatherSource(createOfficialSnapshot([obs1, obs2]));

    const view = await loadOfficialWeather({ source, clock: new FakeClock(now) });

    expect(view.observation).toBe(obs1);
  });
});
