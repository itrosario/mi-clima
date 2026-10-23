/**
 * Pagina de descargas.
 *
 * Reutiliza las lecturas del corredor y arma los archivos en el navegador. La
 * exportacion por estacion y el dataset maestro comparten el mismo constructor
 * de datasets, de modo que CSV, JSON y texto tienen identica informacion.
 */

import { loadStationCatalog } from "@/application/catalog/loadStationCatalog";
import {
  type CorridorDashboard,
  defaultDashboardWindowDays,
  loadCorridorDashboard,
} from "@/application/dashboard/loadCorridorDashboard";
import { buildExport, toSeriesExportInput } from "@/application/export/buildExport";
import { hydrologyAttributions } from "@/application/shared/attributions";
import { rangeEndingAt } from "@/application/shared/time";
import type { StationReading } from "@/application/station/loadStationReadings";
import type { ExportFormat } from "@/domain/export/types";
import { exportFormats } from "@/domain/export/types";
import type { DateRange } from "@/domain/telemetry/types";
import { formatDate } from "../format/formatters";
import { getTranslations, interpolate } from "../i18n";
import { createTextElement, queryElement, renderInto } from "../runtime/dom";
import {
  readFormRange,
  readPageLocale,
  resolvePageContext,
  runPage,
  writeFormRange,
} from "../runtime/pageRuntime";
import { corridorStations } from "./pageHelpers";
import type { PageOptions } from "./pageOptions";

export const masterDatasetSlug = "corredor-parana";

interface DownloadsData {
  readonly dashboard: CorridorDashboard;
  readonly range: DateRange;
}

function readFormat(select: HTMLSelectElement | null): ExportFormat {
  const value = select?.value ?? "";

  return exportFormats.includes(value as ExportFormat) ? (value as ExportFormat) : "csv";
}

function renderStationOptions(
  document: Document,
  select: HTMLSelectElement | null,
  readings: readonly StationReading[],
): void {
  if (select === null) {
    return;
  }

  const previous = select.value;
  select.replaceChildren();

  for (const reading of readings) {
    const option = document.createElement("option");
    option.value = reading.station.id;
    option.textContent = reading.station.name;
    select.append(option);
  }

  if (readings.some((reading) => reading.station.id === previous)) {
    select.value = previous;
  }
}

export async function startDownloadsPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);
  const form = queryElement<HTMLFormElement>(document, "[data-range-form]");
  const formatSelect = queryElement<HTMLSelectElement>(document, "[data-export-format]");
  const stationSelect = queryElement<HTMLSelectElement>(document, "[data-export-station]");
  const stationButton = queryElement<HTMLButtonElement>(document, "[data-export-station-button]");
  const masterButton = queryElement<HTMLButtonElement>(document, "[data-export-master-button]");

  if (form !== null) {
    writeFormRange(form, rangeEndingAt(services.clock.now(), defaultDashboardWindowDays));
  }

  const readRange = (): DateRange =>
    (form === null ? null : readFormRange(form)) ??
    rangeEndingAt(services.clock.now(), defaultDashboardWindowDays);

  const load = async (signal: AbortSignal): Promise<DownloadsData> => {
    const range = readRange();
    const catalogSnapshot = await loadStationCatalog(
      { source: services.catalogSource, cache: services.catalogCache, clock: services.clock },
      signal,
    );
    const stations = corridorStations(catalogSnapshot.catalog);

    if (stations.length === 0) {
      throw new Error(translations.dashboard.noStations);
    }

    const dashboard = await loadCorridorDashboard(
      stations,
      { hydrologySource: services.hydrologySource, clock: services.clock, range },
      signal,
    );

    return { dashboard, range };
  };

  const exportStation = (data: DownloadsData, format: ExportFormat): void => {
    const stationId = stationSelect?.value ?? "";
    const reading = data.dashboard.readings.find((candidate) => candidate.station.id === stationId);

    if (reading === undefined) {
      renderInto(document, "[data-export-status]", [
        createTextElement(document, "p", "status-note", translations.downloads.statusEmpty),
      ]);

      return;
    }

    const file = buildExport({
      inputs: [
        toSeriesExportInput(
          reading,
          translations.downloads.waterLevel,
          reading.station.networkName,
        ),
      ],
      descriptor: {
        title: `${translations.downloads.stationTitle}: ${reading.station.name}`,
        slug: `estacion-${reading.station.id}`,
        generatedAt: data.dashboard.generatedAt,
        sources: hydrologyAttributions,
      },
      format,
    });

    services.downloadService.download(file);
    renderInto(document, "[data-export-status]", [
      createTextElement(
        document,
        "p",
        "status-note",
        interpolate(translations.downloads.statusReady, { fileName: file.fileName }),
      ),
    ]);
  };

  const exportMaster = (data: DownloadsData, format: ExportFormat): void => {
    const file = buildExport({
      inputs: data.dashboard.readings.map((reading) =>
        toSeriesExportInput(
          reading,
          translations.downloads.waterLevel,
          reading.station.networkName,
        ),
      ),
      descriptor: {
        title: translations.downloads.masterTitle,
        slug: masterDatasetSlug,
        generatedAt: data.dashboard.generatedAt,
        sources: hydrologyAttributions,
      },
      format,
    });

    services.downloadService.download(file);
    renderInto(document, "[data-export-status]", [
      createTextElement(
        document,
        "p",
        "status-note",
        interpolate(translations.downloads.statusReady, { fileName: file.fileName }),
      ),
    ]);
  };

  const render = (data: DownloadsData): void => {
    renderStationOptions(document, stationSelect, data.dashboard.readings);
    renderInto(document, "[data-export-summary]", [
      createTextElement(
        document,
        "p",
        "page-meta",
        `${translations.common.range}: ${formatDate(data.range.from, locale)} - ${formatDate(data.range.to, locale)} \u00b7 ${translations.downloads.rowsLabel}: ${data.dashboard.readings.reduce((total, reading) => total + reading.series.points.length, 0)}`,
      ),
    ]);
    renderInto(document, "[data-export-status]", [
      createTextElement(document, "p", "status-note", translations.downloads.generatedAt),
    ]);

    if (stationButton !== null) {
      stationButton.onclick = () => {
        exportStation(data, readFormat(formatSelect));
      };
    }

    if (masterButton !== null) {
      masterButton.onclick = () => {
        exportMaster(data, readFormat(formatSelect));
      };
    }
  };

  const run = (): Promise<void> =>
    runPage({ document, load, render, fallbackErrorMessage: translations.common.error });

  if (form !== null) {
    form.onsubmit = (event) => {
      event.preventDefault();
      void run();
    };
  }

  await run();
}
