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

/** Vista del grafico del corredor: nivel real o indice contra el promedio. */
export type CorridorChartMode = "absolute" | "index";

export interface CorridorChartOptions {
  readonly locale: Locale;
  readonly unit: string;
  /** Descripcion para lectores de pantalla. */
  readonly description: string;
  readonly mode: CorridorChartMode;
  /** Texto de la linea de referencia, por ejemplo `100 = promedio`. */
  readonly averageReferenceLabel: string;
}

/**
 * Serie diaria del corredor, alineada por dia entre estaciones.
 *
 * En modo `index` cada valor se divide por el promedio de su propia estacion.
 * No se completa ningun dia faltante ni se proyectan valores futuros.
 */
export function buildCorridorChartInput(
  readings: readonly StationReading[],
  options: CorridorChartOptions,
): LineChartInput {
  const { locale } = options;
  const dateKeys = [
    ...new Set(readings.flatMap((reading) => reading.dailyExtremes.map((day) => day.dateKey))),
  ].sort((left, right) => left.localeCompare(right));

  const series: ChartSeriesInput[] = readings
    .filter((reading) => reading.dailyExtremes.length > 0)
    .map((reading) => {
      const dailyMeans = reading.dailyExtremes.map((day) => day.mean);
      const stationAverage =
        dailyMeans.reduce((total, value) => total + value, 0) / dailyMeans.length;
      const meanByDay = new Map(
        reading.dailyExtremes.map((day) => [day.dateKey, day.mean] as const),
      );

      return {
        name: reading.station.name,
        values: dateKeys.map((dateKey) => {
          const value = meanByDay.get(dateKey) ?? null;

          if (options.mode === "absolute" || value === null) {
            return value;
          }

          return stationAverage === 0 ? null : (value / stationAverage) * 100;
        }),
      };
    });

  return {
    categories: dateKeys.map((dateKey) => dateKeyLabel(dateKey, locale)),
    series,
    unit: options.unit,
    description: options.description,
    ...(options.mode === "index"
      ? {
          referenceLine: {
            value: 100,
            label: options.averageReferenceLabel,
          },
        }
      : {}),
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
