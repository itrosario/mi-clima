import { afterEach, describe, expect, it, vi } from "vitest";
import { FetchHttpClient } from "@/infrastructure/http/fetchHttpClient";

const url = "https://example.test/data";

function jsonResponse(body: string, status = 200): Response {
  return new Response(body, { status, headers: { "content-type": "application/json" } });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("FetchHttpClient", () => {
  it("devuelve estado, encabezados y cuerpo de una respuesta exitosa", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => jsonResponse('{"ok":true}'));
    const client = new FetchHttpClient({ fetchImplementation });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toBe("application/json");
    expect(response.body).toBe('{"ok":true}');
  });

  it("envia metodo, encabezados y cuerpo cuando la peticion los declara", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(async () => jsonResponse("{}"));
    const client = new FetchHttpClient({ fetchImplementation });

    await client.send({
      url,
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: "request=estaciones",
    });

    const init = fetchImplementation.mock.calls[0]?.[1];

    expect(init?.method).toBe("POST");
    expect(init?.headers).toEqual({ "content-type": "application/x-www-form-urlencoded" });
    expect(init?.body).toBe("request=estaciones");
    expect(init?.signal).toBeInstanceOf(AbortSignal);
  });

  it("reintenta un 500 y devuelve la respuesta siguiente", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse("error", 500))
      .mockResolvedValueOnce(jsonResponse("ok"));
    const sleep = vi.fn(async () => undefined);
    const client = new FetchHttpClient({ fetchImplementation, sleep, retryDelayMilliseconds: 10 });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(200);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it("reintenta un 429 antes de darse por vencido", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse("lento", 429))
      .mockResolvedValueOnce(jsonResponse("ok"));
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
    });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(200);
  });

  it("devuelve el ultimo 5xx cuando se agotan los intentos", async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse("caido", 503));
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
      maxAttempts: 2,
    });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(503);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("no reintenta un 4xx", async () => {
    const fetchImplementation = vi.fn(async () => jsonResponse("no encontrado", 404));
    const client = new FetchHttpClient({ fetchImplementation, sleep: async () => undefined });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(404);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("reintenta un fallo de red y luego resuelve", async () => {
    const fetchImplementation = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("fetch failed"))
      .mockResolvedValueOnce(jsonResponse("ok"));
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
    });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(200);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("propaga un fallo de red cuando se agotan los intentos", async () => {
    const networkError = new TypeError("fetch failed");
    const fetchImplementation = vi.fn(async () => {
      throw networkError;
    });
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
      maxAttempts: 2,
    });

    await expect(client.send({ url, method: "GET" })).rejects.toBe(networkError);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("propaga de inmediato un error que no es de red", async () => {
    const programmingError = new Error("boom");
    const fetchImplementation = vi.fn(async () => {
      throw programmingError;
    });
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
    });

    await expect(client.send({ url, method: "GET" })).rejects.toBe(programmingError);
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("no reintenta cuando la senal externa ya fue abortada", async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImplementation = vi.fn<typeof fetch>(
      async (_input: RequestInfo | URL, init?: RequestInit) => {
        init?.signal?.throwIfAborted();
        return jsonResponse("ok");
      },
    );
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
    });

    await expect(client.send({ url, method: "GET" }, controller.signal)).rejects.toThrow();
    expect(fetchImplementation).toHaveBeenCalledTimes(1);
  });

  it("reintenta un intento vencido por tiempo limite y luego resuelve", async () => {
    let calls = 0;
    const fetchImplementation = vi.fn<typeof fetch>(
      (_input: RequestInfo | URL, init?: RequestInit) => {
        calls += 1;

        if (calls === 1) {
          return new Promise<Response>((_resolve, reject) => {
            init?.signal?.addEventListener("abort", () => {
              reject(new DOMException("Aborted", "AbortError"));
            });
          });
        }

        return Promise.resolve(jsonResponse("ok"));
      },
    );
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
      timeoutMilliseconds: 5,
      maxAttempts: 2,
    });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(200);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });

  it("propaga el vencimiento cuando no quedan intentos", async () => {
    const fetchImplementation = vi.fn<typeof fetch>(
      (_input: RequestInfo | URL, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => {
            reject(new DOMException("Aborted", "AbortError"));
          });
        }),
    );
    const client = new FetchHttpClient({
      fetchImplementation,
      sleep: async () => undefined,
      timeoutMilliseconds: 5,
      maxAttempts: 1,
    });

    await expect(client.send({ url, method: "GET" })).rejects.toThrow("Aborted");
  });

  it("usa el fetch global cuando no se inyecta una implementacion", async () => {
    const globalFetch = vi.spyOn(globalThis, "fetch").mockResolvedValue(jsonResponse("ok"));
    const client = new FetchHttpClient();

    const response = await client.send({ url, method: "GET" });

    expect(response.body).toBe("ok");
    expect(globalFetch).toHaveBeenCalledTimes(1);
  });

  it("espera de verdad entre intentos cuando no se inyecta el temporizador", async () => {
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse("error", 500))
      .mockResolvedValueOnce(jsonResponse("ok"));
    const client = new FetchHttpClient({ fetchImplementation, retryDelayMilliseconds: 0 });

    const response = await client.send({ url, method: "GET" });

    expect(response.status).toBe(200);
    expect(fetchImplementation).toHaveBeenCalledTimes(2);
  });
});
