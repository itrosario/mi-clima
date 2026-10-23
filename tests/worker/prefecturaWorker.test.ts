import { afterEach, describe, expect, it, vi } from "vitest";
import workerEntry from "@/worker/index";
import { handlePrefecturaRequest, type WorkerCache } from "@/worker/prefecturaWorker";

const sourceRow = `
  <tr>
    <th data-label="Puerto:">ROSARIO</th>
    <td data-label="Rio:">PARANA</td>
    <td data-label="Ultimo Registro:">3.57</td>
    <td data-label="Variacion">0.03</td>
    <td data-label="Periodo">12</td>
    <td data-label="Fecha Hora:">22/OCT/26 - 1200</td>
    <td data-label="Estado:">CRECE</td>
    <td data-label="Registro Anterior:">3.54</td>
    <td data-label="Fecha Anterior:">22/OCT/26 - 0000</td>
    <td data-label="Alerta:">5.00</td>
    <td data-label="Evacuacion:">5.30</td>
    <td><a href="/alturas/?page=historico&tiempo=7&id=280">grafico</a></td>
  </tr>
`;

const rowWithoutDates = `
  <tr>
    <th data-label="Puerto:">PUERTO SIN FECHA</th>
    <td data-label="Rio:">PARANA</td>
    <td><a href="/alturas/?page=historico&tiempo=7&id=7">grafico</a></td>
  </tr>
`;

const sourceHtml = `<table>${sourceRow}${rowWithoutDates}</table>`;
const historyHtml = `<script>data: [[1792508400000,3.52],[1792465200000,3.49]]</script>`;

class FakeEdgeCache implements WorkerCache {
  readonly entries = new Map<string, Response>();
  readonly matches: string[] = [];
  readonly puts: string[] = [];

  async match(request: Request): Promise<Response | undefined> {
    this.matches.push(request.url);

    return this.entries.get(request.url);
  }

  async put(request: Request, response: Response): Promise<void> {
    this.puts.push(request.url);
    this.entries.set(request.url, response);
  }
}

function createFetchResponse(html: string, status = 200): Response {
  return new Response(html, { status });
}

function createFetchMock(response: Response | (() => Promise<Response>)) {
  if (typeof response === "function") {
    return vi.fn<typeof fetch>(response);
  }

  return vi.fn<typeof fetch>(async () => response);
}

