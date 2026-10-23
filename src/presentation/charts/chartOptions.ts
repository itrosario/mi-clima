/**
 * Opciones de los graficos.
 *
 * Los constructores son funciones puras: reciben categorias y series ya
 * calculadas y devuelven la opcion que consume ECharts. Al no tocar el DOM se
 * pueden probar sin navegador y reutilizar en cualquier pagina.
 */

import type { EChartsOption } from "echarts";

/** Paleta pensada para fondo claro y oscuro por igual. */
export const chartPalette = [
  "#0f766e",
  "#1d4ed8",
  "#b45309",
  "#b91c1c",
  "#6d28d9",
  "#0369a1",
] as const;

export interface ChartSeriesInput {
  readonly name: string;
  readonly values: readonly (number | null)[];
}

export interface LineChartInput {
  readonly categories: readonly string[];
  readonly series: readonly ChartSeriesInput[];
  readonly unit: string;
  /** Descripcion para lectores de pantalla. */
  readonly description: string;
}

export interface BarChartInput {
  readonly categories: readonly string[];
  readonly values: readonly (number | null)[];
  readonly unit: string;
  readonly description: string;
}

export function buildLineChartOption(input: LineChartInput): EChartsOption {
  return {
    animation: false,
    aria: { enabled: true, description: input.description },
    color: [...chartPalette],
    grid: { left: 48, right: 16, top: 40, bottom: 48 },
    legend: { bottom: 0, type: "scroll" },
    tooltip: { trigger: "axis", valueFormatter: (value) => formatTooltipValue(value, input.unit) },
    xAxis: { type: "category", data: [...input.categories], boundaryGap: false },
    yAxis: { type: "value", name: input.unit, scale: true },
    series: input.series.map((series) => ({
      name: series.name,
      type: "line",
      data: [...series.values],
      connectNulls: true,
      showSymbol: false,
      lineStyle: { width: 2 },
      emphasis: { focus: "series" },
    })),
  };
}

export function buildBarChartOption(input: BarChartInput): EChartsOption {
  return {
    animation: false,
    aria: { enabled: true, description: input.description },
    color: [chartPalette[2]],
    grid: { left: 48, right: 16, top: 40, bottom: 48 },
    tooltip: { trigger: "axis", valueFormatter: (value) => formatTooltipValue(value, input.unit) },
    xAxis: { type: "category", data: [...input.categories] },
    yAxis: { type: "value", name: input.unit, scale: true },
    series: [{ name: input.description, type: "bar", data: [...input.values] }],
  };
}

/** ECharts entrega el valor sin tipo; se normaliza antes de mostrarlo. */
function formatTooltipValue(value: unknown, unit: string): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(value)} ${unit}`;
  }

  return "\u2014";
}
