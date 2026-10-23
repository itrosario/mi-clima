/**
 * Piezas reutilizables de la interfaz.
 *
 * Tarjetas de metrica, etiquetas de estado y tablas se construyen con estas
 * funciones para que todas las paginas compartan la misma semantica y las
 * mismas clases del sistema de diseno.
 */

import type { FloodStatus } from "@/domain/flood/types";
import { createTextElement } from "../runtime/dom";

export function createStatusBadge(
  document: Document,
  status: FloodStatus,
  label: string,
): HTMLElement {
  return createTextElement(document, "span", `status-badge status-badge--${status}`, label);
}

/** Leyenda del semaforo hidrologico, en el orden en que se declara. */
export function createStatusLegend(
  document: Document,
  statuses: readonly FloodStatus[],
  labels: Record<FloodStatus, string>,
): readonly HTMLElement[] {
  return statuses.map((status) => {
    const item = document.createElement("li");
    item.className = `status-legend__item status-legend__item--${status}`;
    item.textContent = labels[status];

    return item;
  });
}

export interface StatTileInput {
  readonly label: string;
  readonly value: string;
  readonly hint: string | null;
}

export function createStatTile(document: Document, input: StatTileInput): HTMLElement {
  const tile = document.createElement("div");
  tile.className = "stat-tile";

  const label = createTextElement(document, "span", "stat-tile__label", input.label);
  const value = createTextElement(document, "span", "stat-tile__value", input.value);
  tile.append(label, value);

  if (input.hint !== null) {
    tile.append(createTextElement(document, "span", "stat-tile__hint", input.hint));
  }

  return tile;
}

export interface TableColumn<Row> {
  readonly key: string;
  readonly label: string;
  readonly value: (row: Row) => string;
  readonly numeric?: boolean;
}

export interface TableInput<Row> {
  readonly caption: string;
  readonly columns: readonly TableColumn<Row>[];
  readonly rows: readonly Row[];
  readonly emptyMessage: string;
}

export function createDataTable<Row>(document: Document, input: TableInput<Row>): HTMLElement {
  if (input.rows.length === 0) {
    return createTextElement(document, "p", "empty-state", input.emptyMessage);
  }

  const wrapper = document.createElement("div");
  wrapper.className = "data-table-wrapper";

  const table = document.createElement("table");
  table.className = "data-table";

  const caption = document.createElement("caption");
  caption.textContent = input.caption;

  const headRow = document.createElement("tr");

  for (const column of input.columns) {
    const header = document.createElement("th");
    header.scope = "col";
    header.textContent = column.label;

    if (column.numeric === true) {
      header.className = "data-table__cell--numeric";
    }

    headRow.append(header);
  }

  const thead = document.createElement("thead");
  thead.append(headRow);

  const tbody = document.createElement("tbody");

  for (const row of input.rows) {
    const bodyRow = document.createElement("tr");

    for (const column of input.columns) {
      const cell = document.createElement("td");
      cell.textContent = column.value(row);

      if (column.numeric === true) {
        cell.className = "data-table__cell--numeric";
      }

      bodyRow.append(cell);
    }

    tbody.append(bodyRow);
  }

  table.append(caption, thead, tbody);
  wrapper.append(table);

  return wrapper;
}

export interface DefinitionEntry {
  readonly term: string;
  readonly description: string;
}

export function createDefinitionList(
  document: Document,
  entries: readonly DefinitionEntry[],
): HTMLElement {
  const list = document.createElement("dl");
  list.className = "definition-list";

  for (const entry of entries) {
    list.append(
      createTextElement(document, "dt", "definition-list__term", entry.term),
      createTextElement(document, "dd", "definition-list__description", entry.description),
    );
  }

  return list;
}
