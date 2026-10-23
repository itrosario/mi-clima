import { afterEach, describe, expect, it, vi } from "vitest";
import { openMeteoForecastUrl } from "@/infrastructure/openMeteo/openMeteoSource";
import type { WorkerCache } from "@/worker/edgeCache";
import workerEntry from "@/worker/index";
import { handleWeatherRequest } from "@/worker/weatherWorker";

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

const weatherPayload = '{"current":{"temperature_2m":18.4}}';

function weatherRequest(
  query = "latitude=-32.95&longitude=-60.63&current=temperature_2m&timezone=America%2FArgentina%2FCordoba",
): Request {
  return new Request(`https://mi-clima.test/api/clima?${query}`);
}

function fetchResponse(body: string, status = 200): Response {
  return new Response(body, { status });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("handleWeatherRequest", () => {
  it("reenvia solo los parametros permitidos y cachea la respuesta", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = vi.fn<typeof fetch>(async () => fetchResponse(weatherPayload));

    const response = await handleWeatherRequest(
      weatherRequest(
        "latitude=-32.95&longitude=-60.63&current=temperature_2m&daily=weather_code&timezone=America%2FArgentina%2FCordoba&forecast_days=7&wind_speed_unit=kmh&ignored=evil",
      ),
      { cache, fetchImplementation: fetchMock },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("public, max-age=3600");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.origin + url.pathname).toBe(openMeteoForecastUrl);
    expect(url.searchParams.get("latitude")).toBe("-32.95");
    expect(url.searchParams.get("longitude")).toBe("-60.63");
    expect(url.searchParams.get("current")).toBe("temperature_2m");
    expect(url.searchParams.get("daily")).toBe("weather_code");
    expect(url.searchParams.get("timezone")).toBe("America/Argentina/Cordoba");
    expect(url.searchParams.get("forecast_days")).toBe("7");
    expect(url.searchParams.get("wind_speed_unit")).toBe("kmh");
    expect(url.searchParams.has("ignored")).toBe(false);
    expect(cache.puts).toHaveLength(1);
  });

  it("reutiliza la cache aunque cambie el orden de los parametros", async () => {
    const cache = new FakeEdgeCache();
    const fetchMock = vi.fn<typeof fetch>(async () => fetchResponse(weatherPayload));

    await handleWeatherRequest(weatherRequest("latitude=-32.95&longitude=-60.63"), {
      cache,
      fetchImplementation: fetchMock,
    });
    const response = await handleWeatherRequest(
      weatherRequest("longitude=-60.63&latitude=-32.95"),
      {
        cache,
        fetchImplementation: fetchMock,
      },
    );

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("omite los parametros opcionales ausentes", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => fetchResponse(weatherPayload));

    await handleWeatherRequest(weatherRequest("latitude=-32.95&longitude=-60.63"), {
      fetchImplementation: fetchMock,
    });

    const url = new URL(String(fetchMock.mock.calls[0]?.[0]));

    expect(url.searchParams.has("current")).toBe(false);
    expect(url.searchParams.get("latitude")).toBe("-32.95");
  });

  it("funciona sin cache ni fetch inyectados", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => fetchResponse(weatherPayload)),
    );

    const response = await handleWeatherRequest(weatherRequest());

    expect(response.status).toBe(200);
  });

  it("rechaza metodos que no sean GET", async () => {
    const response = await handleWeatherRequest(
      new Request("https://mi-clima.test/api/clima?latitude=-32&longitude=-60", {
        method: "POST",
      }),
    );

    expect(response.status).toBe(405);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("responde 404 fuera de su ruta", async () => {
    const response = await handleWeatherRequest(new Request("https://mi-clima.test/api/otra"));

    expect(response.status).toBe(404);
  });

  it("exige latitud y longitud", async () => {
    const withoutLatitude = await handleWeatherRequest(weatherRequest("longitude=-60.63"));
    const withoutLongitude = await handleWeatherRequest(weatherRequest("latitude=-32.95"));

    expect(withoutLatitude.status).toBe(400);
    expect(withoutLongitude.status).toBe(400);
  });

  it("informa 502 cuando la fuente no es alcanzable", async () => {
    const response = await handleWeatherRequest(weatherRequest(), {
      fetchImplementation: vi.fn<typeof fetch>(async () => {
        throw new Error("sin red");
      }),
    });

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "upstream_unavailable" });
  });

  it("propaga el error de la fuente y no lo cachea", async () => {
    const cache = new FakeEdgeCache();
    const response = await handleWeatherRequest(weatherRequest(), {
      cache,
      fetchImplementation: vi.fn<typeof fetch>(async () => new Response(null, { status: 500 })),
    });

    expect(response.status).toBe(500);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(cache.puts).toEqual([]);
  });
});

describe("workerEntry weather", () => {
  it("enruta las consultas de clima al proxy", async () => {
    const cache = new FakeEdgeCache();
    vi.stubGlobal(
      "fetch",
      vi.fn<typeof fetch>(async () => fetchResponse(weatherPayload)),
    );
    vi.stubGlobal("caches", { default: cache });

    const response = await workerEntry.fetch(weatherRequest());

    expect(response.status).toBe(200);
    expect(cache.puts).toHaveLength(1);
  });
});
