import { describe, expect, it } from "vitest";
import { buildExportFileName, formatFileDate, sanitizeSlug } from "@/domain/export/filename";

describe("sanitizeSlug", () => {
  it("quita acentos y unifica separadores", () => {
    expect(sanitizeSlug("Paraná Medio")).toBe("parana-medio");
    expect(sanitizeSlug("  Rosario / Santa Fe  ")).toBe("rosario-santa-fe");
  });

  it("conserva numeros", () => {
    expect(sanitizeSlug("Estacion 34")).toBe("estacion-34");
  });

  it("cae en un nombre generico cuando no queda nada utilizable", () => {
    expect(sanitizeSlug("***")).toBe("datos");
    expect(sanitizeSlug("")).toBe("datos");
  });
});

describe("formatFileDate", () => {
  it("formatea la fecha en UTC con mes y dia de dos digitos", () => {
    expect(formatFileDate(new Date("2026-01-05T23:30:00.000Z"))).toBe("2026-01-05");
    expect(formatFileDate(new Date("2026-10-22T00:00:00.000Z"))).toBe("2026-10-22");
  });
});

describe("buildExportFileName", () => {
  it("combina el identificador, la fecha y la extension del formato", () => {
    const generatedAt = new Date("2026-10-22T12:00:00.000Z");

    expect(buildExportFileName("parana-medio", "csv", generatedAt)).toBe(
      "parana-medio-2026-10-22.csv",
    );
    expect(buildExportFileName("parana-medio", "json", generatedAt)).toBe(
      "parana-medio-2026-10-22.json",
    );
    expect(buildExportFileName("parana-medio", "txt", generatedAt)).toBe(
      "parana-medio-2026-10-22.txt",
    );
  });

  it("sanea el identificador recibido", () => {
    expect(buildExportFileName("Río Paraná", "csv", new Date("2026-10-22T12:00:00.000Z"))).toBe(
      "rio-parana-2026-10-22.csv",
    );
  });
});
