/**
 * Agrupacion del catalogo por rio y tramo.
 *
 * Es la vista que alimenta el explorador de rios: cada rio con sus tramos y
 * sus estaciones, ordenado alfabeticamente y sin las estaciones que el
 * organismo publica sin curso de agua.
 */

import type { Reach, River, Station } from "@/domain/catalog/types";
import { unknownRiverId } from "@/domain/catalog/types";

export interface ReachGroup {
  readonly reach: Reach;
  readonly stations: readonly Station[];
}

export interface RiverGroup {
  readonly river: River;
  readonly reaches: readonly ReachGroup[];
  readonly stationCount: number;
}

export interface RiverCatalogue {
  readonly rivers: readonly RiverGroup[];
  /** Estaciones publicadas sin rio informado; se muestran aparte. */
  readonly stationsWithoutRiver: readonly Station[];
}

function compareByName(left: { readonly name: string }, right: { readonly name: string }): number {
  return left.name.localeCompare(right.name, "es");
}

/**
 * Construye la agrupacion por rio y tramo.
 *
 * El orden de llegada no importa: el resultado se ordena por nombre para que
 * la interfaz sea estable entre consultas.
 */
export function buildRiverCatalogue(stations: readonly Station[]): RiverCatalogue {
  const reachesByRiver = new Map<
    string,
    { river: River; reaches: Map<string, { reach: Reach; stations: Station[] }> }
  >();
  const stationsWithoutRiver: Station[] = [];

  for (const station of stations) {
    if (station.river.id === unknownRiverId) {
      stationsWithoutRiver.push(station);
      continue;
    }

    let riverEntry = reachesByRiver.get(station.river.id);

    if (riverEntry === undefined) {
      riverEntry = { river: station.river, reaches: new Map() };
      reachesByRiver.set(station.river.id, riverEntry);
    }

    const existingReach = riverEntry.reaches.get(station.reach.id);

    if (existingReach === undefined) {
      riverEntry.reaches.set(station.reach.id, { reach: station.reach, stations: [station] });
      continue;
    }

    existingReach.stations.push(station);
  }

  const rivers = [...reachesByRiver.values()]
    .map((riverEntry) => {
      const reaches = [...riverEntry.reaches.values()]
        .map((reachEntry) => ({
          reach: reachEntry.reach,
          stations: [...reachEntry.stations].sort(compareByName),
        }))
        .sort((left, right) => compareByName(left.reach, right.reach));

      return {
        river: riverEntry.river,
        reaches,
        stationCount: reaches.reduce((total, reach) => total + reach.stations.length, 0),
      };
    })
    .sort((left, right) => compareByName(left.river, right.river));

  return {
    rivers,
    stationsWithoutRiver: stationsWithoutRiver.sort(compareByName),
  };
}
