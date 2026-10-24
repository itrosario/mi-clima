import { describe, expect, it, vi } from "vitest";
import { smnProxyUrl } from "@/infrastructure/smn/smnSource";
import { loadSmnSnapshot } from "@/infrastructure/smn/smnUpstream";
import { smnObservationsText, smnStationsText } from "../../support/smnFixtures";
import { createZipFixture } from "../../support/zipFixture";

async function responseWithText(text: string): Promise<Response> {
  const bytes = await createZipFixture(text);
  return new Response(bytes.buffer as ArrayBuffer);
}

describe("loadSmnSnapshot", () => {
  it("descarga estaciones y observaciones, las cruza y las publica", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.get("dato") === "estaciones") {
        return responseWithText(smnStationsText);
      }
      return responseWithText(smnObservationsText);
    });

    const snapshot = await loadSmnSnapshot({ fetchImplementation: fetchMock });

    expect(snapshot.source).toBe("SMN - Servicio Meteorologico Nacional");
    expect(snapshot.observations).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const firstCall = String(fetchMock.mock.calls[0]?.[0]);
    expect(firstCall).toContain("ssl.smn.gob.ar");
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      headers: expect.objectContaining({
        referer: expect.any(String),
        "user-agent": expect.any(String),
      }),
    });
    expect(smnProxyUrl).toBe("/api/smn");
  });

  it("falla si la respuesta del SMN no es correcta", async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 503 }));

    await expect(loadSmnSnapshot({ fetchImplementation: fetchMock })).rejects.toBeInstanceOf(Error);
  });

  it("falla si el ZIP no es interpretable", async () => {
    const fetchMock = vi.fn<typeof fetch>(async (input) => {
      const url = new URL(String(input));
      if (url.searchParams.get("dato") === "estaciones") {
        return responseWithText(smnStationsText);
      }
      return new Response("no es zip");
    });

    await expect(loadSmnSnapshot({ fetchImplementation: fetchMock })).rejects.toBeInstanceOf(Error);
  });
});
