/**
 * Puerto de percentiles historicos.
 *
 * Es la tabla de referencia contra la que se calcula la anomalia. Se consulta
 * bajo demanda porque la respuesta ronda los seis megabytes por serie.
 */

import type { PercentileTable } from "../analytics/anomaly";
import type { StationId, VariableId } from "../catalog/types";

export interface PercentilesRequest {
  readonly stationId: StationId;
  readonly variableId: VariableId;
}

export interface PercentilesSource {
  /** Devuelve `null` cuando la estacion no publica percentiles para la variable. */
  fetchPercentiles(
    request: PercentilesRequest,
    signal?: AbortSignal,
  ): Promise<PercentileTable | null>;
}
