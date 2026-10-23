/**
 * Cliente del proxy de Prefectura.
 *
 * El Worker devuelve un JSON ya normalizado; este adaptador solo traduce las
 * fechas ISO a objetos `Date` y conserva el resto del contrato.
 */

import type { HttpPort } from "@/domain/ports/http";
import type { PrefecturaSource } from "@/domain/ports/prefecturaSource";
import type {
  PrefecturaReading,
  PrefecturaSnapshot,
  PrefecturaTrend,
} from "@/domain/prefectura/types";

export const prefecturaEndpoint = "/api/prefectura";

interface ReadingPayload {
  readonly portId: number;
  readonly portName: string;
  readonly riverName: string;
  readonly levelMetres: number | null;
  readonly variationMetres: number | null;
  readonly periodHours: number | null;
  readonly observedAt: string | null;
  readonly trend: PrefecturaTrend;
  readonly alertLevelMetres: number | null;
  readonly evacuationLevelMetres: number | null;
  readonly previousLevelMetres: number | null;
  readonly previousObservedAt: string | null;
}

interface SnapshotPayload {
  readonly fetchedAt: string;
  readonly sourceName: string;
  readonly readings: readonly ReadingPayload[];
}

export class PrefecturaApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`La Prefectura respondio con el estado ${status}.`);
    this.name = "PrefecturaApiError";
    this.status = status;
  }
}

function parseOptionalDate(value: string | null): Date | null {
  return value === null ? null : new Date(value);
}

function parseReading(payload: ReadingPayload): PrefecturaReading {
  return {
    portId: payload.portId,
    portName: payload.portName,
    riverName: payload.riverName,
    levelMetres: payload.levelMetres,
    variationMetres: payload.variationMetres,
    periodHours: payload.periodHours,
    observedAt: parseOptionalDate(payload.observedAt),
    trend: payload.trend,
    alertLevelMetres: payload.alertLevelMetres,
    evacuationLevelMetres: payload.evacuationLevelMetres,
    previousLevelMetres: payload.previousLevelMetres,
    previousObservedAt: parseOptionalDate(payload.previousObservedAt),
  };
}

export function parsePrefecturaSnapshotPayload(body: string): PrefecturaSnapshot {
  const payload = JSON.parse(body) as SnapshotPayload;

  return {
    fetchedAt: new Date(payload.fetchedAt),
    sourceName: payload.sourceName,
    readings: payload.readings.map(parseReading),
  };
}

export class PrefecturaApiSource implements PrefecturaSource {
  private readonly http: HttpPort;
  private readonly endpoint: string;

  constructor(http: HttpPort, endpoint: string = prefecturaEndpoint) {
    this.http = http;
    this.endpoint = endpoint;
  }

  async fetchSnapshot(signal?: AbortSignal): Promise<PrefecturaSnapshot> {
    const response = await this.http.send(
      { url: this.endpoint, method: "GET", headers: { accept: "application/json" } },
      signal,
    );

    if (response.status !== 200) {
      throw new PrefecturaApiError(response.status);
    }

    return parsePrefecturaSnapshotPayload(response.body);
  }
}
