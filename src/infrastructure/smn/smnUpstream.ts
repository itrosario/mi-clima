/**
 * Acceso a los datos abiertos del SMN.
 *
 * El SMN entrega un ZIP por producto y exige un agente de usuario de
 * navegador. El Worker descarga ambos archivos, los descomprime y devuelve la
 * instantanea ya normalizada. Lo que la fuente no publica queda como `null`.
 */

import type { OfficialWeatherSnapshot } from "@/domain/weather/official";
import { buildSmnSnapshot } from "./smnPayload";
import { decodeSmnText, extractZipEntry } from "./smnZip";

export const smnPresentWeatherUrl = "https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=tiepre";
export const smnStationsUrl = "https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=estaciones";

const upstreamHeaders = {
  accept: "application/octet-stream",
  referer: "https://www.smn.gob.ar/",
  "user-agent": "Mi-Clima/1.0 (+https://mi-clima.itrosario.workers.dev)",
} as const;

export class SmnUpstreamError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmnUpstreamError";
  }
}

export interface SmnUpstreamOptions {
  readonly fetchImplementation?: typeof fetch;
}

async function fetchZipText(url: string, fetchImplementation: typeof fetch): Promise<string> {
  const response = await fetchImplementation(url, {
    method: "GET",
    headers: upstreamHeaders,
  });

  if (!response.ok) {
    throw new SmnUpstreamError(`El SMN respondio ${response.status}.`);
  }

  const bytes = new Uint8Array(await response.arrayBuffer());

  return decodeSmnText(await extractZipEntry(bytes));
}

/** Descarga y normaliza el estado del tiempo presente del SMN. */
export async function loadSmnSnapshot(
  options: SmnUpstreamOptions = {},
): Promise<OfficialWeatherSnapshot> {
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  const [stationsText, observationsText] = await Promise.all([
    fetchZipText(smnStationsUrl, fetchImplementation),
    fetchZipText(smnPresentWeatherUrl, fetchImplementation),
  ]);

  return buildSmnSnapshot(stationsText, observationsText);
}
