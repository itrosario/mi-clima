/**
 * Alturas de Prefectura para las estaciones del corredor.
 *
 * El catalogo del INA identifica estaciones por codigo; Prefectura identifica
 * puertos por nombre. El emparejamiento se hace por nombre normalizado y solo
 * se conservan los puertos que pertenecen al corredor consultado.
 */

import type { Station } from "@/domain/catalog/types";
import type { PrefecturaSource } from "@/domain/ports/prefecturaSource";
import type { PrefecturaReading } from "@/domain/prefectura/types";

export interface CorridorPrefecturaReading {
  readonly reading: PrefecturaReading;
  readonly station: Station;
}

export interface CorridorPrefecturaView {
  readonly fetchedAt: Date;
  readonly sourceName: string;
  readonly readings: readonly CorridorPrefecturaReading[];
}

export interface PrefecturaDependencies {
  readonly source: PrefecturaSource;
}

/** Quita acentos, mayusculas y espacios repetidos para comparar nombres. */
export function normalizePortName(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export async function loadCorridorPrefecturaSnapshot(
  stations: readonly Station[],
  dependencies: PrefecturaDependencies,
  signal?: AbortSignal,
): Promise<CorridorPrefecturaView> {
  const snapshot = await dependencies.source.fetchSnapshot(signal);
  const stationsByName = new Map(
    stations.map((station) => [normalizePortName(station.name), station]),
  );
  const readings: CorridorPrefecturaReading[] = [];

  for (const reading of snapshot.readings) {
    const station = stationsByName.get(normalizePortName(reading.portName));
    if (station !== undefined) {
      readings.push({ reading, station });
    }
  }

  return {
    fetchedAt: snapshot.fetchedAt,
    sourceName: snapshot.sourceName,
    readings,
  };
}
