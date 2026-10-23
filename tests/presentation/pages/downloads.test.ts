/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from "vitest";
import type { DownloadRequest } from "@/domain/ports/downloadService";
import { startDownloadsPage } from "@/presentation/pages/downloads";
import { requireElement } from "@/presentation/runtime/dom";
import { FakeHydrologySource } from "../../support/applicationFakes";
import { createPageServices } from "../../support/pageServices";

const downloadsMarkup = `
  <form data-range-form>
    <input name="from" />
    <input name="to" />
    <button type="submit">Aplicar</button>
  </form>
  <select data-export-format>
    <option value="csv">CSV</option>
    <option value="json">JSON</option>
    <option value="txt">Texto</option>
  </select>
  <select data-export-station></select>
  <button type="button" data-export-station-button>Estacion</button>
  <button type="button" data-export-master-button>Maestro</button>
  <div data-export-summary></div>
  <div data-export-status></div>
  <p data-loading hidden>Cargando</p>
  <div data-page-error hidden>
    <p data-error-message></p>
    <button type="button" data-retry>Reintentar</button>
  </div>
`;

function prepareDocument(markup = downloadsMarkup): Document {
  window.document.documentElement.lang = "es";
  window.document.body.innerHTML = markup;

  return window.document;
}

function createDownloadRecorder(): {
  download: (request: DownloadRequest) => void;
  calls: DownloadRequest[];
} {
  const calls: DownloadRequest[] = [];
  const download = vi.fn((request: DownloadRequest) => {
    calls.push(request);
  });

  return { download, calls };
}

describe("startDownloadsPage", () => {
  it("carga las estaciones del corredor y resume el periodo", async () => {
    const document = prepareDocument();

    await startDownloadsPage({ document, services: createPageServices() });

    const stationSelect = requireElement<HTMLSelectElement>(document, "[data-export-station]");
    expect(stationSelect.options).toHaveLength(6);
    expect(requireElement(document, "[data-export-summary]").textContent).toContain("Filas");
    expect(requireElement(document, "[data-export-status]").textContent).toBe("Generado");
  });

  it("genera el archivo CSV de la estacion elegida", async () => {
    const document = prepareDocument();
    const recorder = createDownloadRecorder();

    await startDownloadsPage({
      document,
      services: createPageServices({ downloadService: recorder }),
    });
    requireElement<HTMLSelectElement>(document, "[data-export-station]").value = "34";
    requireElement<HTMLButtonElement>(document, "[data-export-station-button]").click();

    expect(recorder.calls).toHaveLength(1);
    const file = recorder.calls[0];
    expect(file?.fileName).toMatch(/^estacion-34.*\.csv$/);
    expect(file?.content).toContain("Rosario");
    expect(requireElement(document, "[data-export-status]").textContent).toContain("Archivo listo");
  });

  it("genera el dataset maestro en JSON", async () => {
    const document = prepareDocument();
    const recorder = createDownloadRecorder();

    await startDownloadsPage({
      document,
      services: createPageServices({ downloadService: recorder }),
    });
    requireElement<HTMLSelectElement>(document, "[data-export-format]").value = "json";
    document.querySelector<HTMLButtonElement>("[data-export-master-button]")?.click();

    const file = recorder.calls[0];
    expect(file?.fileName).toMatch(/^corredor-parana.*\.json$/);
    const parsed = JSON.parse(file?.content ?? "{}") as { title?: string };
    expect(parsed.title).toBe("Dataset maestro");
  });

  it("avisa cuando la estacion elegida no tiene datos", async () => {
    const document = prepareDocument();
    const recorder = createDownloadRecorder();

    await startDownloadsPage({
      document,
      services: createPageServices({ downloadService: recorder }),
    });
    const stationSelect = requireElement<HTMLSelectElement>(document, "[data-export-station]");
    const orphan = document.createElement("option");
    orphan.value = "999";
    orphan.textContent = "Fantasma";
    stationSelect.append(orphan);
    stationSelect.value = "999";
    document.querySelector<HTMLButtonElement>("[data-export-station-button]")?.click();

    expect(recorder.calls).toHaveLength(0);
    expect(requireElement(document, "[data-export-status]").textContent).toBe(
      "No hay datos para exportar todavia.",
    );
  });

  it("recalcula al enviar el formulario y conserva la estacion elegida", async () => {
    const document = prepareDocument();
    const hydrology = new FakeHydrologySource({});

    await startDownloadsPage({
      document,
      services: createPageServices({ hydrology }),
    });
    const callsBefore = hydrology.calls.length;
    const stationSelect = requireElement<HTMLSelectElement>(document, "[data-export-station]");
    stationSelect.value = "34";
    const form = requireElement<HTMLFormElement>(document, "[data-range-form]");
    requireElement<HTMLInputElement>(form, "input[name='from']").value = "2026-10-01";
    requireElement<HTMLInputElement>(form, "input[name='to']").value = "2026-10-10";
    form.requestSubmit();

    await vi.waitFor(() => expect(hydrology.calls.length).toBeGreaterThan(callsBefore));
    expect(stationSelect.value).toBe("34");
  });

  it("funciona sin controles de exportacion en el documento", async () => {
    const document = prepareDocument(`
      <div data-export-summary></div>
      <div data-export-status></div>
    `);

    await startDownloadsPage({ document, services: createPageServices() });

    expect(requireElement(document, "[data-export-summary]").textContent).toContain("Filas");
  });

  it("usa CSV y avisa cuando faltan los selectores de exportacion", async () => {
    const document = prepareDocument(`
      <button type="button" data-export-station-button>Estacion</button>
      <button type="button" data-export-master-button>Maestro</button>
      <div data-export-summary></div>
      <div data-export-status></div>
    `);
    const recorder = createDownloadRecorder();

    await startDownloadsPage({
      document,
      services: createPageServices({ downloadService: recorder }),
    });
    document.querySelector<HTMLButtonElement>("[data-export-master-button]")?.click();

    expect(recorder.calls[0]?.fileName).toMatch(/^corredor-parana.*\.csv$/);

    document.querySelector<HTMLButtonElement>("[data-export-station-button]")?.click();
    expect(recorder.calls).toHaveLength(1);
    expect(requireElement(document, "[data-export-status]").textContent).toBe(
      "No hay datos para exportar todavia.",
    );
  });

  it("muestra el error cuando el catalogo no trae el corredor", async () => {
    const document = prepareDocument();

    await startDownloadsPage({
      document,
      services: createPageServices({ stations: [] }),
    });

    expect(requireElement<HTMLElement>(document, "[data-page-error]").hidden).toBe(false);
  });
});
