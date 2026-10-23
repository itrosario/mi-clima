/**
 * Claves VAPID para firmar los envios Web Push.
 *
 * Si el entorno no define `VAPID_PUBLIC_KEY` y `VAPID_PRIVATE_KEY`, el Worker
 * genera un par la primera vez y lo guarda en KV. Esa clave privada nunca se
 * envia al navegador: solo se publica la clave publica que necesita
 * `pushManager.subscribe`.
 */

import { readVapidKeys, writeVapidKeys } from "./alertStore";
import type { AlertKvNamespace, AlertWorkerEnvironment } from "./alertTypes";
import { decodeBase64Url, encodeBase64Url } from "./base64";

export interface VapidKeyPair {
  readonly publicKey: string;
  readonly privateKey: string;
}

export interface VapidConfig extends VapidKeyPair {
  readonly subject: string;
}

const defaultVapidSubject = "https://mi-clima.itrosario.workers.dev";

function isValidVapidPair(pair: VapidKeyPair): boolean {
  const publicKey = decodeBase64Url(pair.publicKey);
  const privateKey = decodeBase64Url(pair.privateKey);

  return (
    publicKey !== null &&
    publicKey.length === 65 &&
    publicKey[0] === 4 &&
    privateKey !== null &&
    privateKey.length === 32
  );
}

export async function generateVapidKeys(): Promise<VapidKeyPair> {
  const keyPair = await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
    "sign",
    "verify",
  ]);
  const publicJwk = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const privateJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  if (publicJwk.x === undefined || publicJwk.y === undefined || privateJwk.d === undefined) {
    throw new Error("No se pudieron exportar las claves VAPID");
  }

  const x = decodeBase64Url(publicJwk.x);
  const y = decodeBase64Url(publicJwk.y);
  const d = decodeBase64Url(privateJwk.d);

  if (x === null || y === null || d === null) {
    throw new Error("Las claves VAPID exportadas no son validas");
  }

  const publicKey = new Uint8Array(65);
  publicKey[0] = 4;
  publicKey.set(x, 1);
  publicKey.set(y, 33);

  return {
    publicKey: encodeBase64Url(publicKey),
    privateKey: encodeBase64Url(d),
  };
}

export function vapidSubject(environment: AlertWorkerEnvironment): string {
  const subject = environment.VAPID_SUBJECT?.trim();

  return subject === undefined || subject.length === 0 ? defaultVapidSubject : subject;
}

export async function loadVapidKeys(
  kv: AlertKvNamespace | null,
  environment: AlertWorkerEnvironment,
): Promise<VapidKeyPair | null> {
  const configuredKeys =
    environment.VAPID_PUBLIC_KEY !== undefined && environment.VAPID_PRIVATE_KEY !== undefined
      ? {
          publicKey: environment.VAPID_PUBLIC_KEY,
          privateKey: environment.VAPID_PRIVATE_KEY,
        }
      : null;

  if (configuredKeys !== null && isValidVapidPair(configuredKeys)) {
    return configuredKeys;
  }

  if (kv === null) {
    return null;
  }

  const stored = await readVapidKeys(kv);

  if (stored !== null) {
    try {
      const parsed: unknown = JSON.parse(stored);

      if (
        typeof parsed === "object" &&
        parsed !== null &&
        "publicKey" in parsed &&
        "privateKey" in parsed &&
        typeof parsed.publicKey === "string" &&
        typeof parsed.privateKey === "string"
      ) {
        const keys = { publicKey: parsed.publicKey, privateKey: parsed.privateKey };

        if (isValidVapidPair(keys)) {
          return keys;
        }
      }
    } catch {
      // Si el valor guardado esta corrupto se genera un par nuevo.
    }
  }

  const generated = await generateVapidKeys();
  await writeVapidKeys(kv, JSON.stringify(generated));

  return generated;
}
