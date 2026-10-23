/** @vitest-environment happy-dom */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { initInstallPrompt } from "@/presentation/scripts/installPrompt";

function createComponent(documentRoot: Document): {
  container: HTMLElement;
  button: HTMLButtonElement;
} {
  const container = documentRoot.createElement("div");
  container.setAttribute("data-install-app", "");
  container.hidden = true;

  const button = documentRoot.createElement("button");
  button.setAttribute("data-install-button", "");
  container.append(button);
  documentRoot.body.append(container);

  return { container, button };
}

function createInstallEvent(prompt: () => Promise<void>): Event {
  const event = new Event("beforeinstallprompt", { cancelable: true });
  Object.defineProperty(event, "prompt", { value: prompt });

  return event;
}

beforeEach(() => {
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe("initInstallPrompt", () => {
  it("no hace nada cuando falta el contenedor", () => {
    expect(initInstallPrompt(document)).toBe(false);
  });

  it("no hace nada cuando falta el boton", () => {
    const container = document.createElement("div");
    container.setAttribute("data-install-app", "");
    document.body.append(container);

    expect(initInstallPrompt(document)).toBe(false);
  });

  it("no hace nada cuando el documento no tiene ventana", () => {
    const detachedDocument = document.implementation.createHTMLDocument("sin ventana");
    createComponent(detachedDocument);

    expect(initInstallPrompt(detachedDocument)).toBe(false);
  });

  it("muestra el boton cuando el navegador permite instalar", () => {
    const { container, button } = createComponent(document);
    const prompt = vi.fn(async () => undefined);

    expect(initInstallPrompt(document)).toBe(true);
    button.click();
    expect(prompt).not.toHaveBeenCalled();

    const event = createInstallEvent(prompt);
    window.dispatchEvent(event);

    expect(event.defaultPrevented).toBe(true);
    expect(container.hidden).toBe(false);
  });

  it("abre el dialogo nativo, oculta el boton y reacciona a la instalacion", async () => {
    const { container } = createComponent(document);
    const prompt = vi.fn(async () => undefined);

    initInstallPrompt(document);
    window.dispatchEvent(createInstallEvent(prompt));

    const button = container.querySelector<HTMLButtonElement>("[data-install-button]");
    button?.click();

    expect(prompt).toHaveBeenCalledTimes(1);
    expect(container.hidden).toBe(true);

    button?.click();
    expect(prompt).toHaveBeenCalledTimes(1);

    container.hidden = false;
    window.dispatchEvent(new Event("appinstalled"));
    expect(container.hidden).toBe(true);
  });

  it("tolera que el navegador rechace el dialogo de instalacion", async () => {
    const { container } = createComponent(document);
    const prompt = vi.fn(async () => {
      throw new Error("cancelado");
    });

    initInstallPrompt(document);
    window.dispatchEvent(createInstallEvent(prompt));
    container.querySelector<HTMLButtonElement>("[data-install-button]")?.click();

    await vi.waitFor(() => expect(prompt).toHaveBeenCalledTimes(1));
  });
});
