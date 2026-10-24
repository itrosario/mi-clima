import { describe, expect, it } from "vitest";
import { paranaCorridorStationIds } from "@/domain/catalog/corridor";
import {
  deleteSubscription,
  isAllowedPushEndpoint,
  listSubscriptions,
  parseSubscriptionPayload,
  readMonitorState,
  readSubscription,
  readVapidKeys,
  saveSubscription,
  subscriptionStorageId,
  subscriptionStorageKey,
  writeMonitorState,
  writeVapidKeys,
} from "@/worker/alertStore";
import {
  createMonitorState,
  createStationState,
  createSubscription,
  FakeAlertKv,
  validSubscriptionPayload,
} from "../support/alertFakes";

describe("isAllowedPushEndpoint", () => {
  it("acepta hosts conocidos", () => {
    expect(isAllowedPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/abc")).toBe(
      true,
    );
    expect(isAllowedPushEndpoint("https://push.apple.com/3/abc")).toBe(true);
    expect(isAllowedPushEndpoint("https://notify.windows.com/abc")).toBe(true);
  });

  it("rechaza protocolos, hosts ajenos y longitudes excesivas", () => {
    expect(isAllowedPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isAllowedPushEndpoint("https://example.com/push")).toBe(false);
    expect(isAllowedPushEndpoint(`https://fcm.googleapis.com/${"a".repeat(2048)}`)).toBe(false);
  });

  it("rechaza URLs inválidas", () => {
    expect(isAllowedPushEndpoint("not-a-url")).toBe(false);
  });
});

describe("subscription storage helpers", () => {
  it("calcula claves de almacenamiento estables", async () => {
    const id = await subscriptionStorageId("https://fcm.googleapis.com/fcm/send/test");
    expect(id.length).toBeGreaterThan(0);
    expect(subscriptionStorageKey(id)).toContain("alertas:sub:");
  });

  it("guarda, lee y borra suscripciones", async () => {
    const kv = new FakeAlertKv();
    const subscription = createSubscription();
    await saveSubscription(kv, subscription);
    expect((await readSubscription(kv, subscription.endpoint))?.endpoint).toBe(
      subscription.endpoint,
    );
    await deleteSubscription(kv, subscription.endpoint);
    expect(await readSubscription(kv, subscription.endpoint)).toBeNull();
  });

  it("lista todas las suscripciones paginando", async () => {
    const kv = new FakeAlertKv();
    kv.pageSize = 1;
    await saveSubscription(
      kv,
      createSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/1" }),
    );
    await saveSubscription(
      kv,
      createSubscription({ endpoint: "https://fcm.googleapis.com/fcm/send/2" }),
    );
    await saveSubscription(
      kv,
      createSubscription({ endpoint: "https://updates.push.services.mozilla.com/3" }),
    );
    const list = await listSubscriptions(kv);
    expect(list).toHaveLength(3);
  });

  it("omite entradas inválidas al listar", async () => {
    const kv = new FakeAlertKv();
    const id = await subscriptionStorageId("https://fcm.googleapis.com/fcm/send/bad");
    await kv.put(subscriptionStorageKey(id), "no-json");
    expect(await listSubscriptions(kv)).toEqual([]);
  });
});

