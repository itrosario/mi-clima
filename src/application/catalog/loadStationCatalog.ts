/**
 * Carga del catalogo de estaciones.
 *
 * El catalogo pesa cerca de un megabyte y cambia de a poco, asi que se guarda
 * en la cache de la pestana. La lectura rehidrata las fechas: la cache guarda
 * JSON y el dominio trabaja con objetos `Date`.
 */

import { createStationCatalog, type StationCatalog } from "@/domain/catalog/stationCatalog";
import type { Station } from "@/domain/catalog/types";
import type { CachePort } from "@/domain/ports/cache";
import type { Clock } from "@/domain/ports/clock";
import type { StationCatalogSource } from "@/domain/ports/stationCatalogSource";

export const stationCatalogCacheKey = "catalogo-estaciones";
export const stationCatalogCacheSeconds = 6 * 60 * 60;

interface CachedStationCatalog {
  readonly fetchedAt: string;
  readonly stations: readonly Station[];
}

export interface StationCatalogDependencies {
  readonly source: StationCatalogSource;
  readonly cache: CachePort;
  readonly clock: Clock;
}

export interface StationCatalogSnapshot {
  readonly catalog: StationCatalog;
  readonly fetchedAt: Date;
  readonly fromCache: boolean;
}

function rehydrateStationDates(stations: readonly Station[]): readonly Station[] {
  return stations.map((station) => ({
    ...station,
    updatedAt: station.updatedAt === null ? null : new Date(station.updatedAt),
  }));
}

function readCachedSnapshot(cached: CachedStationCatalog | null): StationCatalogSnapshot | null {
  if (cached === null || !Array.isArray(cached.stations)) {
    return null;
  }

  const fetchedAt = new Date(cached.fetchedAt);

  if (Number.isNaN(fetchedAt.getTime())) {
    return null;
  }

  return {
    catalog: createStationCatalog(rehydrateStationDates(cached.stations)),
    fetchedAt,
    fromCache: true,
  };
}

/**
 * Devuelve el catalogo desde la cache de la pestana o desde el organismo.
 *
 * Un fallo de cache nunca impide mostrar datos: si el contenido guardado no
 * tiene la forma esperada se descarta y se vuelve a consultar la fuente.
 */
export async function loadStationCatalog(
  dependencies: StationCatalogDependencies,
  signal?: AbortSignal,
): Promise<StationCatalogSnapshot> {
  const cached = await dependencies.cache.read<CachedStationCatalog>(stationCatalogCacheKey);
  const cachedSnapshot = readCachedSnapshot(cached);

  if (cachedSnapshot !== null) {
    return cachedSnapshot;
  }

  const stations = await dependencies.source.fetchStations(signal);
  const fetchedAt = dependencies.clock.now();

  await dependencies.cache.write(
    stationCatalogCacheKey,
    { fetchedAt: fetchedAt.toISOString(), stations },
    stationCatalogCacheSeconds,
  );

  return {
    catalog: createStationCatalog(stations),
    fetchedAt,
    fromCache: false,
  };
}
