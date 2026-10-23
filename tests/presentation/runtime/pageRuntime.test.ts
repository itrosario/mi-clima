/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest";
import { requireElement } from "@/presentation/runtime/dom";
import {
  formatInputDate,
  readFormRange,
  readPageLocale,
  resolvePageContext,
  runPage,
  writeFormRange,
} from "@/presentation/runtime/pageRuntime";
import { createPageServices } from "../../support/pageServices";

const markup = `
  <p data-loading>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(): Document {
  window.document.body.innerHTML = markup;

  return window.document;
}

describe("runPage", () => {
  it("dibuja los datos y oculta la carga", async () => {
    const document = prepareDocument();
    const render = vi.fn();
    const load = vi.fn(async () => ({ value: 1 }));

    await runPage({ document, load, render, fallbackErrorMessage: "No se pudo" });

    expect(load).toHaveBeenCalledTimes(1);
    expect(render).toHaveBeenCalledWith({ value: 1 });
    expect(requireElement<HTMLElement>(document, "[data-loading]").hidden).toBe(true);
    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(true);
  });

  it("explica el error y permite reintentar", async () => {
    const document = prepareDocument();
    const load = vi.fn(async () => {
      throw new Error("fallo de red");
    });

    await runPage({ document, load, render: vi.fn(), fallbackErrorMessage: "No se pudo" });

    const errorBox = requireElement<HTMLElement>(document, "[data-page-error]");
    expect(errorBox.hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toBe(
      "No se pudo: fallo de red",
    );
    expect(requireElement<HTMLElement>(document, "[data-loading]").hidden).toBe(true);

    requireElement<HTMLButtonElement>(document, "[data-retry]").click();
    await vi.waitFor(() => expect(load).toHaveBeenCalledTimes(2));
  });

  it("usa el mensaje generico cuando la causa no es un error", async () => {
    const document = prepareDocument();

    await runPage({
      document,
      load: () => Promise.reject(undefined),
      render: vi.fn(),
      fallbackErrorMessage: "No se pudo",
    });

    expect(requireElement(document, "[data-error-message]").textContent).toBe("No se pudo");
  });

  it("tolera una pagina sin indicadores ni boton de reintento", async () => {
    window.document.body.innerHTML = "";

    await runPage({
      document: window.document,
      load: () => Promise.reject(new Error("sin datos")),
      render: vi.fn(),
      fallbackErrorMessage: "No se pudo",
    });

    expect(window.document.body.childElementCount).toBe(0);
  });
});

describe("readPageLocale", () => {
  it("lee el idioma declarado en el documento", () => {
    window.document.documentElement.lang = "en";
    expect(readPageLocale(window.document)).toBe("en");

    window.document.documentElement.lang = "";
    expect(readPageLocale(window.document)).toBe("es");
  });
});

describe("resolvePageContext", () => {
  it("usa el documento y los servicios inyectados", () => {
    const services = createPageServices();

    const context = resolvePageContext({ document: window.document, services });

    expect(context.document).toBe(window.document);
    expect(context.services).toBe(services);
  });

  it("toma el documento global y compone los servicios por defecto", () => {
    const context = resolvePageContext({});

    expect(context.document).toBe(window.document);
    expect(context.services.catalogSource).toBeDefined();
    expect(context.services.hydrologySource).toBeDefined();
  });
});

describe("formatInputDate", () => {
  it("expresa la fecha en hora argentina", () => {
    expect(formatInputDate(new Date("2026-10-23T01:00:00.000Z"))).toBe("2026-10-22");
  });
});

describe("readFormRange", () => {
  function createForm(from: string, to: string): HTMLFormElement {
    window.document.body.innerHTML = `
      <form>
        <input name="from" value="${from}" />
        <input name="to" value="${to}" />
      </form>
    `;

    return requireElement<HTMLFormElement>(window.document, "form");
  }

  it("interpreta el dia completo en hora argentina", () => {
    const range = readFormRange(createForm("2026-10-01", "2026-10-22"));

    expect(range?.from.toISOString()).toBe("2026-10-01T03:00:00.000Z");
    expect(range?.to.toISOString()).toBe("2026-10-23T02:59:59.000Z");
  });

  it("rechaza campos vacios, invertidos o con formato invalido", () => {
    expect(readFormRange(createForm("", ""))).toBeNull();
    expect(readFormRange(createForm("2026-10-22", "2026-10-01"))).toBeNull();
    expect(readFormRange(createForm("22/10/2026", "2026-10-22"))).toBeNull();
    expect(readFormRange(createForm("2026-13-01", "2026-10-22"))).toBeNull();
    expect(readFormRange(createForm("2026-10-01", "2026-13-01"))).toBeNull();
  });

  it("devuelve null si el formulario no tiene los campos", () => {
    window.document.body.innerHTML = "<form></form>";
    const form = requireElement<HTMLFormElement>(window.document, "form");

    expect(readFormRange(form)).toBeNull();
  });
});

describe("writeFormRange", () => {
  it("precarga los campos con el rango vigente", () => {
    window.document.body.innerHTML = `
      <form>
        <input name="from" />
        <input name="to" />
      </form>
    `;
    const form = requireElement<HTMLFormElement>(window.document, "form");

    writeFormRange(form, {
      from: new Date("2026-10-01T03:00:00.000Z"),
      to: new Date("2026-10-22T03:00:00.000Z"),
    });

    expect(form.querySelector<HTMLInputElement>('[name="from"]')?.value).toBe("2026-10-01");
    expect(form.querySelector<HTMLInputElement>('[name="to"]')?.value).toBe("2026-10-22");
  });

  it("tolera un formulario sin campos", () => {
    window.document.body.innerHTML = "<form></form>";
    const form = requireElement<HTMLFormElement>(window.document, "form");

    expect(() =>
      writeFormRange(form, {
        from: new Date("2026-10-01T03:00:00.000Z"),
        to: new Date("2026-10-22T03:00:00.000Z"),
      }),
    ).not.toThrow();
  });
});
