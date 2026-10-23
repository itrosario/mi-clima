import { describe, expect, it } from "vitest";
import {
  formatChartDate,
  formatDate,
  formatDateTime,
  formatMeasurement,
  formatNumber,
  formatPercent,
  formatSignedNumber,
} from "@/presentation/format/formatters";

describe("formatNumber", () => {
  it("usa coma decimal en castellano y punto en ingles", () => {
    expect(formatNumber(4.821, "es")).toBe("4,82");
    expect(formatNumber(4.821, "en")).toBe("4.82");
  });

  it("acepta la cantidad de decimales pedida", () => {
    expect(formatNumber(5, "es", 0)).toBe("5");
  });

  it("reemplaza valores ausentes o no finitos", () => {
    expect(formatNumber(null, "es")).toBe("\u2014");
    expect(formatNumber(Number.NaN, "es")).toBe("\u2014");
  });
});

describe("formatSignedNumber", () => {
  it("antepone el signo cuando hay variacion", () => {
    expect(formatSignedNumber(0.5, "es")).toBe("+0,50");
    expect(formatSignedNumber(-0.5, "es")).toBe("\u22120,50");
  });

  it("no agrega signo al cero y conserva el ausente", () => {
    expect(formatSignedNumber(0, "es")).toBe("0,00");
    expect(formatSignedNumber(null, "es")).toBe("\u2014");
  });
});

describe("formatMeasurement", () => {
  it("agrega la unidad cuando existe", () => {
    expect(formatMeasurement(4.8, "m", "es")).toBe("4,80 m");
  });

  it("omite la unidad vacia y conserva el ausente", () => {
    expect(formatMeasurement(4.8, "", "es")).toBe("4,80");
    expect(formatMeasurement(null, "m", "es")).toBe("\u2014");
  });
});

describe("formatPercent", () => {
  it("agrega el simbolo de porcentaje", () => {
    expect(formatPercent(72.4, "es")).toBe("72 %");
    expect(formatPercent(null, "es")).toBe("\u2014");
  });
});

describe("formatDate y formatDateTime", () => {
  it("informa el dato ausente", () => {
    expect(formatDate(null, "es")).toBe("\u2014");
    expect(formatDateTime(null, "es")).toBe("\u2014");
  });

  it("usa la zona horaria argentina", () => {
    const timestamp = new Date("2026-10-22T03:00:00.000Z");

    expect(formatDate(timestamp, "es")).toContain("2026");
    expect(formatDateTime(timestamp, "es")).toContain("22/10");
  });
});

describe("formatChartDate", () => {
  it("muestra dia y mes", () => {
    expect(formatChartDate(new Date("2026-10-22T12:00:00.000Z"), "es")).toBe("22/10");
  });
});
