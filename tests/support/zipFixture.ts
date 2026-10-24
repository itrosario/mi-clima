const name = "datos.txt";

interface ZipFixtureOptions {
  readonly method?: number;
  readonly flags?: number;
  readonly signature?: number;
  readonly truncateTo?: number;
}

async function deflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([data.buffer as ArrayBuffer])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));

  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Arma un ZIP con una sola entrada, suficiente para el lector del SMN. */
export async function createZipFixture(
  text: string,
  options: ZipFixtureOptions = {},
): Promise<Uint8Array> {
  const method = options.method ?? 8;
  const content = new TextEncoder().encode(text);
  const stored = method === 8 ? await deflateRaw(content) : content;
  const nameBytes = new TextEncoder().encode(name);
  const bytes = new Uint8Array(30 + nameBytes.length + stored.length);
  const header = new DataView(bytes.buffer);

  header.setUint32(0, options.signature ?? 0x04034b50, true);
  header.setUint16(6, options.flags ?? 0, true);
  header.setUint16(8, method, true);
  header.setUint32(18, stored.length, true);
  header.setUint32(22, content.length, true);
  header.setUint16(26, nameBytes.length, true);
  bytes.set(nameBytes, 30);
  bytes.set(stored, 30 + nameBytes.length);

  return options.truncateTo === undefined ? bytes : bytes.subarray(0, options.truncateTo);
}
