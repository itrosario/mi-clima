/**
 * Contratos compartidos por los avisos push de inundacion.
 *
 * Las suscripciones son datos personales minimos: el endpoint que entrega el
 * navegador, las claves publicas de cifrado y las estaciones elegidas. No se
 * guardan coordenadas ni identificadores de la persona.
 */

import type { FloodStatus } from "@/domain/flood/types";

export type AlertLocale = "es" | "en";

export type FloodEventType = "alert" | "evacuation" | "clear" | "rapid-rise";

export interface AlertSubscriptionKeys {
  readonly p256dh: string;
  readonly auth: string;
}

export interface AlertSubscription {
  readonly endpoint: string;
  readonly expirationTime: number | null;
  readonly keys: AlertSubscriptionKeys;
  readonly stationIds: readonly string[];
  readonly locale: AlertLocale;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface AlertStationState {
  readonly status: FloodStatus;
  readonly level: number | null;
  readonly observedAt: string | null;
  readonly lastRapidRiseNotifiedAt: string | null;
}

export interface AlertMonitorState {
  readonly version: 1;
  readonly initializedAt: string;
  readonly updatedAt: string;
  readonly stations: Readonly<Record<string, AlertStationState>>;
}

export interface FloodEvent {
  readonly type: FloodEventType;
  readonly stationId: string;
  readonly stationName: string;
  readonly level: number | null;
  readonly previousLevel: number | null;
  readonly riseMetres: number | null;
  readonly windowHours: number | null;
  readonly observedAt: string;
}

export interface AlertKvListResult {
  readonly keys: readonly { readonly name: string }[];
  readonly list_complete?: boolean;
  readonly listComplete?: boolean;
  readonly cursor?: string;
}

/** Subconjunto de la API de Workers KV que usa el servicio de avisos. */
export interface AlertKvNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { readonly expirationTtl?: number }): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: {
    readonly prefix?: string;
    readonly cursor?: string;
  }): Promise<AlertKvListResult>;
}

export interface AlertWorkerEnvironment {
  readonly ALERTS?: AlertKvNamespace;
  readonly VAPID_PUBLIC_KEY?: string;
  readonly VAPID_PRIVATE_KEY?: string;
  readonly VAPID_SUBJECT?: string;
}