function snapshotRequest(): Request {
  return new Request("https://mi-clima.test/api/prefectura");
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handlePrefecturaRequest", () => {
  it("publica el snapshot normalizado y lo guarda en cache", async () => {
    const cache = new FakeEdgeCache();
    const now = new Date("2026-10-22T16:00:00.000Z");
    const fetchMock = createFetchMock(createFetchResponse(sourceHtml));

    const response = await handlePrefecturaRequest(snapshotRequest(), {
      cache,
      fetchImplementation: fetchMock,
      now: () => now,
    });
    const payload = (await response.json()) as {
      fetchedAt: string;
      sourceName: string;
      readings: { portName: string; observedAt: string | null; trend: string }[];
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=60");
    expect(payload.fetchedAt).toBe(now.toISOString());
    expect(payload.sourceName).toBe("Prefectura Naval Argentina");
    expect(payload.readings).toHaveLength(2);
    expect(payload.readings[0]?.observedAt).toBe("2026-10-22T15:00:00.000Z");
    expect(payload.readings[0]?.trend).toBe("rising");
    expect(payload.readings[1]?.observedAt).toBeNull();
    expect(cache.puts).toEqual(["https://mi-clima.test/api/prefectura"]);
  });

  it("devuelve la copia del borde sin consultar la fuente", async () => {
    const cache = new FakeEdgeCache();
    const cached = new Response("cacheado", { status: 200 });
    cache.entries.set("https://mi-clima.test/api/prefectura", cached);
    const fetchMock = createFetchMock(createFetchResponse(sourceHtml));

    const response = await handlePrefecturaRequest(snapshotRequest(), {
      cache,
      fetchImplementation: fetchMock,
    });

    expect(await response.text()).toBe("cacheado");
    expect(fetchMock).not.toHaveBeenCalled();
    expect(cache.puts).toEqual([]);
  });

  it("funciona sin cache ni reloj inyectados", async () => {
    const fetchMock = createFetchMock(createFetchResponse(sourceHtml));

    const response = await handlePrefecturaRequest(snapshotRequest(), {
      fetchImplementation: fetchMock,
    });

    expect(response.status).toBe(200);
  });

  it("rechaza metodos que no sean GET", async () => {
    const response = await handlePrefecturaRequest(
      new Request("https://mi-clima.test/api/prefectura", { method: "POST" }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("responde 404 para rutas desconocidas", async () => {
    const response = await handlePrefecturaRequest(new Request("https://mi-clima.test/api/otra"));

    expect(response.status).toBe(404);
  });

  it("informa 502 cuando la fuente responde con error", async () => {
    const response = await handlePrefecturaRequest(snapshotRequest(), {
      fetchImplementation: createFetchMock(createFetchResponse("error", 500)),
    });

    expect(response.status).toBe(502);
  });

  it("informa 502 cuando la fuente no es alcanzable", async () => {
    const response = await handlePrefecturaRequest(snapshotRequest(), {
      fetchImplementation: createFetchMock(async () => {
        throw new Error("sin red");
      }),
    });

    expect(response.status).toBe(502);
  });

  it("informa 502 cuando el HTML no trae puertos", async () => {
    const response = await handlePrefecturaRequest(snapshotRequest(), {
      fetchImplementation: createFetchMock(createFetchResponse("<html></html>")),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "unexpected_source_payload" });
  });

  it("no cachea respuestas con error", async () => {
    const cache = new FakeEdgeCache();
    const response = await handlePrefecturaRequest(snapshotRequest(), {
      cache,
      fetchImplementation: createFetchMock(createFetchResponse("error", 500)),
    });

    expect(response.status).toBe(502);
    expect(cache.puts).toEqual([]);
  });

  it("publica la serie historica del puerto pedido", async () => {
    const fetchMock = createFetchMock(createFetchResponse(historyHtml));
    const now = new Date("2026-10-22T16:00:00.000Z");

    const response = await handlePrefecturaRequest(
      new Request("https://mi-clima.test/api/prefectura/historico?id=280"),
      { fetchImplementation: fetchMock, now: () => now },
    );
    const payload = (await response.json()) as {
      portId: number;
      points: { timestamp: string; value: number }[];
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=300");
    expect(payload.portId).toBe(280);
    expect(payload.points).toHaveLength(2);
    expect(payload.points[0]).toEqual({
      timestamp: "2026-10-20T03:00:00.000Z",
      value: 3.49,
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain("page=historico&tiempo=7&id=280");
  });

  it("rechaza un identificador de puerto invalido", async () => {
    const missing = await handlePrefecturaRequest(
      new Request("https://mi-clima.test/api/prefectura/historico"),
    );
    const invalid = await handlePrefecturaRequest(
      new Request("https://mi-clima.test/api/prefectura/historico?id=abc"),
    );

    expect(missing.status).toBe(400);
    expect(invalid.status).toBe(400);
  });

  it("informa 502 cuando la pagina historica no trae puntos", async () => {
    const response = await handlePrefecturaRequest(
      new Request("https://mi-clima.test/api/prefectura/historico?id=280"),
      { fetchImplementation: createFetchMock(createFetchResponse("<html></html>")) },
    );

    expect(response.status).toBe(502);
  });

  it("informa 502 cuando la pagina historica no es alcanzable", async () => {
    const response = await handlePrefecturaRequest(
      new Request("https://mi-clima.test/api/prefectura/historico?id=280"),
      {
        fetchImplementation: createFetchMock(async () => {
          throw new Error("sin red");
        }),
      },
    );

    expect(response.status).toBe(502);
  });
});

describe("workerEntry", () => {
  it("usa el cache del borde cuando el runtime lo expone", async () => {
    const cache = new FakeEdgeCache();
    vi.stubGlobal("fetch", createFetchMock(createFetchResponse(sourceHtml)));
    vi.stubGlobal("caches", { default: cache });

    const response = await workerEntry.fetch(snapshotRequest());

    expect(response.status).toBe(200);
    expect(cache.puts).toHaveLength(1);
  });

  it("funciona cuando el runtime no expone cache", async () => {
    vi.stubGlobal("fetch", createFetchMock(createFetchResponse(sourceHtml)));
    vi.stubGlobal("caches", undefined);

    const response = await workerEntry.fetch(snapshotRequest());

    expect(response.status).toBe(200);
  });
});
