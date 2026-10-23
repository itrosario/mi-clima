/**
 * Puerto de lectura de alturas de Prefectura Naval Argentina.
 *
 * La implementacion de produccion habla con el proxy del propio sitio, que es
 * el unico que puede alcanzar la fuente oficial sin CORS.
 */

import type { PrefecturaSnapshot } from "../prefectura/types";

export interface PrefecturaSource {
  fetchSnapshot(signal?: AbortSignal): Promise<PrefecturaSnapshot>;
}
