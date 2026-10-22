/**
 * Puerto de telemetria hidrometrica.
 *
 * Una consulta es siempre una estacion, una variable y un rango temporal: el
 * INA no acepta listas de estaciones en una sola llamada.
 */

import type { StationId, VariableId } from "../catalog/types";
import type { TelemetrySeries } from "../telemetry/types";

export interface HydrologyRequest {
  readonly stationId: StationId;
  readonly variableId: VariableId;
  readonly from: Date;
  readonly to: Date;
}

export interface HydrologySource {
  fetchSeries(request: HydrologyRequest, signal?: AbortSignal): Promise<TelemetrySeries>;
}
