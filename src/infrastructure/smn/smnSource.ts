/**
 * Observaciones oficiales del SMN desde el navegador.
 *
 * Consume el proxy propio del sitio, que ya normalizo los archivos abiertos
 * del SMN. El navegador no descarga ni descomprime nada y no habla con el
 * origen externo.
 */

import type { HttpPort } from "@/domain/ports/http";
import type { OfficialWeatherSource } from "@/domain/ports/officialWeatherSource";
import type { OfficialWeatherSnapshot } from "@/domain/weather/official";
import { parseSmnSnapshot } from "./smnPayload";

export const smnProxyUrl = "/api/smn";

export class SmnSourceError extends Error {
  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "SmnSourceError";
    this.status = status;
  }

  readonly status: number | null;
}

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

export class SmnSource implements OfficialWeatherSource {
  private readonly http: HttpPort;
  private readonly baseUrl: string;

  constructor(http: HttpPort, baseUrl: string = smnProxyUrl) {
    this.http = http;
    this.baseUrl = baseUrl;
  }

  async fetchSnapshot(signal?: AbortSignal): Promise<OfficialWeatherSnapshot> {
    const response = await this.http.send({ url: this.baseUrl, method: "GET" }, signal);

    if (!isSuccessfulStatus(response.status)) {
      throw new SmnSourceError(`El SMN respondio ${response.status}.`, response.status);
    }

    let payload: unknown;

    try {
      payload = JSON.parse(response.body);
    } catch {
      throw new SmnSourceError("El SMN devolvio una respuesta ilegible.");
    }

    const snapshot = parseSmnSnapshot(payload);

    if (snapshot === null) {
      throw new SmnSourceError("El SMN devolvio una respuesta inesperada.");
    }

    return snapshot;
  }
}
