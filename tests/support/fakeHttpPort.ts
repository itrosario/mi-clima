import type { HttpPort, HttpRequest, HttpResponse } from "@/domain/ports/http";

type HttpHandler = (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;

/** Puerto HTTP falso: registra cada peticion y responde con un guion propio. */
export class FakeHttpPort implements HttpPort {
  readonly requests: HttpRequest[] = [];
  readonly signals: (AbortSignal | undefined)[] = [];
  private readonly handler: HttpHandler;

  constructor(handler: HttpHandler | HttpResponse) {
    this.handler = typeof handler === "function" ? handler : () => handler;
  }

  async send(request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse> {
    this.requests.push(request);
    this.signals.push(signal);

    return this.handler(request);
  }
}

export function jsonResponse(body: unknown): HttpResponse {
  return {
    status: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function inaResponse(rows: readonly unknown[]): HttpResponse {
  return jsonResponse({ requestHeader: { request: "test" }, data: rows });
}

export function requestParameters(request: HttpRequest): URLSearchParams {
  return new URLSearchParams(request.body ?? "");
}
