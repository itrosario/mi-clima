/**
 * Controles de suscripcion a los avisos Web Push.
 *
 * La persona elige una estacion del corredor o usa su ubicacion para detectar
 * la mas cercana. La ubicacion no se envia al servidor: solo se usa en el
 * navegador para elegir una estacion. La suscripcion guarda el endpoint push y
 * la estacion, nunca las coordenadas.
 */

import type { GeoPoint } from "@/domain/catalog/types";
import { isRecord } from "@/infrastructure/parsing/jsonValues";
import { interpolate } from "../i18n";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { queryElement, setHidden } from "./dom";

export interface AlertSubscriptionStation {
  readonly id: string;
  readonly name: string;
  readonly location: GeoPoint | null;
}

interface PushSubscriptionLike {
  readonly endpoint: string;
  toJSON(): PushSubscriptionJSON;
  unsubscribe(): Promise<boolean>;
}

interface PushManagerLike {
  getSubscription(): Promise<PushSubscriptionLike | null>;
  subscribe(options: PushSubscriptionOptionsInit): Promise<PushSubscriptionLike>;
}

interface ServiceWorkerRegistrationLike {
  readonly pushManager: PushManagerLike;
}

interface ServiceWorkerContainerLike {
  getRegistration(): Promise<ServiceWorkerRegistrationLike | undefined>;
  readonly ready: Promise<ServiceWorkerRegistrationLike>;
}

interface NotificationApiLike {
  readonly permission: NotificationPermission;
  requestPermission(): Promise<NotificationPermission>;
}

interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface AlertSubscriptionEnvironment {
  readonly fetchImplementation?: typeof fetch;
  readonly geolocation?: Pick<Geolocation, "getCurrentPosition"> | null;
  readonly notifications?: NotificationApiLike | null;
  readonly serviceWorker?: ServiceWorkerContainerLike | null;
  readonly storage?: StorageLike | null;
}

const zoneStorageKey = "mi-clima:alerta-zona";
const maximumCoverageKilometres = 300;

export interface NearestStationResult {
  readonly station: AlertSubscriptionStation;
  readonly distanceKilometres: number;
}

function toRadians(value: number): number {
  return (value * Math.PI) / 180;
}

/** Distancia aproximada en kilometros entre dos puntos geograficos. */
export function distanceKilometres(left: GeoPoint, right: GeoPoint): number {
  const earthRadiusKilometres = 6371;
  const latitudeDelta = toRadians(right.latitude - left.latitude);
  const longitudeDelta = toRadians(right.longitude - left.longitude);
  const leftLatitude = toRadians(left.latitude);
  const rightLatitude = toRadians(right.latitude);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(leftLatitude) * Math.cos(rightLatitude) * Math.sin(longitudeDelta / 2) ** 2;

  return 2 * earthRadiusKilometres * Math.asin(Math.sqrt(haversine));
}

export function nearestStation(
  stations: readonly AlertSubscriptionStation[],
  location: GeoPoint,
): NearestStationResult | null {
  let nearest: NearestStationResult | null = null;

  for (const station of stations) {
    if (station.location === null) {
      continue;
    }

    const distance = distanceKilometres(location, station.location);

    if (nearest === null || distance < nearest.distanceKilometres) {
      nearest = { station, distanceKilometres: distance };
    }
  }

  return nearest;
}

export function urlBase64ToUint8Array(value: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(binary.length));

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function resolveEnvironment(
  documentRoot: Document,
  environment: AlertSubscriptionEnvironment,
): Required<AlertSubscriptionEnvironment> {
  const view = documentRoot.defaultView;
  const navigatorObject = view?.navigator;
  const notificationApi =
    environment.notifications !== undefined
      ? environment.notifications
      : typeof Notification === "undefined"
        ? null
        : Notification;
  let storage = environment.storage;

  if (storage === undefined) {
    try {
      storage = view?.localStorage ?? null;
    } catch {
      storage = null;
    }
  }

  return {
    fetchImplementation: environment.fetchImplementation ?? globalThis.fetch.bind(globalThis),
    geolocation:
      environment.geolocation !== undefined
        ? environment.geolocation
        : (navigatorObject?.geolocation ?? null),
    notifications: notificationApi,
    serviceWorker:
      environment.serviceWorker !== undefined
        ? environment.serviceWorker
        : (navigatorObject?.serviceWorker ?? null),
    storage,
  };
}

