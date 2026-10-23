import { afterEach, describe, expect, it, vi } from "vitest";
import { inaBaseUrl } from "@/infrastructure/ina/inaApiClient";
import type { WorkerCache } from "@/worker/edgeCache";
import { handleInaRequest } from "@/worker/inaWorker";
import workerEntry from "@/worker/index";

class FakeEdgeCache implements WorkerCache {
  readonly entries = new Map<string, Response>();
  readonly puts: string[] = [];

  async match(request: Request): Promise<Response | undefined> {
    return this.entries.get(request.url);
  }

  async put(request: Request, response: Response): Promise<void> {
    this.puts.push(request.url);
    this.entries.set(request.url, response);
  }
}

function inaRequest(query = "request=datos&siteCode=34"): Request {
  return new Request(`https://mi-clima.test/api/ina?${query}`);
}

function fetchResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleInaRequest", () => {
  it("reenvia el formulario al INA y cachea la respuesta", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = vi.fn<typeof fetch>(async () => fetchResponse('{"data":[]}'));

    const response = await handleInaRequest(
      inaRequest("request=datos&siteCode=34&timeStart=2026-10-22T12:00:00"),
      { cache, fetchImplementation: fetchMock },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(inaBaseUrl);

    const init = fetchMock.mock.calls[0]?.[1];
    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({
      accept: "application/json",
      "content-type": "application/x-www-form-urlencoded",
    });
    expect(new URLSearchParams(String(init?.body)).get("request")).toBe("datos");
    expect(new URLSearchParams(String(init?.body)).get("siteCode")).toBe("34");
    expect(new URLSearchParams(String(init?.body)).get("format")).toBe("json");
    expect(cache.puts).toHaveLength(1);
  });

  it("reutiliza la cache aunque cambie el orden de los parametros", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = vi.fn<typeof fetch>(async () => fetchResponse('{"data":[]}'));

    await handleInaRequest(inaRequest("request=datos&siteCode=34"), {
      cache,
      fetchImplementation: fetchMock,
    });
    const response = await handleInaRequest(inaRequest("siteCode=34&request=datos"), {
      cache,
      fetchImplementation: fetchMock,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("cachea el catalogo durante seis horas y los percentiles durante un dia", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = vi.fn<typeof fetch>(async () => fetchResponse('{"data":[]}'));

    const catalog = await handleInaRequest(inaRequest("request=estaciones"), {
      cache,
      fetchImplementation: fetchMock,
    });
    const percentiles = await handleInaRequest(inaRequest("request=percentiles"), {
      cache,
      fetchImplementation: fetchMock,
    });

    expect(catalog.headers.get("cache-control")).toBe("public, max-age=21600");
    expect(percentiles.headers.get("cache-control")).toBe("public, max-age=86400");
  });

  it("funciona sin cache ni fetch inyectados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => fetchResponse('{"data":[]}')),
    );

    const response = await handleInaRequest(inaRequest());

    expect(response.status).toBe(200);
    vi.unstubAllGlobals();
  });

  it("rechaza metodos que no sean GET", async () => {
    const response = await handleInaRequest(
      new Request("https://mi-clima.test/api/ina?request=datos", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("responde 404 fuera de su ruta", async () => {
    const response = await handleInaRequest(new Request("https://mi-clima.test/api/otra"));

    expect(response.status).toBe(404);
  });

  it("rechaza recursos vacios o desconocidos", async () => {
    const missing = await handleInaRequest(inaRequest("siteCode=34"));
    const unknown = await handleInaRequest(inaRequest("request=variables"));

    expect(missing.status).toBe(400);
    expect(unknown.status).toBe(400);
  });

  it("informa 502 cuando la fuente no es alcanzable", async () => {
    const response = await handleInaRequest(inaRequest(), {
      fetchImplementation: vi.fn<typeof fetch>(async () => {
        throw new Error("sin red");
      }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_unavailable" });
  });

  it("propaga el error de la fuente y no lo cachea", async () => {
    const cache = new FakeEdgeCache();
    const response = await handleInaRequest(inaRequest(), {
      cache,
      fetchImplementation: vi.fn<typeof fetch>(async () => new Response(null, { status: 500 })),
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(cache.puts).toEqual([]);
  });
});

describe("workerEntry INA", () => {
  it("enruta las consultas del INA al proxy", async () => {
    const cache = new FakeEdgeCache();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => fetchResponse('{"data":[]}')),
    );
    vi.stubGlobal("caches", { default: cache });

    const response = await workerEntry.fetch(inaRequest());

    expect(response.status).toBe(200);
    expect(cache.puts).toHaveLength(1);
  });
});
