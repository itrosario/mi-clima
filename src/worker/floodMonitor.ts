/**
 * Monitor periodico de crecidas para los avisos Web Push.
 *
 * Cada ejecucion del Cron lee el estado anterior desde KV, consulta las seis
 * estaciones del corredor a traves del proxy del INA (con su cache de borde),
 * detecta transiciones y subidas marcadas, y envia solo los avisos nuevos a las
 * suscripciones de la estacion correspondiente.
 */

import { mapWithConcurrency } from "@/application/shared/concurrency";
import { selectCorridorStations } from "@/domain/catalog/corridor";
import type { Station } from "@/domain/catalog/types";
import { evaluateFloodStatus } from "@/domain/flood/evaluator";
import type { FloodStatus } from "@/domain/flood/types";
import type { TelemetryPoint } from "@/domain/telemetry/types";
import { waterLevelVariableId } from "@/domain/telemetry/types";
import {
  formatInaTimestamp,
  parseInaObservation,
  parseInaStation,
} from "@/infrastructure/ina/inaPayloads";
import { isRecord } from "@/infrastructure/parsing/jsonValues";
import { type AlertPushDelivery, isGonePushResponse, sendAlertPush } from "./alertPush";
import {
  deleteSubscription,
  listSubscriptions,
  readMonitorState,
  writeMonitorState,
} from "./alertStore";
import type {
  AlertKvNamespace,
  AlertMonitorState,
  AlertStationState,
  AlertSubscription,
  AlertWorkerEnvironment,
  FloodEvent,
} from "./alertTypes";
import type { WorkerCache } from "./edgeCache";
import { handleInaRequest } from "./inaWorker";
import { loadVapidKeys, type VapidConfig, vapidSubject } from "./vapid";

const rapidRiseSixHourMetres = 0.3;
const rapidRiseDayMetres = 0.5;
const rapidRiseCooldownMilliseconds = 12 * 60 * 60 * 1000;
const lookbackMilliseconds = 7 * 24 * 60 * 60 * 1000;
const stationConcurrency = 3;

export interface MonitorStationSnapshot {
  readonly stationId: string;
  readonly stationName: string;
  readonly state: AlertStationState;
  readonly rise6h: number | null;
  readonly rise24h: number | null;
}

export interface MonitorRunResult {
  readonly initialized: boolean;
  readonly events: readonly FloodEvent[];
  readonly delivered: number;
}

export interface MonitorDependencies {
  readonly kv: AlertKvNamespace | null;
  readonly cache?: WorkerCache | null;
  readonly fetchImplementation?: typeof fetch;
  readonly environment?: AlertWorkerEnvironment;
  readonly now?: () => Date;
  readonly sendPush?: (
    subscription: AlertSubscription,
    event: FloodEvent,
  ) => Promise<AlertPushDelivery>;
}

type InaReader = (
  resource: string,
  parameters: Readonly<Record<string, string>>,
) => Promise<readonly Readonly<Record<string, unknown>>[]>;

function isAlertOrWorse(status: FloodStatus): boolean {
  return status === "alert" || status === "evacuation";
}

function createInaReader(dependencies: MonitorDependencies): InaReader {
  return async (resource, parameters) => {
    const url = new URL("https://mi-clima.internal/api/ina");
    url.searchParams.set("request", resource);

    for (const [key, value] of Object.entries(parameters)) {
      url.searchParams.set(key, value);
    }

    const inaDependencies = {
      ...(dependencies.cache === undefined ? {} : { cache: dependencies.cache }),
      ...(dependencies.fetchImplementation === undefined
        ? {}
        : { fetchImplementation: dependencies.fetchImplementation }),
    };
    const response = await handleInaRequest(new Request(url), inaDependencies);

    if (!response.ok) {
      throw new Error(`El INA respondio ${response.status} al pedir "${resource}".`);
    }

    const payload: unknown = await response.json();

    if (!isRecord(payload) || !Array.isArray(payload.data)) {
      return [];
    }

    return payload.data.filter(isRecord);
  };
}

function pointAtOrBefore(points: readonly TelemetryPoint[], target: Date): TelemetryPoint | null {
  for (let index = points.length - 1; index >= 0; index -= 1) {
    const point = points[index];

    if (point !== undefined && point.timestamp.getTime() <= target.getTime()) {
      return point;
    }
  }

  return null;
}

