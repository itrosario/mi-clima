/**
 * Pruebas de integracion del transporte real contra respuestas simuladas.
 *
 * MSW intercepta `fetch`, de modo que se ejercita el cliente HTTP, el
 * protocolo del INA y la traduccion al dominio sin salir a internet.
 */

import { HttpResponse, http } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { FetchHttpClient } from "@/infrastructure/http/fetchHttpClient";
import { InaApiClient, inaBaseUrl } from "@/infrastructure/ina/inaApiClient";
import { InaHydrologySource } from "@/infrastructure/ina/inaHydrologySource";
import { InaPercentilesSource } from "@/infrastructure/ina/inaPercentilesSource";
import { InaStationCatalogSource } from "@/infrastructure/ina/inaStationCatalogSource";
import { OpenMeteoSource, openMeteoForecastUrl } from "@/infrastructure/openMeteo/openMeteoSource";
import {
  observationRows,
  openMeteoPayload,
  percentileRows,
  rosarioStationRow,
  seriesRows,
} from "../../support/inaFixtures";

const server = setupServer(
  http.post(inaBaseUrl, async ({ request }) => {
    const parameters = new URLSearchParams(await request.text());

    switch (parameters.get("request")) {
      case "estaciones":
        return HttpResponse.json({ data: [rosarioStationRow] });
      case "datos":
        return HttpResponse.json({ data: observationRows });
      case "series":
        return HttpResponse.json({ data: seriesRows });
      case "percentiles":
        return HttpResponse.json({ data: percentileRows });
      default:
        return HttpResponse.json({ mensaje: { error: "recurso desconocido" } });
    }
  }),
  http.get(openMeteoForecastUrl, () => HttpResponse.json(openMeteoPayload)),
);

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});

function createInaClient(): InaApiClient {
  return new InaApiClient(new FetchHttpClient({ timeoutMilliseconds: 5_000, maxAttempts: 1 }), {
    baseUrl: inaBaseUrl,
    transport: "direct",
  });
}

describe("integracion con el INA", () => {
  it("descarga el catalogo de estaciones", async () => {
    const stations = await new InaStationCatalogSource(createInaClient()).fetchStations();

    expect(stations).toHaveLength(1);
    expect(stations[0]?.name).toBe("Rosario");
  });

  it("descarga una serie hidrometrica", async () => {
    const series = await new InaHydrologySource(createInaClient()).fetchSeries({
      stationId: "34",
      variableId: 2,
      from: new Date("2026-10-20T03:00:00.000Z"),
      to: new Date("2026-10-22T03:00:00.000Z"),
    });

    expect(series.points.map((point) => point.value)).toEqual([4.1, 4.25]);
  });

  it("descarga los percentiles historicos", async () => {
    const table = await new InaPercentilesSource(createInaClient()).fetchPercentiles({
      stationId: "34",
      variableId: 2,
    });

    expect(table?.profiles).toHaveLength(2);
  });
});

describe("integracion con Open-Meteo", () => {
  it("descarga la condicion actual y el pronostico", async () => {
    const snapshot = await new OpenMeteoSource(
      new FetchHttpClient({ timeoutMilliseconds: 5_000, maxAttempts: 1 }),
      openMeteoForecastUrl,
    ).fetchWeather({
      location: { latitude: -32.95, longitude: -60.63 },
      timezone: "America/Argentina/Cordoba",
      forecastDays: 2,
    });

    expect(snapshot.current?.temperatureCelsius).toBe(23.2);
    expect(snapshot.forecast).toHaveLength(2);
    expect(snapshot.forecastSourceName).toBe("Open-Meteo");
  });
});
