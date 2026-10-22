/**
 * Telemetria hidrometrica del INA.
 *
 * El recurso `datos` acepta una sola estacion y una sola variable por
 * consulta, y devuelve los valores en hora oficial argentina.
 */

import type { HydrologyRequest, HydrologySource } from "@/domain/ports/hydrologySource";
import { createSeries } from "@/domain/telemetry/series";
import type { TelemetryPoint } from "@/domain/telemetry/types";
import type { InaApiClient } from "./inaApiClient";
import { formatInaTimestamp, parseInaObservation, unitForVariable } from "./inaPayloads";

function isPoint(point: TelemetryPoint | null): point is TelemetryPoint {
  return point !== null;
}

export class InaHydrologySource implements HydrologySource {
  private readonly client: InaApiClient;

  constructor(client: InaApiClient) {
    this.client = client;
  }

  async fetchSeries(request: HydrologyRequest, signal?: AbortSignal) {
    const rows = await this.client.request(
      "datos",
      {
        timeStart: formatInaTimestamp(request.from),
        timeEnd: formatInaTimestamp(request.to),
        siteCode: request.stationId,
        varId: String(request.variableId),
      },
      signal,
    );

    const points = rows.map(parseInaObservation).filter(isPoint);

    return createSeries(
      request.stationId,
      request.variableId,
      unitForVariable(request.variableId),
      points,
    );
  }
}
