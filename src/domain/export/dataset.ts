/**
 * Armado de datasets exportables.
 *
 * Convierte estaciones y series de telemetria en una tabla plana con
 * procedencia. La misma funcion arma el archivo de una estacion y el dataset
 * maestro: cambia el conjunto de entrada, no el formato.
 */

import type { Station } from "../catalog/types";
import type { TelemetrySeries } from "../telemetry/types";
import type {
  DatasetMetadata,
  ExportColumn,
  ExportDataset,
  ExportTable,
  SourceAttribution,
} from "./types";

export interface SeriesExportInput {
  readonly station: Station;
  readonly series: TelemetrySeries;
  /** Nombre legible de la variable, ya traducido. */
  readonly variableName: string;
  /** Nombre del organismo o servicio que publico el dato. */
  readonly sourceName: string;
}

export interface DatasetDescriptor {
  readonly title: string;
  readonly slug: string;
  readonly generatedAt: Date;
  readonly sources: readonly SourceAttribution[];
}

export const telemetryColumns: readonly ExportColumn[] = [
  { key: "stationId", label: "station_id" },
  { key: "stationName", label: "station_name" },
  { key: "river", label: "river" },
  { key: "reach", label: "reach" },
  { key: "timestamp", label: "timestamp_utc" },
  { key: "variable", label: "variable" },
  { key: "unit", label: "unit" },
  { key: "value", label: "value" },
  { key: "source", label: "source" },
];

function collectCoverage(series: readonly TelemetrySeries[]): {
  from: Date | null;
  to: Date | null;
} {
  let from: Date | null = null;
  let to: Date | null = null;

  for (const currentSeries of series) {
    for (const point of currentSeries.points) {
      if (from === null || point.timestamp.getTime() < from.getTime()) {
        from = point.timestamp;
      }
      if (to === null || point.timestamp.getTime() > to.getTime()) {
        to = point.timestamp;
      }
    }
  }

  return { from, to };
}

/**
 * Construye el dataset a partir de las series seleccionadas.
 *
 * Una fila por observacion. El orden de las filas respeta el orden de entrada
 * y el de cada serie, ya normalizado por la capa de dominio.
 */
export function buildTelemetryDataset(
  inputs: readonly SeriesExportInput[],
  descriptor: DatasetDescriptor,
): ExportDataset {
  const rows = inputs.flatMap((input) =>
    input.series.points.map((point) => ({
      stationId: input.station.id,
      stationName: input.station.name,
      river: input.station.river.name,
      reach: input.station.reach.name,
      timestamp: point.timestamp.toISOString(),
      variable: input.variableName,
      unit: input.series.unit,
      value: point.value,
      source: input.sourceName,
    })),
  );

  const distinctStationIds = new Set(inputs.map((input) => input.station.id));
  const coverage = collectCoverage(inputs.map((input) => input.series));

  const table: ExportTable = {
    columns: telemetryColumns,
    rows,
  };

  const metadata: DatasetMetadata = {
    title: descriptor.title,
    slug: descriptor.slug,
    generatedAt: descriptor.generatedAt,
    sources: descriptor.sources,
    stationCount: distinctStationIds.size,
    rowCount: rows.length,
    coverageFrom: coverage.from,
    coverageTo: coverage.to,
  };

  return { metadata, table };
}
