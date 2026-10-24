import { afterEach, describe, expect, it, vi } from "vitest";
import { smnStationsUrl } from "@/infrastructure/smn/smnUpstream";
import type { WorkerCache } from "@/worker/edgeCache";
import workerEntry from "@/worker/index";
import { handleSmnRequest } from "@/worker/smnWorker";
import { smnObservationsText, smnStationsText } from "../support/smnFixtures";
import { createZipFixture } from "../support/zipFixture";

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

function smnRequest(path = "/api/smn"): Request {
  return new Request(`https://mi-clima.test${path}`);
}

async function responseWithText(text: string): Promise<Response> {
  const bytes = await createZipFixture(text);

  return new Response(bytes.buffer as ArrayBuffer);
}

function stationAwareFetch(): typeof fetch {
  return vi.fn<typeof fetch>(async (input) => {
    const url = new URL(String(input));

    return responseWithText(
      url.toString() === smnStationsUrl ? smnStationsText : smnObservationsText,
    );
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleSmnRequest", () => {
  it("descarga, normaliza y cachea las observaciones", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = stationAwareFetch();

    const response = await handleSmnRequest(smnRequest(), {
      cache,
      fetchImplementation: fetchMock,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    const body = (await response.json()) as {
      observations: readonly { readonly stationName: string }[];
    };
    expect(body.observations[0]?.stationName).toBe("ROSARIO AERO");
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(cache.puts).toHaveLength(1);
  });

  it("reutiliza la respuesta guardada en el borde", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = stationAwareFetch();

    await handleSmnRequest(smnRequest(), { cache, fetchImplementation: fetchMock });
    const response = await handleSmnRequest(smnRequest("/api/smn?ignorado=1"), {
      cache,
      fetchImplementation: fetchMock,
    });

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("funciona sin cache ni fetch inyectados", async () => {
    vi.stubGlobal("fetch", stationAwareFetch());

    const response = await handleSmnRequest(smnRequest());

    expect(response.status).toBe(200);
  });

  it("rechaza metodos que no sean GET", async () => {
    const response = await handleSmnRequest(
      new Request("https://mi-clima.test/api/smn", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("responde 404 fuera de su ruta", async () => {
    const response = await handleSmnRequest(smnRequest("/api/otra"));

    expect(response.status).toBe(404);
  });

  it("informa 502 y no cachea cuando la fuente falla", async () => {
    const cache = new FakeEdgeCache();
    const response = await handleSmnRequest(smnRequest(), {
      cache,
      fetchImplementation: vi.fn<typeof fetch>(async () => {
        throw new Error("sin red");
      }),
    });

    expect(response.status).toBe(502);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(cache.puts).toEqual([]);
  });

  it("informa 502 cuando la fuente responde con error", async () => {
    const response = await handleSmnRequest(smnRequest(), {
      fetchImplementation: vi.fn<typeof fetch>(async () => new Response(null, { status: 503 })),
    });

    expect(response.status).toBe(502);
  });

  it("informa 502 cuando el archivo no es un ZIP valido", async () => {
    const response = await handleSmnRequest(smnRequest(), {
      fetchImplementation: vi.fn<typeof fetch>(async () => new Response("no es zip")),
    });

    expect(response.status).toBe(502);
  });
});

describe("workerEntry SMN", () => {
  it("enruta las consultas del SMN al proxy", async () => {
    const cache = new FakeEdgeCache();
    vi.stubGlobal("fetch", stationAwareFetch());
    vi.stubGlobal("caches", { default: cache });

    const response = await workerEntry.fetch(smnRequest());

    expect(response.status).toBe(200);
    expect(cache.puts).toHaveLength(1);
  });
});