describe("parseSubscriptionPayload", () => {
  const now = new Date("2026-10-23T09:00:00.000Z");

  it("parsea una suscripción válida", () => {
    const parsed = parseSubscriptionPayload(validSubscriptionPayload(), now);
    expect(parsed?.stationIds).toEqual(["34"]);
    expect(parsed?.locale).toBe("es");
    expect(parsed?.createdAt).toBe("2026-10-23T09:00:00.000Z");
  });

  it("rechaza cuerpos inválidos", () => {
    expect(parseSubscriptionPayload(null, now)).toBeNull();
    expect(parseSubscriptionPayload({}, now)).toBeNull();
  });

  it("rechaza claves, estaciones o endpoints inválidos", () => {
    expect(
      parseSubscriptionPayload(validSubscriptionPayload({ endpoint: "http://bad" }), now),
    ).toBeNull();
    expect(parseSubscriptionPayload(validSubscriptionPayload({ keys: {} }), now)).toBeNull();
    expect(
      parseSubscriptionPayload(validSubscriptionPayload({ keys: { p256dh: "x", auth: "y" } }), now),
    ).toBeNull();
    expect(
      parseSubscriptionPayload(validSubscriptionPayload({ stationIds: ["9999"] }), now),
    ).toBeNull();
    expect(parseSubscriptionPayload(validSubscriptionPayload({ stationIds: [] }), now)).toBeNull();
    expect(
      parseSubscriptionPayload(validSubscriptionPayload({ stationIds: ["34", "34", "bad"] }), now),
    ).toEqual(expect.objectContaining({ stationIds: ["34"] }));
  });

  it("parsea idiomas, expirationTime y mantiene createdAt al reusar", () => {
    expect(parseSubscriptionPayload(validSubscriptionPayload({ locale: "en" }), now)?.locale).toBe(
      "en",
    );
    expect(parseSubscriptionPayload(validSubscriptionPayload({ locale: "fr" }), now)?.locale).toBe(
      "es",
    );
    expect(
      parseSubscriptionPayload(validSubscriptionPayload({ expirationTime: 12345 }), now)
        ?.expirationTime,
    ).toBe(12345);
    expect(
      parseSubscriptionPayload(validSubscriptionPayload({ expirationTime: NaN }), now)
        ?.expirationTime,
    ).toBeNull();
    expect(
      parseSubscriptionPayload(
        validSubscriptionPayload({ keys: { p256dh: "short", auth: "bad" } }),
        now,
      ),
    ).toBeNull();
    expect(
      parseSubscriptionPayload(
        validSubscriptionPayload({ keys: { p256dh: null, auth: "bad" } }),
        now,
      ),
    ).toBeNull();
  });

  it("lee suscripciones guardadas con createdAt/updatedAt", async () => {
    const kv = new FakeAlertKv();
    const endpoint = "https://fcm.googleapis.com/fcm/send/test-endpoint";
    const payload = validSubscriptionPayload({ endpoint });
    const stored = {
      ...payload,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-02T00:00:00.000Z",
    };
    const id = await subscriptionStorageId(endpoint);
    await kv.put(subscriptionStorageKey(id), JSON.stringify(stored));
    const read = await readSubscription(kv, endpoint);
    expect(read?.createdAt).toBe("2026-01-01T00:00:00.000Z");
  });

  it("rechaza suscripciones guardadas inválidas", async () => {
    const kv = new FakeAlertKv();
    const id = await subscriptionStorageId("https://fcm.googleapis.com/fcm/send/x");
    await kv.put(subscriptionStorageKey(id), JSON.stringify({ endpoint: "x" }));
    expect(await readSubscription(kv, "https://fcm.googleapis.com/fcm/send/x")).toBeNull();
    await kv.put(
      subscriptionStorageKey(id),
      JSON.stringify({ ...validSubscriptionPayload(), createdAt: 1 }),
    );
    expect(await readSubscription(kv, "https://fcm.googleapis.com/fcm/send/x")).toBeNull();
    await kv.put(
      subscriptionStorageKey(id),
      JSON.stringify({ ...validSubscriptionPayload(), updatedAt: null }),
    );
    expect(await readSubscription(kv, "https://fcm.googleapis.com/fcm/send/x")).toBeNull();
  });

  it("usa el catálogo de estaciones permitido", () => {
    expect(paranaCorridorStationIds.length).toBe(6);
  });
});

describe("monitor state", () => {
  it("guarda y lee el estado", async () => {
    const kv = new FakeAlertKv();
    const state = createMonitorState({ "34": createStationState() });
    await writeMonitorState(kv, state);
    const read = await readMonitorState(kv);
    expect(read?.version).toBe(1);
    expect(read?.stations["34"]?.status).toBe("normal");
  });

  it("rechaza estado inválido", async () => {
    const kv = new FakeAlertKv();
    await kv.put("alertas:monitor", "no-json");
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put("alertas:monitor", JSON.stringify({ version: 2 }));
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put(
      "alertas:monitor",
      JSON.stringify({ version: 1, initializedAt: "x", updatedAt: "y", stations: [] }),
    );
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put(
      "alertas:monitor",
      JSON.stringify({
        version: 1,
        initializedAt: "x",
        updatedAt: "y",
        stations: { "34": { status: "bad" } },
      }),
    );
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put(
      "alertas:monitor",
      JSON.stringify({
        version: 1,
        initializedAt: "x",
        updatedAt: "y",
        stations: { "34": { status: "normal", level: "bad" } },
      }),
    );
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put(
      "alertas:monitor",
      JSON.stringify({
        version: 1,
        initializedAt: "x",
        updatedAt: "y",
        stations: { "34": { status: "normal", level: 1, observedAt: 1 } },
      }),
    );
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put(
      "alertas:monitor",
      JSON.stringify({
        version: 1,
        initializedAt: "x",
        updatedAt: "y",
        stations: {
          "34": { status: "normal", level: 1, observedAt: null, lastRapidRiseNotifiedAt: 5 },
        },
      }),
    );
    expect(await readMonitorState(kv)).toBeNull();
    await kv.put(
      "alertas:monitor",
      JSON.stringify({
        version: 1,
        initializedAt: "x",
        updatedAt: "y",
        stations: {
          "34": { status: "normal", level: 1, observedAt: null, lastRapidRiseNotifiedAt: null },
        },
      }),
    );
    expect((await readMonitorState(kv))?.stations["34"]?.level).toBe(1);
    await kv.put("alertas:monitor", JSON.stringify(null));
    expect(await readMonitorState(kv)).toBeNull();
  });
});

describe("vapid keys storage", () => {
  it("lee y escribe claves vapid", async () => {
    const kv = new FakeAlertKv();
    await writeVapidKeys(kv, '{"publicKey":"x","privateKey":"y"}');
    expect(await readVapidKeys(kv)).toContain("publicKey");
  });
});
