/**
 * Pagina de rios.
 *
 * Consulta el catalogo una sola vez y filtra en memoria: escribir en el buscador
 * no dispara pedidos nuevos. Los grupos se arman por rio y por tramo.
 */

import { loadStationCatalog } from "@/application/catalog/loadStationCatalog";
import type { Station } from "@/domain/catalog/types";
import { getTranslations, interpolate } from "../i18n";
import {
  createRiverSections,
  filterStationsByName,
  groupStationsByRiver,
} from "../rendering/rivers";
import { startAutoRefresh } from "../runtime/autoRefresh";
import { createTextElement, queryElement, renderInto } from "../runtime/dom";
import { readPageLocale, resolvePageContext, runPage } from "../runtime/pageRuntime";
import type { PageOptions } from "./pageOptions";

function countLabel(singular: string, plural: string, count: number): string {
  return interpolate(count === 1 ? singular : plural, { count });
}

export async function startRiversPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);
  const search = queryElement<HTMLInputElement>(document, "[data-river-search]");
  let stations: readonly Station[] = [];

  const renderList = (): void => {
    const query = search?.value ?? "";
    const filtered = filterStationsByName(stations, query);
    const groups = groupStationsByRiver(filtered);

    renderInto(
      document,
      "[data-river-list]",
      createRiverSections(document, groups, locale, translations),
    );
    renderInto(document, "[data-river-count]", [
      createTextElement(
        document,
        "p",
        "page-meta",
        `${countLabel(translations.rivers.riverCount, translations.rivers.riverCountPlural, groups.length)} \u00b7 ${countLabel(translations.rivers.stationCount, translations.rivers.stationCountPlural, filtered.length)}`,
      ),
    ]);
  };

  const load = async (signal: AbortSignal) => {
    const snapshot = await loadStationCatalog(
      { source: services.catalogSource, cache: services.catalogCache, clock: services.clock },
      signal,
    );

    return snapshot.catalog.stations;
  };

  const render = (loaded: readonly Station[]): void => {
    stations = loaded;
    renderList();
  };

  if (search !== null) {
    search.oninput = renderList;
  }

  const run = (): Promise<void> =>
    runPage({ document, load, render, fallbackErrorMessage: translations.common.error });

  await run();
  startAutoRefresh({ document, refresh: run });
}
