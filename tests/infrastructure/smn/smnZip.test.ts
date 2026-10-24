import { describe, expect, it } from "vitest";
import { decodeSmnText, extractZipEntry, SmnZipError } from "@/infrastructure/smn/smnZip";
import { createZipFixture } from "../../support/zipFixture";

const text = "Bahia Blanca;23-octubre-2026;16:00;Cubierto;15 km";

describe("extractZipEntry", () => {
  it("descomprime la entrada deflate del SMN", async () => {
    const bytes = await extractZipEntry(await createZipFixture(text));

    expect(decodeSmnText(bytes)).toBe(text);
  });

  it("acepta una entrada sin compresion", async () => {
    const bytes = await extractZipEntry(await createZipFixture(text, { method: 0 }));

    expect(decodeSmnText(bytes)).toBe(text);
  });

  it("rechaza un archivo truncado", async () => {
    await expect(extractZipEntry(new Uint8Array(10))).rejects.toBeInstanceOf(SmnZipError);
  });

  it("rechaza un archivo que no es ZIP", async () => {
    const bytes = await createZipFixture(text, { signature: 0x12345678 });

    await expect(extractZipEntry(bytes)).rejects.toThrow("no es un ZIP valido");
  });

  it("rechaza descriptores de datos no soportados", async () => {
    const bytes = await createZipFixture(text, { flags: 0x08 });

    await expect(extractZipEntry(bytes)).rejects.toThrow("descriptor de datos");
  });

  it("rechaza compresiones desconocidas", async () => {
    const bytes = await createZipFixture(text, { method: 99 });

    await expect(extractZipEntry(bytes)).rejects.toThrow("compresion no soportada");
  });
});

describe("decodeSmnText", () => {
  it("interpreta Windows-1252", () => {
    const bytes = new Uint8Array([0x42, 0x61, 0x68, 0xed, 0x61]);

    expect(decodeSmnText(bytes)).toBe("Bah\u00eda");
  });
});
