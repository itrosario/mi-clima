/**
 * Catalogo de estaciones hidrometricas.
 *
 * Agrupa las estaciones por rio y tramo, permite buscarlas sin distinguir
 * mayusculas ni acentos y las ordena de forma determinista para que la
 * interfaz no cambie de orden entre consultas.
 */

import type { ReachId, RiverId, Station, StationId } from "./types";

export interface CatalogFilter {
  readonly riverId?: RiverId;
  readonly reachId?: ReachId;
  readonly networkId?: number;
  readonly searchTerm?: string;
}

export interface RiverSummary {
  readonly id: RiverId;
  readonly name: string;
  readonly reaches: readonly ReachSummary[];
  readonly stationCount: number;
}

export interface ReachSummary {
  readonly id: ReachId;
  readonly name: string;
  readonly stationCount: number;
}

export interface StationCatalog {
  readonly stations: readonly Station[];
  readonly rivers: readonly RiverSummary[];
  findById(stationId: StationId): Station | null;
  filter(criteria: CatalogFilter): readonly Station[];
}

/**
 * Reduce un texto a una forma comparable: minusculas y sin diacriticos.
 */
export function normalizeSearchText(rawText: string): string {
  return rawText
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();
}

function compareByName(left: Station, right: Station): number {
  return left.name.localeCompare(right.name, "es");
}

function buildRiverSummaries(stations: readonly Station[]): readonly RiverSummary[] {
  const riverIndex = new Map<
    RiverId,
    {
      name: string;
      reaches: Map<ReachId, { name: string; stationCount: number }>;
      stationCount: number;
    }
  >();

  for (const station of stations) {
    const existingRiver = riverIndex.get(station.river.id);
    const riverEntry = existingRiver ?? {
      name: station.river.name,
      reaches: new Map(),
      stationCount: 0,
    };

    if (!existingRiver) {
      riverIndex.set(station.river.id, riverEntry);
    }

    const existingReach = riverEntry.reaches.get(station.reach.id);
    riverEntry.reaches.set(station.reach.id, {
      name: existingReach?.name ?? station.reach.name,
      stationCount: (existingReach?.stationCount ?? 0) + 1,
    });
    riverEntry.stationCount += 1;
  }

  return [...riverIndex.entries()]
    .map(([riverId, riverEntry]) => ({
      id: riverId,
      name: riverEntry.name,
      stationCount: riverEntry.stationCount,
      reaches: [...riverEntry.reaches.entries()]
        .map(([reachId, reachEntry]) => ({
          id: reachId,
          name: reachEntry.name,
          stationCount: reachEntry.stationCount,
        }))
        .sort((left, right) => left.name.localeCompare(right.name, "es")),
    }))
    .sort((left, right) => left.name.localeCompare(right.name, "es"));
}

function matchesSearchTerm(station: Station, normalizedTerm: string): boolean {
  if (normalizedTerm.length === 0) {
    return true;
  }

  const haystack = normalizeSearchText(
    `${station.name} ${station.river.name} ${station.reach.name} ${station.networkName}`,
  );

  return haystack.includes(normalizedTerm);
}

/**
 * Construye el catalogo a partir de las estaciones publicadas.
 *
 * Las estaciones se ordenan por nombre para que el resultado sea estable
 * independientemente del orden de llegada desde la red.
 */
export function createStationCatalog(stations: readonly Station[]): StationCatalog {
  const orderedStations = [...stations].sort(compareByName);
  const riverSummaries = buildRiverSummaries(orderedStations);

  function filter(criteria: CatalogFilter): readonly Station[] {
    const normalizedTerm =
      criteria.searchTerm === undefined ? "" : normalizeSearchText(criteria.searchTerm);

    return orderedStations.filter((station) => {
      if (criteria.riverId !== undefined && station.river.id !== criteria.riverId) {
        return false;
      }
      if (criteria.reachId !== undefined && station.reach.id !== criteria.reachId) {
        return false;
      }
      if (criteria.networkId !== undefined && station.networkId !== criteria.networkId) {
        return false;
      }
      return matchesSearchTerm(station, normalizedTerm);
    });
  }

  function findById(stationId: StationId): Station | null {
    return orderedStations.find((station) => station.id === stationId) ?? null;
  }

  return {
    stations: orderedStations,
    rivers: riverSummaries,
    findById,
    filter,
  };
}
