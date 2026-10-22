import { describe, expect, it } from "vitest";
import { InaApiClient, InaApiError, inaBaseUrl } from "@/infrastructure/ina/inaApiClient";
import {
  FakeHttpPort,
  inaResponse,
  jsonResponse,
  requestParameters,
} from "../../support/fakeHttpPort";

describe("InaApiClient", () => {
  it("envia un POST de formulario con el recurso, el formato y los parametros", async () => {
    const http = new FakeHttpPort(inaResponse([{ sitecode: 34 }]));
    const client = new InaApiClient(http);
    const controller = new AbortController();

    await client.request("datos", { siteCode: "34" }, controller.signal);

    const request = http.requests[0];

    if (request === undefined) {
      throw new Error("No se registro la peticion al INA.");
    }

    expect(request.url).toBe(inaBaseUrl);
    expect(request.method).toBe("POST");
    expect(request.headers).toEqual({ "content-type": "application/x-www-form-urlencoded" });

    const parameters = requestParameters(request);
    expect(parameters.get("request")).toBe("datos");
    expect(parameters.get("format")).toBe("json");
    expect(parameters.get("siteCode")).toBe("34");
    expect(http.signals[0]).toBe(controller.signal);
  });

  it("permite apuntar a otra base", async () => {
    const http = new FakeHttpPort(inaResponse([]));
    const client = new InaApiClient(http, "https://espejo.test/datos/");

    await client.request("variables");

    expect(http.requests[0]?.url).toBe("https://espejo.test/datos/");
  });

  it("descarta las filas que no son objetos", async () => {
    const http = new FakeHttpPort(inaResponse([{ sitecode: 34 }, "texto", null, [1, 2]]));

    const rows = await new InaApiClient(http).request("estaciones");

    expect(rows).toEqual([{ sitecode: 34 }]);
  });

  it("interpreta una respuesta sin datos como una lista vacia", async () => {
    const http = new FakeHttpPort(
      jsonResponse({ mensaje: { message: "Not found", error: "No se encontraron observaciones" } }),
    );

    await expect(new InaApiClient(http).request("percentiles")).resolves.toEqual([]);
  });

  it("falla cuando el estado no es exitoso", async () => {
    const http = new FakeHttpPort({ status: 500, headers: {}, body: "caido" });

    const error = await new InaApiClient(http).request("estaciones").catch((cause) => cause);

    expect(error).toBeInstanceOf(InaApiError);
    expect(error).toMatchObject({ resource: "estaciones", status: 500 });
  });

  it("falla cuando la respuesta no es JSON", async () => {
    const http = new FakeHttpPort({ status: 200, headers: {}, body: "<html>error</html>" });

    await expect(new InaApiClient(http).request("datos")).rejects.toThrow(InaApiError);
  });

  it("falla cuando el sobre no es un objeto", async () => {
    const http = new FakeHttpPort({ status: 200, headers: {}, body: "[]" });

    await expect(new InaApiClient(http).request("datos")).rejects.toThrow("sobre inesperado");
  });
});
