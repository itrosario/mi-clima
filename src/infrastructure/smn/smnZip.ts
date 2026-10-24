/**
 * Lectura de los archivos ZIP del SMN.
 *
 * El SMN publica sus datos abiertos como un ZIP con una unica entrada de
 * texto. Se lee el encabezado local y se descomprime con la API estandar del
 * runtime; no se interpreta ninguna entrada que no sea la primera.
 */

const localFileSignature = 0x04034b50;
const storedMethod = 0;
const deflateMethod = 8;
const localHeaderLength = 30;

export class SmnZipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SmnZipError";
  }
}

function readHeader(bytes: Uint8Array): DataView {
  if (bytes.byteLength < localHeaderLength) {
    throw new SmnZipError("El archivo del SMN esta truncado.");
  }

  const header = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);

  if (header.getUint32(0, true) !== localFileSignature) {
    throw new SmnZipError("El archivo del SMN no es un ZIP valido.");
  }

  return header;
}

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const body = new Response(new Uint8Array(data)).body as ReadableStream<Uint8Array>;
  const decompressor = new DecompressionStream("deflate-raw") as unknown as TransformStream<
    Uint8Array,
    Uint8Array
  >;
  const stream = body.pipeThrough(decompressor);

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Extrae la primera entrada del ZIP publicado por el SMN. */
export async function extractZipEntry(bytes: Uint8Array): Promise<Uint8Array> {
  const header = readHeader(bytes);
  const flags = header.getUint16(6, true);
  const method = header.getUint16(8, true);
  const compressedSize = header.getUint32(18, true);
  const nameLength = header.getUint16(26, true);
  const extraLength = header.getUint16(28, true);
  const dataStart = localHeaderLength + nameLength + extraLength;
  const data = bytes.subarray(dataStart, dataStart + compressedSize);

  if ((flags & 0x08) !== 0) {
    throw new SmnZipError("El ZIP del SMN usa un descriptor de datos no soportado.");
  }

  if (method === storedMethod) {
    return data;
  }

  if (method !== deflateMethod) {
    throw new SmnZipError("El ZIP del SMN usa una compresion no soportada.");
  }

  return inflateRaw(data);
}

/** Decodifica el texto del SMN, que viaja en Windows-1252. */
export function decodeSmnText(bytes: Uint8Array): string {
  return new TextDecoder("windows-1252").decode(bytes);
}
