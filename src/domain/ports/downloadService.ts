/**
 * Puerto de descarga de archivos.
 *
 * La infraestructura lo implementa con un `Blob` y un enlace temporal. El
 * dominio solo describe que archivo quiere entregar.
 */

export interface DownloadRequest {
  readonly fileName: string;
  readonly mimeType: string;
  readonly content: string;
}

export interface DownloadService {
  download(request: DownloadRequest): void;
}
