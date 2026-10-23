/**
 * Catalogo de estaciones como tabla navegable.
 *
 * Cada fila enlaza a la ficha de la estacion. La tabla se arma con nodos reales
 * (`th`, `caption`, enlaces) para conservar la semantica y el foco por teclado.
 */

import type { Station } from "@/domain/catalog/types";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { stationHref } from "../routes";
import { createEmptyState } from "../runtime/dom";

export function createStationCatalogue(
  document: Document,
  stations: readonly Station[],
  locale: Locale,
  translations: TranslationSchema,
): HTMLElement {
  if (stations.length === 0) {
    return createEmptyState(document, translations.common.noData);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "data-table-wrapper";

  const table = document.createElement("table");
  table.className = "data-table";

  const caption = document.createElement("caption");
  caption.textContent = translations.stations.catalogueTitle;
  table.append(caption);

  const headRow = document.createElement("tr");
  for (const label of [
    translations.common.station,
    translations.common.river,
    translations.common.reach,
    translations.stations.network,
  ]) {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = label;
    headRow.append(header);
  }

  const thead = document.createElement("thead");
  thead.append(headRow);

  const tbody = document.createElement("tbody");
  for (const station of stations) {
    const row = document.createElement("tr");

    const nameCell = document.createElement("th");
    nameCell.scope = "row";
    const link = document.createElement("a");
    link.href = stationHref(locale, station.id);
    link.textContent = station.name;
    nameCell.append(link);

    const riverCell = document.createElement("td");
    riverCell.textContent = station.river.name;

    const reachCell = document.createElement("td");
    reachCell.textContent = station.reach.name;

    const networkCell = document.createElement("td");
    networkCell.textContent = station.networkName;

    row.append(nameCell, riverCell, reachCell, networkCell);
    tbody.append(row);
  }

  table.append(thead, tbody);
  wrapper.append(table);

  return wrapper;
}