async function loadStationSnapshot(
  readIna: InaReader,
  station: Station,
  now: Date,
  previous: AlertMonitorState | null,
): Promise<MonitorStationSnapshot | null> {
  if (!station.variableIds.includes(waterLevelVariableId)) {
    return null;
  }

  const from = new Date(now.getTime() - lookbackMilliseconds);
  let rows: readonly Readonly<Record<string, unknown>>[];

  try {
    rows = await readIna("datos", {
      timeStart: formatInaTimestamp(from),
      timeEnd: formatInaTimestamp(now),
      siteCode: station.id,
      varId: String(waterLevelVariableId),
    });
  } catch {
    return null;
  }

  const points = rows
    .map(parseInaObservation)
    .filter((point): point is TelemetryPoint => point !== null)
    .sort((left, right) => left.timestamp.getTime() - right.timestamp.getTime());
  const latest = points[points.length - 1] ?? null;

  if (latest === null) {
    return null;
  }

  const sixHoursAgo = new Date(latest.timestamp.getTime() - 6 * 60 * 60 * 1000);
  const dayAgo = new Date(latest.timestamp.getTime() - 24 * 60 * 60 * 1000);
  const base6h = pointAtOrBefore(points, sixHoursAgo);
  const base24h = pointAtOrBefore(points, dayAgo);
  const previousState = previous?.stations[station.id];
  const state: AlertStationState = {
    status: evaluateFloodStatus(latest.value, station.thresholds),
    level: latest.value,
    observedAt: latest.timestamp.toISOString(),
    lastRapidRiseNotifiedAt: previousState?.lastRapidRiseNotifiedAt ?? null,
  };

  return {
    stationId: station.id,
    stationName: station.name,
    state,
    rise6h: base6h === null ? null : latest.value - base6h.value,
    rise24h: base24h === null ? null : latest.value - base24h.value,
  };
}

async function loadCorridorSnapshot(
  dependencies: MonitorDependencies,
  now: Date,
  previous: AlertMonitorState | null,
): Promise<readonly MonitorStationSnapshot[]> {
  const readIna = createInaReader(dependencies);
  const stationRows = await readIna("estaciones", {});
  const stations = selectCorridorStations(
    stationRows.map(parseInaStation).filter((station): station is Station => station !== null),
  );
  const snapshots = await mapWithConcurrency(stations, stationConcurrency, (station) =>
    loadStationSnapshot(readIna, station, now, previous),
  );

  return snapshots.filter((snapshot): snapshot is MonitorStationSnapshot => snapshot !== null);
}

function eventBase(
  snapshot: MonitorStationSnapshot,
  now: Date,
): Pick<FloodEvent, "stationId" | "stationName" | "level" | "observedAt"> {
  return {
    stationId: snapshot.stationId,
    stationName: snapshot.stationName,
    level: snapshot.state.level,
    observedAt: snapshot.state.observedAt ?? now.toISOString(),
  };
}

function statusEvent(
  previous: AlertStationState | undefined,
  snapshot: MonitorStationSnapshot,
  now: Date,
): FloodEvent | null {
  if (previous === undefined) {
    return null;
  }

  const wasAlerting = isAlertOrWorse(previous.status);
  const isAlerting = isAlertOrWorse(snapshot.state.status);

  if (isAlerting && !wasAlerting) {
    return {
      ...eventBase(snapshot, now),
      type: snapshot.state.status === "evacuation" ? "evacuation" : "alert",
      previousLevel: previous.level,
      riseMetres: null,
      windowHours: null,
    };
  }

  if (!isAlerting && snapshot.state.status !== "undefined" && wasAlerting) {
    return {
      ...eventBase(snapshot, now),
      type: "clear",
      previousLevel: previous.level,
      riseMetres: null,
      windowHours: null,
    };
  }

  return null;
}

function rapidRiseEvent(
  previous: AlertStationState | undefined,
  snapshot: MonitorStationSnapshot,
  now: Date,
): FloodEvent | null {
  if (snapshot.state.level === null) {
    return null;
  }

  const lastNotifiedAt = previous?.lastRapidRiseNotifiedAt;
  if (
    lastNotifiedAt !== null &&
    lastNotifiedAt !== undefined &&
    now.getTime() - Date.parse(lastNotifiedAt) < rapidRiseCooldownMilliseconds
  ) {
    return null;
  }

  let riseMetres: number | null = null;
  let windowHours: number | null = null;

  if (snapshot.rise6h !== null && snapshot.rise6h >= rapidRiseSixHourMetres) {
    riseMetres = snapshot.rise6h;
    windowHours = 6;
  } else if (snapshot.rise24h !== null && snapshot.rise24h >= rapidRiseDayMetres) {
    riseMetres = snapshot.rise24h;
    windowHours = 24;
  }

  if (riseMetres === null) {
    return null;
  }

  return {
    ...eventBase(snapshot, now),
    type: "rapid-rise",
    previousLevel: snapshot.state.level - riseMetres,
    riseMetres,
    windowHours,
  };
}

