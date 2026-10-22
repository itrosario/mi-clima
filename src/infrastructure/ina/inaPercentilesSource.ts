/**
 * Percentiles historicos del INA.
 *
 * Para pedir la tabla hace falta el identificador interno de la serie, que el
 * recurso `series` resuelve filtrando por estacion y variable. Se elige la
 * medicion directa: las series simuladas o de traza no sirven como referencia
 * climatologica.
 */

import type { PercentileTable } from "@/domain/analytics/anomaly";
import type { PercentilesRequest, PercentilesSource } from "@/domain/ports/percentilesSource";
import { toFiniteNumber } from "../parsing/jsonValues";
import type { InaApiClient, InaRow } from "./inaApiClient";
import { parseInaPercentiles } from "./inaPayloads";

const directMeasurementProcedureId = 1;

function directSeriesRow(rows: readonly InaRow[]): InaRow | null {
  const directRows = rows.filter(
    (row) => toFiniteNumber(row.procid) === directMeasurementProcedureId,
  );

  if (directRows.length === 0) {
    return null;
  }

  return directRows.reduce((best, candidate) =>
    (toFiniteNumber(candidate.obs_count) ?? 0) > (toFiniteNumber(best.obs_count) ?? 0)
      ? candidate
      : best,
  );
}

export class InaPercentilesSource implements PercentilesSource {
  private readonly client: InaApiClient;

  constructor(client: InaApiClient) {
    this.client = client;
  }

  async fetchPercentiles(
    request: PercentilesRequest,
    signal?: AbortSignal,
  ): Promise<PercentileTable | null> {
    const seriesRows = await this.client.request(
      "series",
      { siteCode: request.stationId, varId: String(request.variableId) },
      signal,
    );

    const seriesRow = directSeriesRow(seriesRows);
    const seriesId = seriesRow === null ? null : toFiniteNumber(seriesRow.seriesid);

    if (seriesId === null) {
      return null;
    }

    const percentileRows = await this.client.request(
      "percentiles",
      { seriesId: String(seriesId) },
      signal,
    );

    return parseInaPercentiles(percentileRows, request.stationId, request.variableId);
  }
}
