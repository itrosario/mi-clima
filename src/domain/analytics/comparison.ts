/**
 * Perfil longitudinal del rio.
 *
 * Compara el nivel de varias estaciones medidas en el mismo instante: la
 * diferencia contra una estacion de referencia y la caida respecto de la
 * estacion inmediatamente aguas arriba.
 */

export interface StationReading {
  readonly stationId: string;
  readonly name: string;
  /** Nivel observado, en metros. */
  readonly value: number;
}

export interface StationComparison {
  readonly stationId: string;
  readonly name: string;
  readonly value: number;
  /** Diferencia contra la estacion de referencia; `null` si no esta presente. */
  readonly differenceFromReference: number | null;
  /** Caida respecto de la estacion anterior del perfil; `null` en la primera. */
  readonly dropFromPrevious: number | null;
}

/**
 * Compara un conjunto de lecturas ordenadas aguas arriba - aguas abajo.
 *
 * El orden de entrada se respeta: quien llama decide la secuencia del perfil.
 */
export function compareStationReadings(
  readings: readonly StationReading[],
  referenceStationId: string,
): readonly StationComparison[] {
  const referenceReading = readings.find((reading) => reading.stationId === referenceStationId);
  const referenceValue = referenceReading?.value ?? null;

  return readings.map((reading, index) => {
    const previousReading = index === 0 ? null : (readings[index - 1] as StationReading);

    return {
      stationId: reading.stationId,
      name: reading.name,
      value: reading.value,
      differenceFromReference: referenceValue === null ? null : reading.value - referenceValue,
      dropFromPrevious: previousReading === null ? null : previousReading.value - reading.value,
    };
  });
}
