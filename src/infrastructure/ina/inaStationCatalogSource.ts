/**
 * Catalogo de estaciones publicado por el INA.
 *
 * La respuesta ronda los 900 KB y cambia de a poco, asi que la capa de
 * aplicacion la guarda en cache; este adaptador solo traduce.
 */

import type { Station } from "@/domain/catalog/types";
import type { StationCatalogSource } from "@/domain/ports/stationCatalogSource";
import type { InaApiClient } from "./inaApiClient";
import { parseInaStation } from "./inaPayloads";

function isStation(station: Station | null): station is Station {
  return station !== null;
}

export class InaStationCatalogSource implements StationCatalogSource {
  private readonly client: InaApiClient;

  constructor(client: InaApiClient) {
    this.client = client;
  }

  async fetchStations(signal?: AbortSignal): Promise<readonly Station[]> {
    const rows = await this.client.request("estaciones", {}, signal);

    return rows.map(parseInaStation).filter(isStation);
  }
}
