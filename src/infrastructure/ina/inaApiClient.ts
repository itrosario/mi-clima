/**
 * Cliente del servicio de datos del INA.
 *
 * El organismo solo responde a `POST` con formulario codificado: los
 * parametros enviados por `GET` se ignoran en silencio. En produccion el cliente
 * habla con el proxy del Worker, que reconstruye ese formulario y comparte la
 * cache de borde; en desarrollo puede usar el protocolo directo. El cliente
 * valida el sobre de respuesta y deja a los adaptadores el trabajo de traducir
 * filas a objetos del dominio.
 */

import type { HttpPort, HttpRequest } from "@/domain/ports/http";
import { isRecord } from "../parsing/jsonValues";

export const inaBaseUrl = "https://alerta.ina.gob.ar/pub/datos/";
export const inaProxyUrl = "/api/ina";

export type InaApiTransport = "direct" | "proxy";

export interface InaApiClientOptions {
  readonly baseUrl?: string;
  readonly transport?: InaApiTransport;
}

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
  private readonly transport: InaApiTransport;

  constructor(http: HttpPort, options: InaApiClientOptions | string = {}) {
    this.http = http;

    if (typeof options === "string") {
      this.baseUrl = options;
      this.transport = "direct";
    } else {
      this.baseUrl = options.baseUrl ?? inaProxyUrl;
      this.transport = options.transport ?? "proxy";
    }
  }

  /**
   * Ejecuta un recurso y devuelve sus filas.
   *
   * En produccion la consulta pasa por el proxy del Worker, que comparte la
   * cache entre visitantes. El modo directo solo se usa en desarrollo y en las
   * pruebas de integracion contra el protocolo real del INA.
   */
  async request(
    resource: string,
    parameters: Readonly<Record<string, string>> = {},
    signal?: AbortSignal,
  ): Promise<readonly InaRow[]> {
    const response = await this.http.send(this.buildRequest(resource, parameters), signal);

    if (!isSuccessfulStatus(response.status)) {
      throw new InaApiError(
        `El INA respondio ${response.status} al pedir "${resource}".`,
        resource,
        response.status,
      );
    }

    return this.readRows(response.body, resource);
  }

  private buildRequest(
    resource: string,
    parameters: Readonly<Record<string, string>>,
  ): HttpRequest {
    const body = new URLSearchParams({ request: resource, format: "json", ...parameters });

    if (this.transport === "direct") {
      return {
        url: this.baseUrl,
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      };
    }

    return {
      url: `${this.baseUrl}?${body.toString()}`,
      method: "GET",
      headers: { accept: "application/json" },
    };
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
