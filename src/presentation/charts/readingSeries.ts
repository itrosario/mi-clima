/**
 * Preparacion de las series que consumen los graficos.
 *
 * El panel dibuja el promedio diario de cada estacion del corredor; el detalle
 * dibuja la serie observada con su media movil. Ambas funciones existen para
 * que los controladores solo se ocupen del DOM.
 */

import type { StationReading } from "@/application/station/loadStationReadings";
import type { MovingAveragePoint } from "@/domain/analytics/variability";
import type { TelemetryPoint } from "@/domain/telemetry/types";
import { formatChartDate } from "../format/formatters";
import type { Locale } from "../i18n/locales";
import type { ChartSeriesInput, LineChartInput } from "./chartOptions";

function dateKeyLabel(dateKey: string, locale: Locale): string {
  return formatChartDate(new Date(`${dateKey}T12:00:00.000Z`), locale);
}

/** Serie diaria del corredor, alineada por dia entre estaciones. */
export function buildCorridorChartInput(
  readings: readonly StationReading[],
  locale: Locale,
  unit: string,
  description: string,
): LineChartInput {
  const dateKeys = [
    ...new Set(readings.flatMap((reading) => reading.dailyExtremes.map((day) => day.dateKey))),
  ].sort((left, right) => left.localeCompare(right));

  const series: ChartSeriesInput[] = readings
    .filter((reading) => reading.dailyExtremes.length > 0)
    .map((reading) => {
      const meanByDay = new Map(
        reading.dailyExtremes.map((day) => [day.dateKey, day.mean] as const),
      );

      return {
        name: reading.station.name,
        values: dateKeys.map((dateKey) => meanByDay.get(dateKey) ?? null),
      };
    });

  return {
    categories: dateKeys.map((dateKey) => dateKeyLabel(dateKey, locale)),
    series,
    unit,
    description,
  };
}

/** Serie observada de una estacion con su media movil superpuesta. */
export function buildStationChartInput(
  points: readonly TelemetryPoint[],
  movingAveragePoints: readonly MovingAveragePoint[],
  locale: Locale,
  unit: string,
  description: string,
): LineChartInput {
  const series: ChartSeriesInput[] = [
    {
      name: description,
      values: points.map((point) => point.value),
    },
  ];

  if (movingAveragePoints.length > 0) {
    const averageByTimestamp = new Map(
      movingAveragePoints.map((point) => [point.timestamp.getTime(), point.value] as const),
    );

    series.push({
      name: `${description} (media movil)`,
      values: points.map((point) => averageByTimestamp.get(point.timestamp.getTime()) ?? null),
    });
  }

  return {
    categories: points.map((point) => formatChartDate(point.timestamp, locale)),
    series,
    unit,
    description,
  };
}
