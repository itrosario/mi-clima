/**
 * Corredor del Parana.
 *
 * Tramo de referencia del proyecto: las seis escalas que el panel muestra por
 * defecto, ordenadas de aguas arriba hacia aguas abajo (Corrientes -> Villa
 * Constitucion).
 */

import type { Station, StationId } from "./types";

export interface CorridorStationDefinition {
  readonly id: StationId;
  readonly label: string;
}

export const paranaCorridorStations: readonly CorridorStationDefinition[] = [
  { id: "19", label: "Corrientes" },
  { id: "29", label: "Parana" },
  { id: "30", label: "Santa Fe" },
  { id: "33", label: "San Lorenzo" },
  { id: "34", label: "Rosario" },
  { id: "35", label: "Villa Constitucion" },
];

export const paranaCorridorStationIds: readonly StationId[] = paranaCorridorStations.map(
  (definition) => definition.id,
);

/** Estacion de referencia del proyecto. */
export const homeStationId: StationId = "34";

/**
 * Selecciona las estaciones del corredor respetando el orden aguas arriba -
 * aguas abajo y descartando las que no esten publicadas por el origen.
 */
export function selectCorridorStations(
  stations: readonly Station[],
  corridor: readonly CorridorStationDefinition[] = paranaCorridorStations,
): readonly Station[] {
  const stationsById = new Map(stations.map((station) => [station.id, station]));

  return corridor
    .map((definition) => stationsById.get(definition.id))
    .filter((station): station is Station => station !== undefined);
}
