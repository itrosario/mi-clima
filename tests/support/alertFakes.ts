import type {
  AlertKvNamespace,
  AlertMonitorState,
  AlertStationState,
  AlertSubscription,
  FloodEvent,
} from "@/worker/alertTypes";
import { encodeBase64Url } from "@/worker/base64";

export class FakeAlertKv implements AlertKvNamespace {
  readonly values = new Map<string, string>();
  readonly puts: { key: string; expirationTtl?: number }[] = [];
  readonly deletes: string[] = [];
  pageSize = 100;

  async get(key: string): Promise<string | null> {
    return this.values.get(key) ?? null;
  }

  async put(
    key: string,
    value: string,
    options?: { readonly expirationTtl?: number },
  ): Promise<void> {
    this.values.set(key, value);
    this.puts.push({
      key,
      ...(options?.expirationTtl === undefined ? {} : { expirationTtl: options.expirationTtl }),
    });
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
    this.deletes.push(key);
  }

  async list(options?: { readonly prefix?: string; readonly cursor?: string }): Promise<{
    readonly keys: readonly { readonly name: string }[];
    readonly listComplete: boolean;
    readonly cursor?: string;
  }> {
    const prefix = options?.prefix ?? "";
    const matching = [...this.values.keys()].filter((key) => key.startsWith(prefix)).sort();
    const offset = options?.cursor === undefined ? 0 : Number(options.cursor);
    const page = matching.slice(offset, offset + this.pageSize);
    const complete = offset + this.pageSize >= matching.length;

    return {
      keys: page.map((name) => ({ name })),
      listComplete: complete,
      ...(complete ? {} : { cursor: String(offset + this.pageSize) }),
    };
  }
}

const publicKey = encodeBase64Url(Uint8Array.from([4, ...new Array<number>(64).fill(7)]));
const authSecret = encodeBase64Url(Uint8Array.from(new Array<number>(16).fill(9)));

export function createSubscription(overrides: Partial<AlertSubscription> = {}): AlertSubscription {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
    expirationTime: null,
    keys: { p256dh: publicKey, auth: authSecret },
    stationIds: ["34"],
    locale: "es",
    createdAt: "2026-10-23T09:00:00.000Z",
    updatedAt: "2026-10-23T09:00:00.000Z",
    ...overrides,
  };
}

export function createStationState(overrides: Partial<AlertStationState> = {}): AlertStationState {
  return {
    status: "normal",
    level: 4,
    observedAt: "2026-10-23T09:00:00.000Z",
    lastRapidRiseNotifiedAt: null,
    ...overrides,
  };
}

export function createMonitorState(
  stations: Record<string, AlertStationState> = {},
  overrides: Partial<AlertMonitorState> = {},
): AlertMonitorState {
  return {
    version: 1,
    initializedAt: "2026-10-23T08:00:00.000Z",
    updatedAt: "2026-10-23T09:00:00.000Z",
    stations,
    ...overrides,
  };
}

export function createFloodEvent(overrides: Partial<FloodEvent> = {}): FloodEvent {
  return {
    type: "alert",
    stationId: "34",
    stationName: "Rosario",
    level: 5.2,
    previousLevel: 4.8,
    riseMetres: null,
    windowHours: null,
    observedAt: "2026-10-23T09:00:00.000Z",
    ...overrides,
  };
}

export function validSubscriptionPayload(
  overrides: Readonly<Record<string, unknown>> = {},
): Record<string, unknown> {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/test-endpoint",
    expirationTime: null,
    keys: { p256dh: publicKey, auth: authSecret },
    stationIds: ["34"],
    locale: "es",
    ...overrides,
  };
}
