import { describe, expect, it } from "vitest";
import { InaApiClient } from "@/infrastructure/ina/inaApiClient";
import { InaHydrologySource } from "@/infrastructure/ina/inaHydrologySource";
import { InaPercentilesSource } from "@/infrastructure/ina/inaPercentilesSource";
import { InaStationCatalogSource } from "@/infrastructure/ina/inaStationCatalogSource";
import { FakeHttpPort, inaResponse, requestParameters } from "../../support/fakeHttpPort";
import {
  meteorologicalStationRow,
  observationRows,
  percentileRows,
  rosarioStationRow,
  seriesRows,
} from "../../support/inaFixtures";

function catalogSource(rows: readonly unknown[]): InaStationCatalogSource {
  return new InaStationCatalogSource(new InaApiClient(new FakeHttpPort(inaResponse(rows))));
}

describe("InaStationCatalogSource", () => {
  it("traduce las filas del catalogo y descarta las invalidas", async () => {
    const stations = await catalogSource([
      rosarioStationRow,
      meteorologicalStationRow,
      { nombre: "Sin codigo" },
    ]).fetchStations();

    expect(stations.map((station) => station.id)).toEqual(["34", "1722"]);
  });

  it("propaga la senal de cancelacion", async () => {
    const http = new FakeHttpPort(inaResponse([]));
    const controller = new AbortController();

    await new InaStationCatalogSource(new InaApiClient(http)).fetchStations(controller.signal);

    expect(http.signals[0]).toBe(controller.signal);
  });
});

describe("InaHydrologySource", () => {
  it("consulta la estacion y la variable en el rango pedido", async () => {
    const http = new FakeHttpPort(inaResponse(observationRows));
    const source = new InaHydrologySource(new InaApiClient(http));

    const series = await source.fetchSeries({
      stationId: "34",
      variableId: 2,
      from: new Date("2026-10-20T03:00:00.000Z"),
      to: new Date("2026-10-22T03:00:00.000Z"),
    });

    const parameters = requestParameters(http.requests[0] ?? { url: "", method: "GET" });

    expect(parameters.get("request")).toBe("datos");
    expect(parameters.get("timeStart")).toBe("2026-10-20T00:00:00");
    expect(parameters.get("timeEnd")).toBe("2026-10-22T00:00:00");
    expect(parameters.get("siteCode")).toBe("34");
    expect(parameters.get("varId")).toBe("2");

    expect(series.stationId).toBe("34");
    expect(series.variableId).toBe(2);
    expect(series.unit).toBe("m");
    expect(series.points.map((point) => point.value)).toEqual([4.1, 4.25]);
  });

  it("devuelve una serie vacia cuando el organismo no publica datos", async () => {
    const source = new InaHydrologySource(new InaApiClient(new FakeHttpPort(inaResponse([]))));

    const series = await source.fetchSeries({
      stationId: "34",
      variableId: 4,
      from: new Date("2026-10-20T03:00:00.000Z"),
      to: new Date("2026-10-22T03:00:00.000Z"),
    });

    expect(series.points).toEqual([]);
    expect(series.unit).toBe("m³/s");
  });
});

describe("InaPercentilesSource", () => {
  it("resuelve la serie de medicion directa y trae sus percentiles", async () => {
    let requestedSeriesId: string | null = null;
    const http = new FakeHttpPort((request) => {
      const parameters = requestParameters(request);

      if (parameters.get("request") === "series") {
        return inaResponse(seriesRows);
      }

      requestedSeriesId = parameters.get("seriesId");
      return inaResponse(percentileRows);
    });
    const source = new InaPercentilesSource(new InaApiClient(http));

    const table = await source.fetchPercentiles({ stationId: "34", variableId: 2 });

    const seriesParameters = requestParameters(http.requests[0] ?? { url: "", method: "GET" });

    expect(seriesParameters.get("siteCode")).toBe("34");
    expect(seriesParameters.get("varId")).toBe("2");
    expect(requestedSeriesId).toBe("34");
    expect(table?.profiles).toHaveLength(2);
  });

  it("prefiere la serie directa con mas observaciones", async () => {
    let requestedSeriesId: string | null = null;
    const http = new FakeHttpPort((request) => {
      const parameters = requestParameters(request);

      if (parameters.get("request") === "series") {
        return inaResponse(seriesRows);
      }

      requestedSeriesId = parameters.get("seriesId");
      return inaResponse([]);
    });

    await new InaPercentilesSource(new InaApiClient(http)).fetchPercentiles({
      stationId: "34",
      variableId: 2,
    });

    expect(requestedSeriesId).toBe("34");
  });

  it("devuelve null cuando no hay una serie de medicion directa", async () => {
    const http = new FakeHttpPort((request) =>
      inaResponse(requestParameters(request).get("request") === "series" ? [seriesRows[0]] : []),
    );

    await expect(
      new InaPercentilesSource(new InaApiClient(http)).fetchPercentiles({
        stationId: "34",
        variableId: 2,
      }),
    ).resolves.toBeNull();
    expect(http.requests).toHaveLength(1);
  });

  it("devuelve null cuando la serie no declara identificador", async () => {
    const http = new FakeHttpPort(inaResponse([{ procid: 1, obs_count: 10 }]));

    await expect(
      new InaPercentilesSource(new InaApiClient(http)).fetchPercentiles({
        stationId: "34",
        variableId: 2,
      }),
    ).resolves.toBeNull();
  });

  it("devuelve null cuando la serie no publica percentiles", async () => {
    const http = new FakeHttpPort((request) =>
      inaResponse(requestParameters(request).get("request") === "series" ? [seriesRows[1]] : []),
    );

    await expect(
      new InaPercentilesSource(new InaApiClient(http)).fetchPercentiles({
        stationId: "34",
        variableId: 2,
      }),
    ).resolves.toBeNull();
  });
});
