/**
 * Modelo del catalogo hidrometrico.
 *
 * Identificadores en ingles, glosario de dominio documentado en castellano:
 * - `Station`: estacion hidrometrica (escala) publicada por un organismo.
 * - `River`: rio canonico; varias estaciones comparten rio.
 * - `Reach`: tramo del rio; agrupa estaciones a lo largo del cauce.
 * - `Thresholds`: umbrales oficiales de aguas bajas, alerta y evacuacion.
 */

/** Identificador de estacion. En el INA corresponde al `siteCode`. */
export type StationId = string;

/** Identificador canonico de rio. */
export type RiverId = string;

/** Identificador canonico de tramo de rio. */
export type ReachId = string;

/** Identificador de red de medición (INA, INTA, Prefectura Naval, ...). */
export type NetworkId = number;

/** Identificador de variable measureda (altura, caudal, temperatura, ...). */
export type VariableId = number;

export interface GeoPoint {
  readonly latitude: number;
  readonly longitude: number;
}

/**
 * Umbrales oficiales de una estacion, en la unidad de la variable de altura
 * (metros sobre el cero del graphs). `null` significa "no publicado".
 */
export interface Thresholds {
  /** Nivel de aguas bajas. */
  readonly lowWater: number | null;
  /** Nivel a partir del cual se declara alerta. */
  readonly alert: number | null;
  /** Nivel a partir del cual se declara evacuacion. */
  readonly evacuation: number | null;
}

export interface River {
  readonly id: RiverId;
  /** Nombre canonico del rio. */
  readonly name: string;
  /** Nombres crudos con los que aparece publicado el rio. */
  readonly aliases: readonly string[];
}

export interface Reach {
  readonly id: ReachId;
  /** Nombre canonico del tramo. */
  readonly name: string;
  readonly riverId: RiverId;
}

export interface Station {
  readonly id: StationId;
  /** Nombre publicado por el organismo oficial. */
  readonly name: string;
  readonly river: River;
  readonly reach: Reach;
  readonly networkId: NetworkId;
  readonly networkName: string;
  readonly location: GeoPoint | null;
  readonly thresholds: Thresholds;
  /** Variables disponibles para esta estacion. */
  readonly variableIds: readonly VariableId[];
  /** Marca temporal de la ultima actualizacion de la ficha en el origen. */
  readonly updatedAt: Date | null;
}

/**
 * Identificadores que se usan cuando el organismo no informa el curso de agua.
 *
 * Son constantes del dominio porque el catalogo, la exportacion y la interfaz
 * necesitan reconocer esas estaciones como "sin rio informado".
 */
export const unknownRiverId: RiverId = "sin-rio";
export const unknownReachId: ReachId = "sin-rio-general";

/** Resultado de normalizar el nombre crudo de un rio publicado. */
export interface NormalizedRiver {
  readonly id: RiverId;
  readonly name: string;
  readonly reachId: ReachId;
  readonly reachName: string;
  /** `true` cuando el rio forma parte del catalogo curado del proyecto. */
  readonly isCurated: boolean;
}

export function hasAnyThreshold(thresholds: Thresholds): boolean {
  return (
    thresholds.lowWater !== null || thresholds.alert !== null || thresholds.evacuation !== null
  );
}
