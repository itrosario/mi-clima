/** @vitest-environment happy-dom */

import { afterEach, describe, expect, it, vi } from "vitest";
import { getTranslations } from "@/presentation/i18n";
import {
  distanceKilometres,
  initAlertSubscription,
  nearestStation,
  urlBase64ToUint8Array,
} from "@/presentation/runtime/alertSubscription";

function createDocument() {
  document.documentElement.lang = "es";
  document.body.innerHTML = `
    <div data-alert-subscription>
      <select data-alert-zone><option value="">Seleccionar</option></select>
      <button data-alert-locate disabled>Ubicar</button>
      <button data-alert-enable disabled>Activar</button>
      <button data-alert-disable hidden>Desactivar</button>
      <p data-alert-subscription-status role="status"></p>
    </div>
  `;
  return document;
}

const stations = [
  { id: "34", name: "Rosario", location: { latitude: -32.95, longitude: -60.63 } },
  { id: "19", name: "Corrientes", location: { latitude: -27.47, longitude: -58.83 } },
];

const translations = getTranslations("es").alerts.push;

describe("alert subscription helpers", () => {
  it("calcula distancias", () => {
    const d = distanceKilometres({ latitude: 0, longitude: 0 }, { latitude: 1, longitude: 0 });
    expect(d).toBeGreaterThan(100);
  });

  it("encuentra la estación más cercana", () => {
    const result = nearestStation(stations, { latitude: -32.9, longitude: -60.6 });
    expect(result?.station.id).toBe("34");
    expect(
      nearestStation([{ id: "1", name: "x", location: null }], { latitude: 0, longitude: 0 }),
    ).toBeNull();
  });

  it("convierte base64url", () => {
    const bytes = urlBase64ToUint8Array("AQID");
    expect(Array.from(bytes)).toEqual([1, 2, 3]);
  });
});

describe("initAlertSubscription", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    document.body.innerHTML = "";
  });

  it("retorna false si no hay contenedor", () => {
    const doc = document.implementation.createHTMLDocument();
    expect(initAlertSubscription(doc, stations, "es", translations)).toBe(false);
  });

  it("retorna false si faltan elementos", () => {
    document.body.innerHTML = `<div data-alert-subscription></div>`;
    expect(initAlertSubscription(document, stations, "es", translations)).toBe(false);
  });

  it("inicializa y marca como inicializado", () => {
    const doc = createDocument();
    expect(initAlertSubscription(doc, stations, "es", translations)).toBe(true);
    expect(initAlertSubscription(doc, stations, "es", translations)).toBe(true);
  });

  it("muestra no compatible si no hay service worker", () => {
    const doc = createDocument();
    initAlertSubscription(doc, stations, "es", translations, {
      serviceWorker: null,
      notifications: null,
      geolocation: null,
      storage: { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() },
      fetchImplementation: vi.fn(),
    });
    const status = doc.querySelector("[data-alert-subscription-status]")?.textContent;
    expect(status).toBe(translations.unsupported);
  });

  it("usa zona almacenada", () => {
    const doc = createDocument();
    const storage = {
      getItem: (k: string) => (k === "mi-clima:alerta-zona" ? "19" : null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    initAlertSubscription(doc, stations, "es", translations, {
      serviceWorker: null,
      notifications: null,
      geolocation: null,
      storage,
    });
    const select = doc.querySelector("[data-alert-zone]") as HTMLSelectElement;
    expect(select.value).toBe("19");
  });

  it("maneja geolocalización exitosa y fuera de cobertura", async () => {
    const doc = createDocument();
    const storage = { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() };
    const geolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({ coords: { latitude: -32.9, longitude: -60.6 } } as GeolocationPosition),
      ),
    };
    initAlertSubscription(doc, stations, "es", translations, {
      serviceWorker: {
        getRegistration: vi.fn(async () => undefined),
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn() },
        }),
      },
      notifications: { permission: "granted", requestPermission: vi.fn() },
      geolocation,
      storage,
      fetchImplementation: vi.fn(),
    });
    const locate = doc.querySelector("[data-alert-locate]") as HTMLButtonElement;
    locate.disabled = false;
    locate.dispatchEvent(new Event("click"));
    await vi.waitFor(() => expect(storage.setItem).toHaveBeenCalled());
  });

  it("maneja error de geolocalización y sin geolocation", async () => {
    const doc = createDocument();
    const storage = { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() };
    const geolocation = {
      getCurrentPosition: vi.fn((_s, err) =>
        err?.(new Error("denied") as GeolocationPositionError),
      ),
    };
    initAlertSubscription(doc, stations, "es", translations, {
      serviceWorker: {
        getRegistration: vi.fn(async () => undefined),
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn() },
        }),
      },
      notifications: { permission: "granted", requestPermission: vi.fn() },
      geolocation,
      storage,
      fetchImplementation: vi.fn(),
    });
    const locate = doc.querySelector("[data-alert-locate]") as HTMLButtonElement;
    locate.disabled = false;
    locate.dispatchEvent(new Event("click"));
    await vi.waitFor(() =>
      expect(doc.querySelector("[data-alert-subscription-status]")?.textContent).toBe(
        translations.geolocationError,
      ),
    );

    const doc2 = createDocument();
    initAlertSubscription(doc2, stations, "es", translations, {
      serviceWorker: {
        getRegistration: vi.fn(async () => undefined),
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn() },
        }),
      },
      notifications: { permission: "granted", requestPermission: vi.fn() },
      geolocation: null,
      storage,
      fetchImplementation: vi.fn(),
    });
    const locate2 = doc2.querySelector("[data-alert-locate]") as HTMLButtonElement;
    locate2.disabled = false;
    locate2.dispatchEvent(new Event("click"));
    expect(doc2.querySelector("[data-alert-subscription-status]")?.textContent).toBe(
      translations.geolocationError,
    );
  });

  it("fuera de cobertura", async () => {
    const doc = createDocument();
    const storage = { getItem: () => null, setItem: vi.fn(), removeItem: vi.fn() };
    const geolocation = {
      getCurrentPosition: vi.fn((success) =>
        success({ coords: { latitude: -34, longitude: -58 } } as GeolocationPosition),
      ),
    };
    initAlertSubscription(doc, stations, "es", translations, {
      serviceWorker: {
        getRegistration: vi.fn(async () => undefined),
        ready: Promise.resolve({
          pushManager: { getSubscription: vi.fn(async () => null), subscribe: vi.fn() },
        }),
      },
      notifications: { permission: "granted", requestPermission: vi.fn() },
      geolocation,
      storage,
      fetchImplementation: vi.fn(),
    });
    const locate = doc.querySelector("[data-alert-locate]") as HTMLButtonElement;
    locate.disabled = false;
    locate.dispatchEvent(new Event("click"));
    await vi.waitFor(() =>
      expect(doc.querySelector("[data-alert-subscription-status]")?.textContent).toBe(
        translations.outside,
      ),
    );
  });
});
