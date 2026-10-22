/**
 * Descarga de archivos en el navegador.
 *
 * Genera un `Blob`, lo expone con una URL temporal y dispara un enlace de
 * descarga. La URL se revoca enseguida para no retener memoria.
 */

import type { DownloadRequest, DownloadService } from "@/domain/ports/downloadService";

export class BlobDownloadService implements DownloadService {
  private readonly document: Document;

  constructor(document: Document) {
    this.document = document;
  }

  download(request: DownloadRequest): void {
    const blob = new Blob([request.content], { type: request.mimeType });
    const objectUrl = URL.createObjectURL(blob);
    const link = this.document.createElement("a");

    link.href = objectUrl;
    link.download = request.fileName;
    link.rel = "noopener";
    this.document.body.append(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
