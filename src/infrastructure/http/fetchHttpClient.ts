/**
 * Cliente HTTP del navegador.
 *
 * Concentra lo que ningun adaptador de datos deberia repetir: tiempo limite,
 * reintentos con espera creciente y traduccion de la respuesta a un objeto
 * plano. Reintenta solo cuando el fallo es transitorio (red o 5xx); un 4xx se
 * devuelve tal cual para que el adaptador decida.
 */

import type { HttpPort, HttpRequest, HttpResponse } from "@/domain/ports/http";

export interface FetchHttpClientOptions {
  /** Tiempo maximo por intento. */
  readonly timeoutMilliseconds?: number;
  /** Cantidad total de intentos, incluido el primero. */
  readonly maxAttempts?: number;
  /** Espera base entre intentos; crece de forma lineal. */
  readonly retryDelayMilliseconds?: number;
  /** Inyectable para que las pruebas no esperen de verdad. */
  readonly sleep?: (milliseconds: number) => Promise<void>;
  /** Inyectable para simular fallos de red. */
  readonly fetchImplementation?: typeof fetch;
}

const defaultOptions = {
  timeoutMilliseconds: 20_000,
  maxAttempts: 3,
  retryDelayMilliseconds: 400,
} as const;

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === "AbortError";
}

function defaultSleep(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

export class FetchHttpClient implements HttpPort {
  private readonly timeoutMilliseconds: number;
  private readonly maxAttempts: number;
  private readonly retryDelayMilliseconds: number;
  private readonly sleep: (milliseconds: number) => Promise<void>;
  private readonly fetchImplementation: typeof fetch;

  constructor(options: FetchHttpClientOptions = {}) {
    this.timeoutMilliseconds = options.timeoutMilliseconds ?? defaultOptions.timeoutMilliseconds;
    this.maxAttempts = options.maxAttempts ?? defaultOptions.maxAttempts;
    this.retryDelayMilliseconds =
      options.retryDelayMilliseconds ?? defaultOptions.retryDelayMilliseconds;
    this.sleep = options.sleep ?? defaultSleep;
    this.fetchImplementation = options.fetchImplementation ?? globalThis.fetch.bind(globalThis);
  }

  async send(request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse> {
    let attempt = 0;

    for (;;) {
      attempt += 1;

      try {
        const response = await this.attempt(request, signal);
        if (!isRetryableStatus(response.status) || attempt >= this.maxAttempts) {
          return response;
        }
      } catch (error) {
        const isTimeout = !signal?.aborted && isAbortError(error);
        const isLastAttempt = attempt >= this.maxAttempts;
        if (isLastAttempt || (!isTimeout && !isRetryableNetworkError(error))) {
          throw error;
        }
      }

      await this.sleep(this.retryDelayMilliseconds * attempt);
    }
  }

  private async attempt(request: HttpRequest, signal?: AbortSignal): Promise<HttpResponse> {
    const timeoutController = new AbortController();
    const timeoutIdentifier = setTimeout(() => timeoutController.abort(), this.timeoutMilliseconds);
    const combinedSignal = signal
      ? AbortSignal.any([signal, timeoutController.signal])
      : timeoutController.signal;

    try {
      const init: RequestInit = {
        method: request.method,
        signal: combinedSignal,
        ...(request.headers === undefined ? {} : { headers: request.headers }),
        ...(request.body === undefined ? {} : { body: request.body }),
      };
      const response = await this.fetchImplementation(request.url, init);

      return {
        status: response.status,
        headers: Object.fromEntries(response.headers.entries()),
        body: await response.text(),
      };
    } finally {
      clearTimeout(timeoutIdentifier);
    }
  }
}

function isRetryableNetworkError(error: unknown): boolean {
  return error instanceof TypeError;
}
