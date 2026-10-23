/**
 * Mensajes y envio de notificaciones Web Push.
 *
 * El texto aclara siempre que el aviso se deriva de los umbrales oficiales del
 * INA y que no es un boletin de emergencia. La decision de que avisar y a quien
 * vive en el monitor; aca solo se arma y se entrega el mensaje.
 */

import { buildPushPayload } from "@block65/webcrypto-web-push";
import type { AlertLocale, AlertSubscription, FloodEvent } from "./alertTypes";
import type { VapidConfig } from "./vapid";

export interface AlertPushMessage {
  readonly title: string;
  readonly body: string;
  readonly url: string;
  readonly tag: string;
  readonly type: FloodEvent["type"];
}

export interface AlertPushDelivery {
  readonly status: number;
}

const officialNote: Record<AlertLocale, string> = {
  es: "Basado en umbrales oficiales del INA; no es un boletín oficial de emergencia.",
  en: "Based on official INA thresholds; this is not an official emergency bulletin.",
};

function formatMetres(value: number, locale: AlertLocale): string {
  const formatter = new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${formatter.format(value)} m`;
}

function buildTitle(event: FloodEvent, locale: AlertLocale): string {
  switch (event.type) {
    case "alert":
      return locale === "es"
        ? `Alerta de inundación en ${event.stationName}`
        : `Flood alert in ${event.stationName}`;
    case "evacuation":
      return locale === "es"
        ? `Evacuación en ${event.stationName}`
        : `Evacuation in ${event.stationName}`;
    case "clear":
      return locale === "es"
        ? `Alerta finalizada en ${event.stationName}`
        : `Alert cleared in ${event.stationName}`;
    case "rapid-rise":
      return locale === "es"
        ? `Subida rápida en ${event.stationName}`
        : `Rapid rise in ${event.stationName}`;
  }
}

function buildBody(event: FloodEvent, locale: AlertLocale): string {
  const level = event.level === null ? null : formatMetres(event.level, locale);
  let body: string;

  switch (event.type) {
    case "alert":
      body =
        level === null
          ? locale === "es"
            ? "El nivel superó el umbral de alerta."
            : "The level exceeded the alert threshold."
          : locale === "es"
            ? `El nivel alcanzó ${level}, por encima del umbral de alerta.`
            : `The level reached ${level}, above the alert threshold.`;
      break;
    case "evacuation":
      body =
        level === null
          ? locale === "es"
            ? "El nivel superó el umbral de evacuación."
            : "The level exceeded the evacuation threshold."
          : locale === "es"
            ? `El nivel alcanzó ${level}, por encima del umbral de evacuación.`
            : `The level reached ${level}, above the evacuation threshold.`;
      break;
    case "clear":
      body =
        level === null
          ? locale === "es"
            ? "El nivel ya no supera el umbral de alerta."
            : "The level is no longer above the alert threshold."
          : locale === "es"
            ? `El nivel bajó a ${level} y ya no supera el umbral de alerta.`
            : `The level fell to ${level} and is no longer above the alert threshold.`;
      break;
    case "rapid-rise": {
      const rise = event.riseMetres === null ? null : formatMetres(event.riseMetres, locale);
      const hours = event.windowHours ?? 6;

      body =
        rise === null
          ? locale === "es"
            ? "El nivel subió de forma marcada."
            : "The level rose sharply."
          : locale === "es"
            ? `El nivel subió ${rise} en las últimas ${hours} horas.`
            : `The level rose ${rise} in the last ${hours} hours.`;
      break;
    }
  }

  return `${body} ${officialNote[locale]}`;
}

export function buildAlertPush(event: FloodEvent, locale: AlertLocale): AlertPushMessage {
  return {
    title: buildTitle(event, locale),
    body: buildBody(event, locale),
    url: `/${locale}/alertas/`,
    tag: `mi-clima-${event.stationId}`,
    type: event.type,
  };
}

export async function sendAlertPush(
  subscription: AlertSubscription,
  event: FloodEvent,
  vapid: VapidConfig,
  fetchImplementation: typeof fetch = fetch,
): Promise<Response> {
  const payload = await buildPushPayload(
    {
      data: { ...buildAlertPush(event, subscription.locale) },
      options: {
        ttl: 60 * 60,
        urgency: event.type === "evacuation" ? "high" : "normal",
        topic: event.stationId,
      },
    },
    {
      endpoint: subscription.endpoint,
      expirationTime: subscription.expirationTime,
      keys: subscription.keys,
    },
    {
      subject: vapid.subject,
      publicKey: vapid.publicKey,
      privateKey: vapid.privateKey,
    },
  );

  return fetchImplementation(subscription.endpoint, {
    method: payload.method,
    headers: payload.headers,
    body: payload.body,
  });
}

export function isGonePushResponse(response: AlertPushDelivery): boolean {
  return response.status === 404 || response.status === 410;
}