function pushSupported(environment: Required<AlertSubscriptionEnvironment>): boolean {
  return (
    environment.serviceWorker !== null &&
    environment.notifications !== null &&
    typeof PushManager !== "undefined"
  );
}

function readStoredZone(storage: StorageLike | null): string {
  if (storage === null) {
    return "";
  }

  try {
    return storage.getItem(zoneStorageKey) ?? "";
  } catch {
    return "";
  }
}

function storeZone(storage: StorageLike | null, stationId: string): void {
  if (storage === null) {
    return;
  }

  try {
    storage.setItem(zoneStorageKey, stationId);
  } catch {
    // El aviso sigue funcionando aunque el navegador no permita recordar la zona.
  }
}

function removeStoredZone(storage: StorageLike | null): void {
  if (storage === null) {
    return;
  }

  try {
    storage.removeItem(zoneStorageKey);
  } catch {
    // Sin almacenamiento local la suscripcion igual se puede dar de baja.
  }
}

function positionPromise(
  geolocation: Pick<Geolocation, "getCurrentPosition">,
): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10_000,
      maximumAge: 5 * 60 * 1000,
    });
  });
}

async function readVapidPublicKey(fetchImplementation: typeof fetch): Promise<string> {
  const response = await fetchImplementation("/api/alertas/vapid", {
    headers: { accept: "application/json" },
  });

  if (!response.ok) {
    throw new Error(`No se pudo obtener la clave VAPID (${response.status}).`);
  }

  const payload: unknown = await response.json();

  if (
    !isRecord(payload) ||
    typeof payload.publicKey !== "string" ||
    payload.publicKey.length === 0
  ) {
    throw new Error("La clave VAPID publicada no es valida.");
  }

  return payload.publicKey;
}

function subscriptionBody(
  subscription: PushSubscriptionLike,
  stationId: string,
  locale: Locale,
): string {
  const serialized = subscription.toJSON();

  if (serialized.endpoint === undefined || serialized.keys === undefined) {
    throw new Error("El navegador devolvio una suscripcion incompleta.");
  }

  return JSON.stringify({
    endpoint: serialized.endpoint,
    expirationTime: serialized.expirationTime ?? null,
    keys: serialized.keys,
    stationIds: [stationId],
    locale,
  });
}

