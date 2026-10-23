/**
 * Composicion de los servicios del navegador.
 *
 * Es el unico lugar donde la interfaz conoce las implementaciones concretas de
 * los puertos. Las paginas reciben este objeto ya armado, de modo que las
 * pruebas puedan reemplazarlo por dobles sin tocar la red.
 */

import type { CachePort } from "@/domain/ports/cache";
import { type Clock, systemClock } from "@/domain/ports/clock";
import type { DownloadService } from "@/domain/ports/downloadService";
import type { HydrologySource } from "@/domain/ports/hydrologySource";
import type { PercentilesSource } from "@/domain/ports/percentilesSource";
import type { PrefecturaSource } from "@/domain/ports/prefecturaSource";
import type { StationCatalogSource } from "@/domain/ports/stationCatalogSource";
import type { WeatherSource } from "@/domain/ports/weatherSource";
import { MemoryCache } from "@/infrastructure/cache/memoryCache";
import { SessionStorageCache } from "@/infrastructure/cache/sessionStorageCache";
import { BlobDownloadService } from "@/infrastructure/download/blobDownloadService";
import { FetchHttpClient } from "@/infrastructure/http/fetchHttpClient";
import { InaApiClient } from "@/infrastructure/ina/inaApiClient";
import { InaHydrologySource } from "@/infrastructure/ina/inaHydrologySource";
import { InaPercentilesSource } from "@/infrastructure/ina/inaPercentilesSource";
import { InaStationCatalogSource } from "@/infrastructure/ina/inaStationCatalogSource";
import { OpenMeteoSource } from "@/infrastructure/openMeteo/openMeteoSource";
import { PrefecturaApiSource } from "@/infrastructure/prefectura/prefecturaApiSource";

export interface AppServices {
  readonly clock: Clock;
  readonly catalogCache: CachePort;
  readonly percentileCache: CachePort;
  readonly catalogSource: StationCatalogSource;
  readonly hydrologySource: HydrologySource;
  readonly percentilesSource: PercentilesSource;
  readonly prefecturaSource: PrefecturaSource;
  readonly weatherSource: WeatherSource;
  readonly downloadService: DownloadService;
}

export interface AppServicesOptions {
  readonly storage?: Storage;
  readonly document?: Document;
  readonly clock?: Clock;
  readonly fetchImplementation?: typeof fetch;
}

/** `sessionStorage` puede no existir o estar bloqueado por el navegador. */
export function resolveSessionStorage(): Storage | undefined {
  if (typeof globalThis.sessionStorage === "undefined") {
    return undefined;
  }

  return globalThis.sessionStorage;
}

export function createAppServices(options: AppServicesOptions = {}): AppServices {
  const clock = options.clock ?? systemClock;
  const http =
    options.fetchImplementation === undefined
      ? new FetchHttpClient()
      : new FetchHttpClient({ fetchImplementation: options.fetchImplementation });
  const inaClient = new InaApiClient(http);
  const document = options.document ?? globalThis.document;

  return {
    clock,
    catalogCache: new SessionStorageCache(options.storage ?? resolveSessionStorage(), clock),
    percentileCache: new MemoryCache(clock),
    catalogSource: new InaStationCatalogSource(inaClient),
    hydrologySource: new InaHydrologySource(inaClient),
    percentilesSource: new InaPercentilesSource(inaClient),
    prefecturaSource: new PrefecturaApiSource(http),
    weatherSource: new OpenMeteoSource(http),
    downloadService: new BlobDownloadService(document),
  };
}
