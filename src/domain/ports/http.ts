/**
 * Puerto HTTP.
 *
 * Centraliza el transporte: metodo, cuerpo, encabezados, tiempo limite y
 * reintentos viven en un unico adaptador. Los adaptadores de datos (INA,
 * Open-Meteo) describen la peticion y no saben como se ejecuta.
 */

export type HttpMethod = "GET" | "POST";

export interface HttpRequest {
  readonly url: string;
  readonly method: HttpMethod;
  readonly headers?: Readonly<Record<string, string>>;
  readonly body?: string;
}

export interface HttpResponse {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly body: string;
}

export interface HttpPort {
  /** Ejecuta la peticion y devuelve la respuesta, incluso si el estado no es 2xx. */
  send(request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse>;
}
