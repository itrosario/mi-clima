/**
 * Cliente del servicio de datos del INA.
 *
 * El organismo solo responde a `POST` con formulario codificado: los
 * parametros enviados por `GET` se ignoran en silencio. Este cliente encapsula
 * ese protocolo, valida el sobre de respuesta y deja a los adaptadores el
 * trabajo de traducir filas a objetos del dominio.
 */

import type { HttpPort } from "@/domain/ports/http";
import { isRecord } from "../parsing/jsonValues";

export const inaBaseUrl = "https://alerta.ina.gob.ar/pub/datos/";

export type InaRow = Readonly<Record<string, unknown>>;

export class InaApiError extends Error {
  readonly resource: string;
  readonly status: number | null;

  constructor(message: string, resource: string, status: number | null = null) {
    super(message);
    this.name = "InaApiError";
    this.resource = resource;
    this.status = status;
  }
}

function isSuccessfulStatus(status: number): boolean {
  return status >= 200 && status < 300;
}

export class InaApiClient {
  private readonly http: HttpPort;
  private readonly baseUrl: string;

  constructor(http: HttpPort, baseUrl: string = inaBaseUrl) {
    this.http = http;
    this.baseUrl = baseUrl;
  }

  /**
   * Ejecuta un recurso y devuelve sus filas.
   *
   * Una respuesta sin `data` significa "sin resultados" (el INA contesta 200
   * con un mensaje), no un error de transporte: se devuelve una lista vacia.
   */
  async request(
    resource: string,
    parameters: Readonly<Record<string, string>> = {},
    signal?: AbortSignal,
  ): Promise<readonly InaRow[]> {
    const body = new URLSearchParams({ request: resource, format: "json", ...parameters });

    const response = await this.http.send(
      {
        url: this.baseUrl,
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      },
      signal,
    );

    if (!isSuccessfulStatus(response.status)) {
      throw new InaApiError(
        `El INA respondio ${response.status} al pedir "${resource}".`,
        resource,
        response.status,
      );
    }

    return this.readRows(response.body, resource);
  }

  private readRows(payload: string, resource: string): readonly InaRow[] {
    let parsedPayload: unknown;

    try {
      parsedPayload = JSON.parse(payload);
    } catch {
      throw new InaApiError(`El INA devolvio una respuesta ilegible para "${resource}".`, resource);
    }

    if (!isRecord(parsedPayload)) {
      throw new InaApiError(`El INA devolvio un sobre inesperado para "${resource}".`, resource);
    }

    const data = parsedPayload.data;

    if (!Array.isArray(data)) {
      return [];
    }

    return data.filter(isRecord);
  }
}
