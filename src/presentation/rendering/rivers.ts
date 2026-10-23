/**
 * Agrupacion y dibujo del catalogo de rios.
 *
 * La vista muestra un bloque por rio y, dentro, un bloque por tramo. Las
 * estaciones enlazan a su ficha y el filtro se aplica sobre el catalogo ya
 * cargado: no vuelve a consultar la red.
 */

import { normalizeSearchText } from "@/domain/catalog/stationCatalog";
import type { Reach, River, Station } from "@/domain/catalog/types";
import { interpolate } from "../i18n";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { stationHref } from "../routes";
import { createEmptyState, createTextElement } from "../runtime/dom";

export interface ReachGroup {
  readonly reach: Reach;
  readonly stations: readonly Station[];
}

export interface RiverGroup {
  readonly river: River;
  readonly reaches: readonly ReachGroup[];
  readonly stationCount: number;
}

export function groupStationsByRiver(stations: readonly Station[]): readonly RiverGroup[] {
  const rivers = new Map<
    string,
    { river: River; reaches: Map<string, { reach: Reach; stations: Station[] }> }
  >();

  for (const station of stations) {
    let riverEntry = rivers.get(station.river.id);
    if (riverEntry === undefined) {
      riverEntry = { river: station.river, reaches: new Map() };
      rivers.set(station.river.id, riverEntry);
    }

    let reachEntry = riverEntry.reaches.get(station.reach.id);
    if (reachEntry === undefined) {
      reachEntry = { reach: station.reach, stations: [] };
      riverEntry.reaches.set(station.reach.id, reachEntry);
    }

    reachEntry.stations.push(station);
  }

  return [...rivers.values()].map((riverEntry) => {
    const reaches = [...riverEntry.reaches.values()].map((reachEntry) => ({
      reach: reachEntry.reach,
      stations: reachEntry.stations,
    }));

    return {
      river: riverEntry.river,
      reaches,
      stationCount: reaches.reduce((total, reach) => total + reach.stations.length, 0),
    };
  });
}

export function filterStationsByName(
  stations: readonly Station[],
  query: string,
): readonly Station[] {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery.length === 0) {
    return stations;
  }

  return stations.filter((station) =>
    normalizeSearchText(
      `${station.name} ${station.river.name} ${station.reach.name} ${station.networkName}`,
    ).includes(normalizedQuery),
  );
}

function stationCountLabel(count: number, translations: TranslationSchema): string {
  return interpolate(
    count === 1 ? translations.rivers.stationCount : translations.rivers.stationCountPlural,
    { count },
  );
}

function createReachBlock(
  document: Document,
  group: ReachGroup,
  locale: Locale,
  translations: TranslationSchema,
): HTMLElement {
  const block = document.createElement("div");
  block.className = "river-group__reach";

  const heading = createTextElement(
    document,
    "h3",
    "river-group__reach-title",
    `${translations.rivers.reachLabel}: ${group.reach.name}`,
  );
  const list = document.createElement("ul");
  list.className = "river-group__stations";

  for (const station of group.stations) {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = stationHref(locale, station.id);
    link.textContent = station.name;
    item.append(link);
    list.append(item);
  }

  block.append(heading, list);

  return block;
}

export function createRiverSections(
  document: Document,
  groups: readonly RiverGroup[],
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  if (groups.length === 0) {
    return [createEmptyState(document, translations.rivers.noResults)];
  }

  return groups.map((group) => {
    const section = document.createElement("section");
    section.className = "river-group";

    const heading = createTextElement(
      document,
      "h2",
      "river-group__title",
      `${group.river.name} \u00b7 ${stationCountLabel(group.stationCount, translations)}`,
    );
    section.append(heading);

    for (const reach of group.reaches) {
      section.append(createReachBlock(document, reach, locale, translations));
    }

    return section;
  });
}
