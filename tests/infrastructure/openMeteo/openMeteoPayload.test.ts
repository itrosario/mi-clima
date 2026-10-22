import { describe, expect, it } from "vitest";
import {
  parseOffsetTimestamp,
  parseOpenMeteoSnapshot,
} from "@/infrastructure/openMeteo/openMeteoPayload";
import { openMeteoPayload } from "../../support/inaFixtures";

describe("parseOffsetTimestamp", () => {
  it("interpreta una hora local con el desplazamiento informado", () => {
    expect(parseOffsetTimestamp("2026-10-22T13:45", -10_800)?.toISOString()).toBe(
      "2026-10-22T16:45:00.000Z",
    );
  });

  it("acepta horas con segundos", () => {
    expect(parseOffsetTimestamp("2026-10-22T13:45:30", 0)?.toISOString()).toBe(
      "2026-10-22T13:45:30.000Z",
    );
  });

  it("descarta valores ausentes o invalidos", () => {
    expect(parseOffsetTimestamp(null, 0)).toBeNull();
    expect(parseOffsetTimestamp("   ", 0)).toBeNull();
    expect(parseOffsetTimestamp(2026, 0)).toBeNull();
    expect(parseOffsetTimestamp("no es una fecha", 0)).toBeNull();
  });
});

describe("parseOpenMeteoSnapshot", () => {
  it("traduce la condicion actual y el pronostico", () => {
    const snapshot = parseOpenMeteoSnapshot(openMeteoPayload);

    expect(snapshot?.location).toEqual({ latitude: -32.95, longitude: -60.63 });
    expect(snapshot?.timezone).toBe("America/Argentina/Cordoba");
    expect(snapshot?.forecastSourceName).toBe("Open-Meteo");
    expect(snapshot?.current).toMatchObject({
      temperatureCelsius: 23.2,
      apparentTemperatureCelsius: 24.2,
      relativeHumidityPercent: 73,
      precipitationMillimetres: 0.1,
      windSpeedKilometresPerHour: 13.3,
      windDirectionDegrees: 74,
      pressureHectopascals: 1009.1,
      cloudCoverPercent: 99,
      condition: "drizzle",
      isForecast: true,
    });
    expect(snapshot?.current?.timestamp.toISOString()).toBe("2026-10-22T16:45:00.000Z");
  });

  it("traduce cada dia del pronostico", () => {
    const snapshot = parseOpenMeteoSnapshot(openMeteoPayload);

    expect(snapshot?.forecast).toHaveLength(2);
    expect(snapshot?.forecast[0]).toEqual({
      date: new Date("2026-10-22T03:00:00.000Z"),
      minimumTemperatureCelsius: 14.8,
      maximumTemperatureCelsius: 25.4,
      precipitationMillimetres: 0.4,
      precipitationProbabilityPercent: 55,
      maximumWindSpeedKilometresPerHour: 21.6,
      condition: "drizzle",
    });
    expect(snapshot?.forecast[1]?.condition).toBe("clear");
  });

  it("deja el pronostico vacio cuando el origen no lo informa", () => {
    const snapshot = parseOpenMeteoSnapshot({
      latitude: -32.95,
      longitude: -60.63,
      timezone: "America/Argentina/Cordoba",
      utc_offset_seconds: -10_800,
    });

    expect(snapshot?.forecast).toEqual([]);
    expect(snapshot?.current).toBeNull();
    expect(snapshot?.timezone).toBe("America/Argentina/Cordoba");
  });

  it("descarta los dias con fecha invalida", () => {
    const snapshot = parseOpenMeteoSnapshot({
      latitude: -32.95,
      longitude: -60.63,
      utc_offset_seconds: 0,
      daily: { time: ["no es fecha", 2026, null], weather_code: [1, 2, 3] },
    });

    expect(snapshot?.forecast).toEqual([]);
  });

  it("descarta los dias cuando la lista de fechas no es un arreglo", () => {
    const snapshot = parseOpenMeteoSnapshot({
      latitude: -32.95,
      longitude: -60.63,
      utc_offset_seconds: 0,
      daily: { time: "2026-10-22", weather_code: [1] },
    });

    expect(snapshot?.forecast).toEqual([]);
    expect(snapshot?.timezone).toBe("UTC");
  });

  it("deja la condicion actual en null cuando falta la hora", () => {
    const snapshot = parseOpenMeteoSnapshot({
      latitude: -32.95,
      longitude: -60.63,
      utc_offset_seconds: 0,
      current: { temperature_2m: 20 },
    });

    expect(snapshot?.current).toBeNull();
  });

  it("marca como desconocida la condicion sin codigo", () => {
    const snapshot = parseOpenMeteoSnapshot({
      latitude: -32.95,
      longitude: -60.63,
      utc_offset_seconds: 0,
      current: { time: "2026-10-22T10:00", weather_code: null },
    });

    expect(snapshot?.current?.condition).toBe("unknown");
    expect(snapshot?.current?.temperatureCelsius).toBeNull();
  });

  it("rechaza una respuesta sin coordenadas", () => {
    expect(parseOpenMeteoSnapshot({ timezone: "UTC" })).toBeNull();
    expect(parseOpenMeteoSnapshot(null)).toBeNull();
    expect(parseOpenMeteoSnapshot("texto")).toBeNull();
  });

  it("asume desplazamiento cero cuando el origen no lo informa", () => {
    const snapshot = parseOpenMeteoSnapshot({
      latitude: -32.95,
      longitude: -60.63,
      current: { time: "2026-10-22T10:00", temperature_2m: 18 },
    });

    expect(snapshot?.current?.timestamp.toISOString()).toBe("2026-10-22T10:00:00.000Z");
  });
});
