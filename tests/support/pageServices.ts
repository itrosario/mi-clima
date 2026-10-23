/**
 * Servicios de pagina listos para pruebas.
 *
 * Compone los dobles de los puertos con valores por defecto razonables para
 * que cada prueba solo declare lo que le interesa cambiar.
 */

import { vi } from "vitest";
import type { Station } from "@/domain/catalog/types";
import type { DownloadService } from "@/domain/ports/downloadService";
import type { PrefecturaSource } from "@/domain/ports/prefecturaSource";
import type { StationCatalogSource } from "@/domain/ports/stationCatalogSource";
import type { WeatherSource } from "@/domain/ports/weatherSource";
import type { WeatherSnapshot } from "@/domain/weather/types";
import type { AppServices } from "@/presentation/runtime/appServices";
import {
  FakeCache,
  FakeClock,
  FakeHydrologySource,
  FakePercentilesSource,
  FakeStationCatalogSource,
  FakeWeatherSource,
} from "./applicationFakes";
import { createForecastDay, createObservation, createPoint, createStation } from "./factories";
import { createFakePrefecturaSource } from "./prefecturaFixtures";

export { createPrefecturaSnapshot } from "./prefecturaFixtures";

export const pageNow = new Date("2026-10-22T12:00:00.000Z");

export const corridorStationIds = ["19", "29", "30", "33", "34", "35"] as const;

export function createCorridorStations(): readonly Station[] {
  return [
    createStation({ id: "19", name: "Corrientes" }),
    createStation({ id: "29", name: "Parana" }),
    createStation({ id: "30", name: "Santa Fe" }),
    createStation({ id: "33", name: "San Lorenzo" }),
    createStation({ id: "34", name: "Rosario" }),
    createStation({ id: "35", name: "Villa Constitucion" }),
  ];
}

export const weatherSnapshot: WeatherSnapshot = {
  location: { latitude: -32.9468, longitude: -60.6393 },
  timezone: "America/Argentina/Cordoba",
  current: createObservation(),
  forecast: [createForecastDay()],
  forecastSourceName: "Open-Meteo",
};

export interface PageServicesOptions {
  readonly stations?: readonly Station[];
  readonly hydrology?: FakeHydrologySource;
  readonly weather?: WeatherSource;
  readonly percentiles?: FakePercentilesSource;
  readonly clock?: FakeClock;
  readonly downloadService?: DownloadService;
  readonly prefectura?: PrefecturaSource;
  readonly catalog?: StationCatalogSource;
}

export function createPageServices(options: PageServicesOptions = {}): AppServices {
  return {
    clock: options.clock ?? new FakeClock(pageNow),
    catalogCache: new FakeCache(),
    percentileCache: new FakeCache(),
    catalogSource:
      options.catalog ?? new FakeStationCatalogSource(options.stations ?? createCorridorStations()),
    hydrologySource:
      options.hydrology ??
      new FakeHydrologySource({
        "19": corridorSeries("19", 3.4),
        "29": corridorSeries("29", 4.1),
        "30": corridorSeries("30", 4.6),
        "33": corridorSeries("33", 4.9),
        "34": corridorSeries("34", 5.1),
        "35": corridorSeries("35", 4.4),
      }),
    percentilesSource: options.percentiles ?? new FakePercentilesSource({}),
    prefecturaSource: options.prefectura ?? createFakePrefecturaSource(),
    weatherSource: options.weather ?? new FakeWeatherSource(weatherSnapshot),
    downloadService: options.downloadService ?? { download: vi.fn() },
  };
}

export function corridorSeries(stationId: string, latestValue: number) {
  return {
    stationId,
    variableId: 2,
    unit: "m",
    points: [
      createPoint("2026-10-21T03:00:00.000Z", latestValue - 0.2),
      createPoint("2026-10-22T03:00:00.000Z", latestValue),
    ],
  };
}

export function createFailingWeatherSource(): WeatherSource {
  return {
    async fetchWeather() {
      throw new Error("clima no disponible");
    },
  };
}
