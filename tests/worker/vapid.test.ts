import { afterEach, describe, expect, it, vi } from "vitest";
import { readVapidKeys } from "@/worker/alertStore";
import { generateVapidKeys, loadVapidKeys, vapidSubject } from "@/worker/vapid";
import { FakeAlertKv } from "../support/alertFakes";

describe("vapid subject", () => {
  it("usa el entorno o el valor por defecto", () => {
    expect(vapidSubject({})).toBe("https://mi-clima.itrosario.workers.dev");
    expect(vapidSubject({ VAPID_SUBJECT: " " })).toBe("https://mi-clima.itrosario.workers.dev");
    expect(vapidSubject({ VAPID_SUBJECT: "mailto:info@example.com" })).toBe(
      "mailto:info@example.com",
    );
  });
});

describe("generateVapidKeys", () => {
  it("genera un par válido", async () => {
    const keys = await generateVapidKeys();
    expect(keys.publicKey.length).toBeGreaterThan(0);
    expect(keys.privateKey.length).toBeGreaterThan(0);
  });

  it("produce una clave pública no comprimida", async () => {
    const keys = await generateVapidKeys();
    const { decodeBase64Url } = await import("@/worker/base64");
    const pub = decodeBase64Url(keys.publicKey);
    expect(pub?.length).toBe(65);
    expect(pub?.[0]).toBe(4);
  });
});

describe("loadVapidKeys", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("usa las claves configuradas si son válidas", async () => {
    const generated = await generateVapidKeys();
    const keys = await loadVapidKeys(new FakeAlertKv(), {
      VAPID_PUBLIC_KEY: generated.publicKey,
      VAPID_PRIVATE_KEY: generated.privateKey,
    });
    expect(keys?.publicKey).toBe(generated.publicKey);
  });

  it("ignora claves configuradas inválidas", async () => {
    const kv = new FakeAlertKv();
    const keys = await loadVapidKeys(kv, {
      VAPID_PUBLIC_KEY: "bad",
      VAPID_PRIVATE_KEY: "bad",
    });
    expect(keys).not.toBeNull();
    expect(await readVapidKeys(kv)).not.toBeNull();
  });

  it("devuelve null si no hay kv ni claves válidas", async () => {
    const keys = await loadVapidKeys(null, { VAPID_PUBLIC_KEY: "bad", VAPID_PRIVATE_KEY: "bad" });
    expect(keys).toBeNull();
  });

  it("lee claves guardadas si son válidas", async () => {
    const kv = new FakeAlertKv();
    const generated = await generateVapidKeys();
    await kv.put("alertas:vapid", JSON.stringify(generated));
    const keys = await loadVapidKeys(kv, {});
    expect(keys?.publicKey).toBe(generated.publicKey);
  });

  it("genera nuevas claves si las guardadas son corruptas o inválidas", async () => {
    const kv = new FakeAlertKv();
    await kv.put("alertas:vapid", "no-json");
    expect((await loadVapidKeys(kv, {}))?.publicKey).toBeDefined();

    const kv2 = new FakeAlertKv();
    await kv2.put("alertas:vapid", JSON.stringify("hola"));
    expect((await loadVapidKeys(kv2, {}))?.publicKey).toBeDefined();

    const kv3 = new FakeAlertKv();
    await kv3.put("alertas:vapid", JSON.stringify({ publicKey: "bad", privateKey: "bad" }));
    expect((await loadVapidKeys(kv3, {}))?.publicKey).toBeDefined();

    const kv4 = new FakeAlertKv();
    await kv4.put("alertas:vapid", JSON.stringify({ publicKey: 1, privateKey: "x" }));
    expect((await loadVapidKeys(kv4, {}))?.publicKey).toBeDefined();
  });

  it("falla al generar si crypto no exporta claves", async () => {
    const originalExportKey = crypto.subtle.exportKey.bind(crypto.subtle);
    const originalGenerateKey = crypto.subtle.generateKey.bind(crypto.subtle);
    vi.stubGlobal("crypto", {
      ...crypto,
      subtle: {
        ...crypto.subtle,
        generateKey: originalGenerateKey,
        exportKey: vi.fn(async () => ({ x: undefined, y: undefined, d: undefined })),
      },
    } as unknown as Crypto);
    await expect(generateVapidKeys()).rejects.toThrow(/No se pudieron exportar/i);
    vi.stubGlobal("crypto", {
      ...crypto,
      subtle: {
        ...crypto.subtle,
        generateKey: originalGenerateKey,
        exportKey: originalExportKey,
      },
    } as unknown as Crypto);
  });

  it("falla si las claves exportadas no decodifican", async () => {
    const originalExportKey = crypto.subtle.exportKey.bind(crypto.subtle);
    const originalGenerateKey = crypto.subtle.generateKey.bind(crypto.subtle);
    vi.stubGlobal("crypto", {
      ...crypto,
      subtle: {
        ...crypto.subtle,
        generateKey: originalGenerateKey,
        exportKey: vi.fn(async (format, key) => {
          if (format === "jwk") {
            const jwk = await originalExportKey(format, key);
            if ("x" in jwk) {
              return { ...jwk, x: "!!!", y: "!!!", d: "!!!" };
            }
            return jwk;
          }
          return originalExportKey(format, key);
        }),
      },
    } as unknown as Crypto);
    await expect(generateVapidKeys()).rejects.toThrow(/no son validas/i);
    vi.stubGlobal("crypto", globalThis.crypto);
  });
});