export function initAlertSubscription(
  documentRoot: Document,
  stations: readonly AlertSubscriptionStation[],
  locale: Locale,
  translations: TranslationSchema["alerts"]["push"],
  environment: AlertSubscriptionEnvironment = {},
): boolean {
  const container = queryElement<HTMLElement>(documentRoot, "[data-alert-subscription]");

  if (container === null) {
    return false;
  }

  if (container.dataset.initialized === "true") {
    return true;
  }

  const zoneSelect = queryElement<HTMLSelectElement>(container, "[data-alert-zone]");
  const locateButton = queryElement<HTMLButtonElement>(container, "[data-alert-locate]");
  const enableButton = queryElement<HTMLButtonElement>(container, "[data-alert-enable]");
  const disableButton = queryElement<HTMLButtonElement>(container, "[data-alert-disable]");
  const status = queryElement<HTMLElement>(container, "[data-alert-subscription-status]");

  if (
    zoneSelect === null ||
    locateButton === null ||
    enableButton === null ||
    disableButton === null ||
    status === null
  ) {
    return false;
  }

  container.dataset.initialized = "true";
  const resolved = resolveEnvironment(documentRoot, environment);
  const stationById = new Map(stations.map((station) => [station.id, station]));
  let active = false;

  for (const station of stations) {
    const option = documentRoot.createElement("option");
    option.value = station.id;
    option.textContent = station.name;
    zoneSelect.append(option);
  }

  const storedZone = readStoredZone(resolved.storage);

  if (stationById.has(storedZone)) {
    zoneSelect.value = storedZone;
  }

  const selectedStation = (): AlertSubscriptionStation | null =>
    stationById.get(zoneSelect.value) ?? null;

  const setStatus = (message: string): void => {
    status.textContent = message;
  };

  const refreshButtons = (): void => {
    const hasZone = selectedStation() !== null;
    enableButton.disabled = active || !hasZone;
    locateButton.disabled = active;
    zoneSelect.disabled = active;
    setHidden(enableButton, active);
    setHidden(disableButton, !active);
  };

  const showActive = (): void => {
    active = true;
    const station = selectedStation();
    setStatus(
      station === null
        ? translations.activeGeneric
        : interpolate(translations.active, { station: station.name }),
    );
    refreshButtons();
  };

  const showInactive = (message: string): void => {
    active = false;
    setStatus(message);
    refreshButtons();
  };

  if (!pushSupported(resolved)) {
    setStatus(translations.unsupported);
    locateButton.disabled = true;
    enableButton.disabled = true;
    setHidden(disableButton, true);
    return true;
  }

  const serviceWorker = resolved.serviceWorker;
  const notifications = resolved.notifications;
  const geolocation = resolved.geolocation;

  locateButton.disabled = false;
  setHidden(disableButton, true);
  refreshButtons();

  locateButton.addEventListener("click", () => {
    if (geolocation === null) {
      setStatus(translations.geolocationError);
      return;
    }

    locateButton.disabled = true;
    setStatus(translations.locating);

    void positionPromise(geolocation)
      .then((position) => {
        const nearest = nearestStation(stations, {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });

        if (nearest === null || nearest.distanceKilometres > maximumCoverageKilometres) {
          setStatus(translations.outside);
          return;
        }

        zoneSelect.value = nearest.station.id;
        storeZone(resolved.storage, nearest.station.id);
        setStatus(interpolate(translations.detected, { station: nearest.station.name }));
        refreshButtons();
      })
      .catch(() => {
        setStatus(translations.geolocationError);
      })
      .finally(() => {
        locateButton.disabled = false;
      });
  });

  zoneSelect.addEventListener("change", () => {
    storeZone(resolved.storage, zoneSelect.value);
    refreshButtons();
  });

  enableButton.addEventListener("click", () => {
    const station = selectedStation();

    if (station === null || serviceWorker === null || notifications === null) {
      return;
    }

    if (notifications.permission === "denied") {
      setStatus(translations.permissionDenied);
      return;
    }

    enableButton.disabled = true;
    setStatus(translations.activating);

    void (async () => {
      let createdSubscription = false;

      try {
        const permission =
          notifications.permission === "granted"
            ? "granted"
            : await notifications.requestPermission();

        if (permission !== "granted") {
          setStatus(translations.permissionDenied);
          refreshButtons();
          return;
        }

        const publicKey = await readVapidPublicKey(resolved.fetchImplementation);
        const registration = await serviceWorker.ready;
        const existing = await registration.pushManager.getSubscription();
        const subscription =
          existing ??
          (await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          }));

        createdSubscription = existing === null;

        const response = await resolved.fetchImplementation("/api/alertas/suscripcion", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: subscriptionBody(subscription, station.id, locale),
        });

        if (!response.ok) {
          throw new Error(`El servidor rechazo la suscripcion (${response.status}).`);
        }

        storeZone(resolved.storage, station.id);
        showActive();
      } catch {
        if (createdSubscription) {
          try {
            const registration = await serviceWorker.getRegistration();
            const subscription = await registration?.pushManager.getSubscription();

            await subscription?.unsubscribe().catch(() => false);
          } catch {
            // La baja local se puede reintentar al desactivar los avisos.
          }
        }

        setStatus(translations.activationError);
        refreshButtons();
      }
    })();
  });

  disableButton.addEventListener("click", () => {
    if (serviceWorker === null) {
      return;
    }

    setStatus(translations.deactivating);

    void (async () => {
      try {
        const registration = await serviceWorker.getRegistration();
        const subscription = await registration?.pushManager.getSubscription();

        if (subscription !== undefined && subscription !== null) {
          const endpoint = subscription.endpoint;
          await subscription.unsubscribe();
          await resolved.fetchImplementation("/api/alertas/baja", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ endpoint }),
          });
        }

        removeStoredZone(resolved.storage);
        showInactive(translations.inactive);
      } catch {
        setStatus(translations.deactivationError);
        refreshButtons();
      }
    })();
  });

  if (serviceWorker === null) {
    return true;
  }

  void (async () => {
    try {
      const registration = await serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();

      if (subscription !== undefined && subscription !== null) {
        showActive();
      }
    } catch {
      // Si no se puede consultar la suscripcion, la persona puede activarla igual.
    }
  })();

  return true;
}
