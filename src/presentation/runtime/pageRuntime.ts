/**
 * Ciclo comun de una pagina de datos.
 *
 * Todas las vistas hacen lo mismo: mostrar un indicador de carga, consultar
 * los puertos, dibujar el resultado y, si algo falla, explicarlo y ofrecer un
 * reintento. Este modulo concentra ese ciclo y la lectura de parametros
 * comunes (idioma y rango de fechas).
 */

import type { DateRange } from "@/domain/telemetry/types";
import { type Locale, resolveLocale } from "../i18n/locales";
import type { PageOptions } from "../pages/pageOptions";
import { type AppServices, createAppServices } from "./appServices";
import { queryElement } from "./dom";

export interface PageContext {
  readonly document: Document;
  readonly services: AppServices;
}

/** Resuelve el documento y los servicios que usa una pagina. */
export function resolvePageContext(options: PageOptions): PageContext {
  const document = options.document ?? globalThis.document;
  const services = options.services ?? createAppServices({ document });

  return { document, services };
}

export interface RunPageOptions<TData> {
  readonly document: Document;
  readonly load: (signal: AbortSignal) => Promise<TData>;
  readonly render: (data: TData) => void | Promise<void>;
  readonly fallbackErrorMessage: string;
}

function describeFailure(cause: unknown, fallbackMessage: string): string {
  if (cause instanceof Error && cause.message.length > 0) {
    return `${fallbackMessage}: ${cause.message}`;
  }

  return fallbackMessage;
}

function setLoadingIndicators(document: Document, hidden: boolean): void {
  for (const indicator of document.querySelectorAll<HTMLElement>("[data-loading]")) {
    indicator.hidden = hidden;
  }
}

/**
 * Ejecuta la carga y el dibujo de una pagina.
 *
 * El reintento vuelve a ejecutar el mismo ciclo: no deja la interfaz a medio
 * actualizar ni acumula manejadores sobre el boton.
 */
export async function runPage<TData>(options: RunPageOptions<TData>): Promise<void> {
  const { document } = options;
  const errorBox = queryElement<HTMLElement>(document, "[data-page-error]");
  const errorMessage = queryElement<HTMLElement>(document, "[data-error-message]");
  const retryButton = queryElement<HTMLButtonElement>(document, "[data-retry]");

  if (errorBox !== null) {
    errorBox.hidden = true;
  }

  setLoadingIndicators(document, false);

  try {
    const data = await options.load(new AbortController().signal);
    await options.render(data);
  } catch (cause) {
    if (errorMessage !== null) {
      errorMessage.textContent = describeFailure(cause, options.fallbackErrorMessage);
    }

    if (errorBox !== null) {
      errorBox.hidden = false;
    }

    if (retryButton !== null) {
      retryButton.onclick = () => {
        void runPage(options);
      };
    }
  } finally {
    setLoadingIndicators(document, true);
  }
}

export function readPageLocale(document: Document): Locale {
  return resolveLocale(document.documentElement.lang);
}

/** Lee un parametro de la direccion; `null` si falta o viene vacio. */
export function readQueryParameter(document: Document, name: string): string | null {
  const value = new URL(document.URL).searchParams.get(name);

  return value === null || value.trim().length === 0 ? null : value;
}

const inputDatePattern = /^\d{4}-\d{2}-\d{2}$/;

/** Fecha `YYYY-MM-DD` en hora oficial argentina, como la espera un input date. */
export function formatInputDate(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "America/Argentina/Cordoba",
  }).format(date);
}

function readInputDate(input: HTMLInputElement, boundary: "start" | "end"): Date | null {
  if (!inputDatePattern.test(input.value)) {
    return null;
  }

  const time = boundary === "start" ? "00:00:00" : "23:59:59";
  const parsed = new Date(`${input.value}T${time}-03:00`);

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Lee los campos `from` y `to` de un formulario; `null` si no son validos. */
export function readFormRange(form: HTMLFormElement): DateRange | null {
  const fromInput = form.querySelector<HTMLInputElement>('input[name="from"]');
  const toInput = form.querySelector<HTMLInputElement>('input[name="to"]');

  if (fromInput === null || toInput === null) {
    return null;
  }

  const from = readInputDate(fromInput, "start");
  const to = readInputDate(toInput, "end");

  if (from === null || to === null || from.getTime() > to.getTime()) {
    return null;
  }

  return { from, to };
}

/** Precarga los campos `from` y `to` con el rango vigente. */
export function writeFormRange(form: HTMLFormElement, range: DateRange): void {
  const fromInput = form.querySelector<HTMLInputElement>('input[name="from"]');
  const toInput = form.querySelector<HTMLInputElement>('input[name="to"]');

  if (fromInput !== null) {
    fromInput.value = formatInputDate(range.from);
  }

  if (toInput !== null) {
    toInput.value = formatInputDate(range.to);
  }
}
