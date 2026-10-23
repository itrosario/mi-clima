import { describe, expect, it } from "vitest";
import {
  buildBarChartOption,
  buildLineChartOption,
  chartPalette,
} from "@/presentation/charts/chartOptions";

function readTooltipFormatter(option: unknown): (value: unknown) => string {
  return (option as { tooltip: { valueFormatter: (value: unknown) => string } }).tooltip
    .valueFormatter;
}

describe("buildLineChartOption", () => {
  it("arma ejes, series y descripcion accesible", () => {
    const option = buildLineChartOption({
      categories: ["21/10", "22/10"],
      series: [{ name: "Rosario", values: [4.8, 5.1] }],
      unit: "m",
      description: "Niveles del corredor",
    });

    expect(option).toMatchObject({
      animation: false,
      aria: { enabled: true, description: "Niveles del corredor" },
      yAxis: { name: "m" },
      xAxis: { data: ["21/10", "22/10"] },
      series: [{ name: "Rosario", type: "line", data: [4.8, 5.1] }],
    });
    expect(option.color).toEqual([...chartPalette]);
  });

  it("dibuja la linea de referencia solo en la primera serie", () => {
    const option = buildLineChartOption({
      categories: ["21/10", "22/10"],
      series: [
        { name: "Rosario", values: [80, 120] },
        { name: "Villa", values: [90, 110] },
      ],
      unit: "% del promedio",
      description: "Índice del corredor",
      referenceLine: { value: 100, label: "100 = promedio" },
    });

    const series = option.series as {
      markLine?: { data: { yAxis: number }[]; label: { formatter: string } };
    }[];

    expect(series[0]?.markLine?.data).toEqual([{ yAxis: 100 }]);
    expect(series[0]?.markLine?.label.formatter).toBe("100 = promedio");
    expect(series[1]?.markLine).toBeUndefined();
  });

  it("formatea el valor del globo y tolera datos no numericos", () => {
    const formatter = readTooltipFormatter(
      buildLineChartOption({
        categories: [],
        series: [],
        unit: "m",
        description: "Serie",
      }),
    );

    expect(formatter(4.82)).toBe("4,82 m");
    expect(formatter("sin dato")).toBe("\u2014");
  });
});

describe("buildBarChartOption", () => {
  it("arma una serie de barras por categoria", () => {
    const option = buildBarChartOption({
      categories: ["2025", "2026"],
      values: [5.4, 5.1],
      unit: "m",
      description: "Maximos anuales",
    });

    expect(option).toMatchObject({
      xAxis: { data: ["2025", "2026"] },
      series: [{ type: "bar", data: [5.4, 5.1] }],
    });
  });

  it("formatea el globo de la barra y tolera valores invalidos", () => {
    const formatter = readTooltipFormatter(
      buildBarChartOption({
        categories: ["2025"],
        values: [5.4],
        unit: "m",
        description: "Maximos anuales",
      }),
    );

    expect(formatter(5.4)).toBe("5,4 m");
    expect(formatter(Number.NaN)).toBe("\u2014");
    expect(formatter(null)).toBe("\u2014");
  });
});
