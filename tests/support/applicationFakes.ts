/**
 * Implementaciones falsas de los puertos, para probar la capa de aplicacion
 * sin red y sin navegador.
 */

import type { PercentileTable } from "@/domain/analytics/anomaly";
import type { Station } from "@/domain/catalog/types";
import type { CachePort } from "@/domain/ports/cache";
import type { Clock } from "@/domain/ports/clock";
import type { HydrologyRequest, HydrologySource } from "@/domain/ports/hydrologySource";
import type { PercentilesRequest, PercentilesSource } from "@/domain/ports/percentilesSource";
import type { StationCatalogSource } from "@/domain/ports/stationCatalogSource";
import type { WeatherRequest, WeatherSource } from "@/domain/ports/weatherSource";
import { createSeries } from "@/domain/telemetry/series";
import type { TelemetrySeries } from "@/domain/telemetry/types";
import type { WeatherSnapshot } from "@/domain/weather/types";

export interface RecordedWrite {
  readonly key: string;
  readonly value: unknown;
  readonly ttlSeconds: number | undefined;
}

export interface RecordedHydrologyRequest {
  readonly request: HydrologyRequest;
  readonly signal: AbortSignal | undefined;
}

export interface RecordedPercentilesRequest {
  readonly request: PercentilesRequest;
  readonly signal: AbortSignal | undefined;
}

export class FakeCache implements CachePort {
  readonly entries = new Map<string, unknown>();
  readonly reads: string[] = [];
  readonly writes: RecordedWrite[] = [];

  async read<T>(key: string): Promise<T | null> {
    this.reads.push(key);

    return (this.entries.get(key) as T | undefined) ?? null;
  }

  async write<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    this.entries.set(key, value);
    this.writes.push({ key, value, ttlSeconds });
  }

  async remove(key: string): Promise<void> {
    this.entries.delete(key);
  }
}

export class FakeClock implements Clock {
  private current: Date;

  constructor(current: Date) {
    this.current = current;
  }

  now(): Date {
    return this.current;
  }

  set(current: Date): void {
    this.current = current;
  }
}

type HydrologyHandler = (request: HydrologyRequest) => TelemetrySeries;

function emptySeries(request: HydrologyRequest): TelemetrySeries {
  return createSeries(request.stationId, request.variableId, "m", []);
}

export class FakeHydrologySource implements HydrologySource {
  readonly calls: RecordedHydrologyRequest[] = [];
  private readonly handler: HydrologyHandler;

  constructor(handler: HydrologyHandler | Readonly<Record<string, TelemetrySeries>>) {
    this.handler =
      typeof handler === "function"
        ? handler
        : (request) => handler[request.stationId] ?? emptySeries(request);
  }

  async fetchSeries(request: HydrologyRequest, signal?: AbortSignal): Promise<TelemetrySeries> {
    this.calls.push({ request, signal });

    return this.handler(request);
  }
}

export class FakeStationCatalogSource implements StationCatalogSource {
  readonly signals: (AbortSignal | undefined)[] = [];
  private readonly stations: readonly Station[];

  constructor(stations: readonly Station[]) {
    this.stations = stations;
  }

  async fetchStations(signal?: AbortSignal): Promise<readonly Station[]> {
    this.signals.push(signal);

    return this.stations;
  }
}

export class FakePercentilesSource implements PercentilesSource {
  readonly calls: RecordedPercentilesRequest[] = [];
  private readonly tables: Readonly<Record<string, PercentileTable | null>>;

  constructor(tables: Readonly<Record<string, PercentileTable | null>>) {
    this.tables = tables;
  }

  async fetchPercentiles(
    request: PercentilesRequest,
    signal?: AbortSignal,
  ): Promise<PercentileTable | null> {
    this.calls.push({ request, signal });

    return this.tables[request.stationId] ?? null;
  }
}

export class FakeWeatherSource implements WeatherSource {
  readonly calls: { readonly request: WeatherRequest; readonly signal: AbortSignal | undefined }[] =
    [];
  private readonly snapshot: WeatherSnapshot;

  constructor(snapshot: WeatherSnapshot) {
    this.snapshot = snapshot;
  }

  async fetchWeather(request: WeatherRequest, signal?: AbortSignal): Promise<WeatherSnapshot> {
    this.calls.push({ request, signal });

    return this.snapshot;
  }
}
