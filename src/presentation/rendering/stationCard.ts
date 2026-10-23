/**
 * Tarjeta de estacion.
 *
 * Resumen que se repite en el panel, las alertas y las descargas: nombre,
 * estado del semaforo, nivel, umbral de alerta, tendencia y acceso al detalle.
 */

import type { StationReading } from "@/application/station/loadStationReadings";
import type { TrendDirection } from "@/domain/analytics/trend";
import type { FloodStatus } from "@/domain/flood/types";
import { formatDateTime, formatMeasurement, formatSignedNumber } from "../format/formatters";
import type { Locale } from "../i18n/locales";
import { createTextElement } from "../runtime/dom";
import { createStatusBadge } from "./kit";

export interface StationCardLabels {
  readonly level: string;
  readonly alertThreshold: string;
  readonly trend: string;
  readonly updatedAt: string;
  readonly detail: string;
  readonly status: Record<FloodStatus, string>;
  readonly trendDirection: Record<TrendDirection, string>;
}

export interface StationCardInput {
  readonly reading: StationReading;
  readonly locale: Locale;
  readonly labels: StationCardLabels;
  /** Unidad de la variable, por ejemplo `m`. */
  readonly unit: string;
  readonly detailHref: string;
}

function createMetric(document: Document, label: string, value: string): HTMLElement {
  const metric = document.createElement("div");
  metric.className = "station-card__metric";
  metric.append(
    createTextElement(document, "dt", "station-card__metric-label", label),
    createTextElement(document, "dd", "station-card__metric-value", value),
  );

  return metric;
}

function trendText(
  reading: StationReading,
  labels: StationCardLabels,
  locale: Locale,
  unit: string,
): string {
  const direction = labels.trendDirection[reading.trend.direction];

  if (reading.trend.rateOfChangePerDay === null) {
    return direction;
  }

  return `${direction} (${formatSignedNumber(reading.trend.rateOfChangePerDay, locale)} ${unit}/d)`;
}

export function createStationCard(document: Document, input: StationCardInput): HTMLElement {
  const { reading } = input;
  const article = document.createElement("article");
  article.className = "station-card";
  article.dataset.stationId = reading.station.id;

  const header = document.createElement("div");
  header.className = "station-card__header";
  header.append(
    createTextElement(document, "h3", "station-card__name", reading.station.name),
    createStatusBadge(
      document,
      reading.assessment.status,
      input.labels.status[reading.assessment.status],
    ),
  );

  const meta = createTextElement(
    document,
    "p",
    "station-card__meta",
    `${reading.station.river.name} \u00b7 ${reading.station.reach.name}`,
  );

  const metrics = document.createElement("dl");
  metrics.className = "station-card__metrics";
  metrics.append(
    createMetric(
      document,
      input.labels.level,
      formatMeasurement(reading.assessment.level, input.unit, input.locale),
    ),
    createMetric(
      document,
      input.labels.alertThreshold,
      formatMeasurement(reading.station.thresholds.alert, input.unit, input.locale),
    ),
    createMetric(
      document,
      input.labels.trend,
      trendText(reading, input.labels, input.locale, input.unit),
    ),
  );

  const footer = document.createElement("div");
  footer.className = "station-card__footer";

  const updated = createTextElement(
    document,
    "span",
    "station-card__updated",
    `${input.labels.updatedAt}: ${formatDateTime(reading.latestPoint?.timestamp ?? null, input.locale)}`,
  );

  const link = document.createElement("a");
  link.className = "station-card__link";
  link.href = input.detailHref;
  link.textContent = input.labels.detail;

  footer.append(updated, link);
  article.append(header, meta, metrics, footer);

  return article;
}
