/**
 * @vitest-environment happy-dom
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BlobDownloadService } from "@/infrastructure/download/blobDownloadService";

let createObjectUrl: ReturnType<typeof vi.fn>;
let revokeObjectUrl: ReturnType<typeof vi.fn>;
let downloadedFileNames: string[];

beforeEach(() => {
  createObjectUrl = vi.fn(() => "blob:mi-clima");
  revokeObjectUrl = vi.fn();
  downloadedFileNames = [];

  URL.createObjectURL = createObjectUrl as unknown as typeof URL.createObjectURL;
  URL.revokeObjectURL = revokeObjectUrl as unknown as typeof URL.revokeObjectURL;
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    downloadedFileNames.push(this.download);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("BlobDownloadService", () => {
  it("dispara la descarga con el nombre y el tipo pedidos", async () => {
    const service = new BlobDownloadService(document);

    service.download({
      fileName: "rosario-2026-10-22.csv",
      mimeType: "text/csv;charset=utf-8",
      content: "estacion;nivel\nRosario;4.1\n",
    });

    expect(downloadedFileNames).toEqual(["rosario-2026-10-22.csv"]);

    const blob = createObjectUrl.mock.calls[0]?.[0] as Blob;
    expect(blob.type).toBe("text/csv;charset=utf-8");
    await expect(blob.text()).resolves.toBe("estacion;nivel\nRosario;4.1\n");
  });

  it("revoca la URL temporal y quita el enlace del documento", () => {
    const service = new BlobDownloadService(document);

    service.download({ fileName: "datos.json", mimeType: "application/json", content: "{}" });

    expect(revokeObjectUrl).toHaveBeenCalledWith("blob:mi-clima");
    expect(document.querySelector("a")).toBeNull();
  });
});