export function detectFloodEvents(
  snapshots: readonly MonitorStationSnapshot[],
  previous: AlertMonitorState,
  now: Date,
): readonly FloodEvent[] {
  const events: FloodEvent[] = [];

  for (const snapshot of snapshots) {
    const previousState = previous.stations[snapshot.stationId];
    const event =
      statusEvent(previousState, snapshot, now) ?? rapidRiseEvent(previousState, snapshot, now);

    if (event !== null) {
      events.push(event);
    }
  }

  return events;
}

function eventKey(event: FloodEvent): string {
  return `${event.stationId}:${event.type}`;
}

async function deliverEvents(
  dependencies: MonitorDependencies,
  kv: AlertKvNamespace,
  events: readonly FloodEvent[],
): Promise<{
  readonly delivered: number;
  readonly deliveredByEvent: ReadonlyMap<string, number>;
  readonly staleEndpoints: ReadonlySet<string>;
}> {
  const deliveredByEvent = new Map<string, number>();
  const staleEndpoints = new Set<string>();
  let delivered = 0;

  if (events.length === 0) {
    return { delivered, deliveredByEvent, staleEndpoints };
  }

  const subscriptions = await listSubscriptions(kv);

  if (subscriptions.length === 0) {
    return { delivered, deliveredByEvent, staleEndpoints };
  }

  const vapidKeys = await loadVapidKeys(kv, dependencies.environment ?? {});
  if (vapidKeys === null) {
    return { delivered, deliveredByEvent, staleEndpoints };
  }

  const vapid: VapidConfig = {
    ...vapidKeys,
    subject: vapidSubject(dependencies.environment ?? {}),
  };
  const fetchImplementation = dependencies.fetchImplementation ?? fetch;
  const sendPush =
    dependencies.sendPush ??
    (async (subscription: AlertSubscription, event: FloodEvent) => {
      const response = await sendAlertPush(subscription, event, vapid, fetchImplementation);

      return { status: response.status };
    });

  for (const event of events) {
    const recipients = subscriptions.filter((subscription) =>
      subscription.stationIds.includes(event.stationId),
    );

    for (const subscription of recipients) {
      try {
        const response = await sendPush(subscription, event);

        if (isGonePushResponse(response)) {
          staleEndpoints.add(subscription.endpoint);
          continue;
        }

        if (response.status >= 200 && response.status < 300) {
          delivered += 1;
          deliveredByEvent.set(eventKey(event), (deliveredByEvent.get(eventKey(event)) ?? 0) + 1);
        }
      } catch {
        // Un fallo de red no borra la suscripcion: se reintenta en la proxima corrida.
      }
    }
  }

  for (const endpoint of staleEndpoints) {
    await deleteSubscription(kv, endpoint);
  }

  return { delivered, deliveredByEvent, staleEndpoints };
}

/**
 * Ejecuta una corrida del monitor. La primera vez solo toma una fotografia del
 * estado para no enviar avisos historicos al activar el servicio.
 */
export async function runFloodMonitor(
  dependencies: MonitorDependencies,
): Promise<MonitorRunResult> {
  const kv = dependencies.kv;

  if (kv === null) {
    return { initialized: false, events: [], delivered: 0 };
  }

  const now = (dependencies.now ?? (() => new Date()))();
  const previous = await readMonitorState(kv);
  const snapshots = await loadCorridorSnapshot(dependencies, now, previous);

  if (previous === null) {
    const stations = Object.fromEntries(
      snapshots.map((snapshot) => [snapshot.stationId, snapshot.state]),
    );

    await writeMonitorState(kv, {
      version: 1,
      initializedAt: now.toISOString(),
      updatedAt: now.toISOString(),
      stations,
    });

    return { initialized: true, events: [], delivered: 0 };
  }

  const events = detectFloodEvents(snapshots, previous, now);
  const delivery = await deliverEvents(dependencies, kv, events);
  const stations: Record<string, AlertStationState> = { ...previous.stations };

  for (const snapshot of snapshots) {
    stations[snapshot.stationId] = snapshot.state;
  }

  for (const event of events) {
    if (event.type === "rapid-rise" && (delivery.deliveredByEvent.get(eventKey(event)) ?? 0) > 0) {
      const current = stations[event.stationId];

      if (current !== undefined) {
        stations[event.stationId] = {
          ...current,
          lastRapidRiseNotifiedAt: now.toISOString(),
        };
      }
    }
  }

  await writeMonitorState(kv, {
    version: 1,
    initializedAt: previous.initializedAt,
    updatedAt: now.toISOString(),
    stations,
  });

  return {
    initialized: false,
    events,
    delivered: delivery.delivered,
  };
}
