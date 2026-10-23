/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import {
  clearElement,
  createTextElement,
  queryElement,
  requireElement,
  setHidden,
  valueOrPlaceholder,
} from "@/presentation/runtime/dom";

function buildDocument(markup: string): Document {
  const document = window.document;
  document.body.innerHTML = markup;

  return document;
}

describe("requireElement", () => {
  it("devuelve el elemento encontrado", () => {
    const document = buildDocument('<p class="lead">Hola</p>');

    expect(requireElement(document, ".lead").textContent).toBe("Hola");
  });

  it("falla con un mensaje util cuando el elemento no existe", () => {
    const document = buildDocument("");

    expect(() => requireElement(document, ".ausente")).toThrow(
      "Falta el elemento requerido: .ausente",
    );
  });
});

describe("queryElement", () => {
  it("devuelve null cuando no encuentra el selector", () => {
    const document = buildDocument("");

    expect(queryElement(document, ".ausente")).toBeNull();
  });
});

describe("createTextElement", () => {
  it("crea un nodo con clase y texto", () => {
    const element = createTextElement(window.document, "span", "badge", "Alerta");

    expect(element.tagName).toBe("SPAN");
    expect(element.className).toBe("badge");
    expect(element.textContent).toBe("Alerta");
  });
});

describe("clearElement", () => {
  it("elimina todos los hijos", () => {
    const document = buildDocument("<div><span>a</span><span>b</span></div>");
    const container = requireElement(document, "div");

    clearElement(container);

    expect(container.childElementCount).toBe(0);
  });
});

describe("setHidden", () => {
  it("alterna el atributo hidden", () => {
    const document = buildDocument("<p>texto</p>");
    const paragraph = requireElement<HTMLParagraphElement>(document, "p");

    setHidden(paragraph, true);
    expect(paragraph.hidden).toBe(true);

    setHidden(paragraph, false);
    expect(paragraph.hidden).toBe(false);
  });
});

describe("valueOrPlaceholder", () => {
  it("conserva un texto con contenido", () => {
    expect(valueOrPlaceholder("Rosario")).toBe("Rosario");
  });

  it("reemplaza ausentes y vacios", () => {
    expect(valueOrPlaceholder(null)).toBe("\u2014");
    expect(valueOrPlaceholder("   ")).toBe("\u2014");
    expect(valueOrPlaceholder("")).toBe("\u2014");
  });
});
