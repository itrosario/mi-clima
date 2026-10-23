/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import {
  createDataTable,
  createDefinitionList,
  createStatTile,
  createStatusBadge,
  type TableColumn,
} from "@/presentation/rendering/kit";

interface Row {
  readonly name: string;
  readonly level: number;
}

const columns: readonly TableColumn<Row>[] = [
  { key: "name", label: "Estacion", value: (row) => row.name },
  { key: "level", label: "Nivel", value: (row) => String(row.level), numeric: true },
];

describe("createStatusBadge", () => {
  it("incluye la clase del estado y su etiqueta", () => {
    const badge = createStatusBadge(window.document, "alert", "Alerta");

    expect(badge.className).toBe("status-badge status-badge--alert");
    expect(badge.textContent).toBe("Alerta");
  });
});

describe("createStatTile", () => {
  it("muestra etiqueta, valor y aclaracion", () => {
    const tile = createStatTile(window.document, {
      label: "Nivel",
      value: "5,10 m",
      hint: "Ultima lectura",
    });

    expect(tile.querySelector(".stat-tile__label")?.textContent).toBe("Nivel");
    expect(tile.querySelector(".stat-tile__value")?.textContent).toBe("5,10 m");
    expect(tile.querySelector(".stat-tile__hint")?.textContent).toBe("Ultima lectura");
  });

  it("omite la aclaracion cuando no existe", () => {
    const tile = createStatTile(window.document, { label: "Nivel", value: "5,10 m", hint: null });

    expect(tile.querySelector(".stat-tile__hint")).toBeNull();
  });
});

describe("createDataTable", () => {
  it("arma encabezados, celdas y columnas numericas", () => {
    const table = createDataTable(window.document, {
      caption: "Niveles",
      columns,
      rows: [{ name: "Rosario", level: 5.1 }],
      emptyMessage: "Sin datos",
    });

    expect(table.querySelector("caption")?.textContent).toBe("Niveles");
    expect(table.querySelectorAll("th")).toHaveLength(2);
    expect(table.querySelectorAll("th")[1]?.className).toBe("data-table__cell--numeric");
    expect(table.querySelectorAll("td")).toHaveLength(2);
    expect(table.querySelectorAll("td")[0]?.textContent).toBe("Rosario");
    expect(table.querySelectorAll("td")[1]?.className).toBe("data-table__cell--numeric");
  });

  it("informa cuando no hay filas", () => {
    const table = createDataTable(window.document, {
      caption: "Niveles",
      columns,
      rows: [],
      emptyMessage: "Sin datos",
    });

    expect(table.className).toBe("empty-state");
    expect(table.textContent).toBe("Sin datos");
  });
});

describe("createDefinitionList", () => {
  it("arma terminos y descripciones en orden", () => {
    const list = createDefinitionList(window.document, [
      { term: "Fuente", description: "INA" },
      { term: "Unidad", description: "metros" },
    ]);

    expect(list.querySelectorAll("dt")).toHaveLength(2);
    expect(list.querySelectorAll("dd")[0]?.textContent).toBe("INA");
    expect(list.querySelectorAll("dd")[1]?.textContent).toBe("metros");
  });
});
