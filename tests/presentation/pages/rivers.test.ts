/** @vitest-environment happy-dom */

import { describe, expect, it } from "vitest";
import { startRiversPage } from "@/presentation/pages/rivers";
import { requireElement } from "@/presentation/runtime/dom";
import { createPageServices } from "../../support/pageServices";

const riversMarkup = `
  <label for="search">Buscar</label>
  <input id="search" data-river-search />
  <p data-river-count></p>
  <div data-river-list></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(): Document {
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = riversMarkup;

  return window.document;
}

describe("startRiversPage", () => {
  it("lista rios, tramos y estaciones con su conteo", async () => {
    const document = prepareDocument();

    await startRiversPage({ document, services: createPageServices() });

    expect(document.querySelectorAll(".river-group")).toHaveLength(1);
    expect(requireElement(document, "[data-river-count]").textContent).toContain("6 estaciones");
    expect(document.querySelectorAll(".river-group__stations a")).toHaveLength(6);
    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(true);
  });

  it("filtra en memoria al escribir en el buscador", async () => {
    const document = prepareDocument();

    await startRiversPage({ document, services: createPageServices() });
    const search = requireElement<HTMLInputElement>(document, "[data-river-search]");
    search.value = "rosario";
    search.dispatchEvent(new Event("input"));

    expect(document.querySelectorAll(".river-group__stations a")).toHaveLength(1);
    expect(requireElement(document, "[data-river-count]").textContent).toContain("1 estacion");
  });

  it("explica cuando la busqueda no encuentra rios", async () => {
    const document = prepareDocument();

    await startRiversPage({ document, services: createPageServices() });
    const search = requireElement<HTMLInputElement>(document, "[data-river-search]");
    search.value = "inexistente";
    search.dispatchEvent(new Event("input"));

    expect(requireElement(document, "[data-river-list]").textContent).toBe(
      "Ningun rio coincide con la busqueda.",
    );
  });

  it("muestra el error cuando el catalogo no se puede consultar", async () => {
    const document = prepareDocument();

    await startRiversPage({
      document,
      services: createPageServices({
        catalog: {
          async fetchStations() {
            throw new Error("catalogo caido");
          },
        },
      }),
    });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
    expect(requireElement(document, "[data-error-message]").textContent).toContain(
      "catalogo caido",
    );
  });

  it("funciona sin buscador en el documento", async () => {
    const document = prepareDocument();
    document.querySelector("[data-river-search]")?.remove();

    await startRiversPage({ document, services: createPageServices() });

    expect(document.querySelectorAll(".river-group__stations a")).toHaveLength(6);
  });
});
