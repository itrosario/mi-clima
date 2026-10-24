/**
 * Bloques de clima.
 *
 * La condicion actual se muestra como mosaicos y el pronostico como tabla.
 * Open-Meteo es la unica fuente no oficial: la etiqueta de procedencia viaja
 * siempre junto a estos bloques, tambien en las pruebas.
 */

import type { OfficialWeatherView } from "@/application/weather/loadOfficialWeather";
import type { WeatherView } from "@/application/weather/loadWeather";
import type { OfficialWeatherObservation } from "@/domain/weather/official";
import type {
  WeatherCondition,
  WeatherForecastDay,
  WeatherObservation,
} from "@/domain/weather/types";
import {
  formatDate,
  formatDateTime,
  formatMeasurement,
  formatPercent,
  missingValuePlaceholder,
} from "../format/formatters";
import type { Locale } from "../i18n/locales";
import type { TranslationSchema } from "../i18n/translations/es";
import { createEmptyState, createTextElement, renderInto } from "../runtime/dom";
import { createDataTable, createStatTile, type TableColumn } from "./kit";

const conditionKeys: Record<WeatherCondition, keyof TranslationSchema["weatherCondition"]> = {
  clear: "clear",
  "mainly-clear": "mainlyClear",
  "partly-cloudy": "partlyCloudy",
  overcast: "overcast",
  fog: "fog",
  drizzle: "drizzle",
  "freezing-drizzle": "freezingDrizzle",
  rain: "rain",
  "freezing-rain": "freezingRain",
  snow: "snow",
  "rain-showers": "rainShowers",
  "snow-showers": "snowShowers",
  thunderstorm: "thunderstorm",
  "thunderstorm-hail": "thunderstormHail",
  unknown: "unknown",
};

export function weatherConditionLabel(
  condition: WeatherCondition,
  translations: TranslationSchema,
): string {
  return translations.weatherCondition[conditionKeys[condition]];
}

export function createCurrentWeatherTiles(
  document: Document,
  observation: WeatherObservation,
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  return [
    createStatTile(document, {
      label: translations.weather.temperature,
      value: formatMeasurement(observation.temperatureCelsius, "\u00b0C", locale, 1),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.feelsLike,
      value: formatMeasurement(observation.apparentTemperatureCelsius, "\u00b0C", locale, 1),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.humidity,
      value: formatPercent(observation.relativeHumidityPercent, locale),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.precipitation,
      value: formatMeasurement(observation.precipitationMillimetres, "mm", locale, 1),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.wind,
      value: formatMeasurement(observation.windSpeedKilometresPerHour, "km/h", locale, 0),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.condition,
      value: weatherConditionLabel(observation.condition, translations),
      hint: null,
    }),
  ];
}

export function createForecastTable(
  document: Document,
  forecast: readonly WeatherForecastDay[],
  locale: Locale,
  translations: TranslationSchema,
): HTMLElement {
  const columns: readonly TableColumn<WeatherForecastDay>[] = [
    {
      key: "date",
      label: translations.common.date,
      value: (row) => formatDate(row.date, locale),
    },
    {
      key: "minimum",
      label: translations.weather.minimumTemperature,
      value: (row) => formatMeasurement(row.minimumTemperatureCelsius, "\u00b0C", locale, 1),
      numeric: true,
    },
    {
      key: "maximum",
      label: translations.weather.maximumTemperature,
      value: (row) => formatMeasurement(row.maximumTemperatureCelsius, "\u00b0C", locale, 1),
      numeric: true,
    },
    {
      key: "precipitation",
      label: translations.weather.precipitation,
      value: (row) => formatMeasurement(row.precipitationMillimetres, "mm", locale, 1),
      numeric: true,
    },
    {
      key: "probability",
      label: translations.weather.precipitationProbability,
      value: (row) => formatPercent(row.precipitationProbabilityPercent, locale),
      numeric: true,
    },
    {
      key: "wind",
      label: translations.weather.maximumWind,
      value: (row) => formatMeasurement(row.maximumWindSpeedKilometresPerHour, "km/h", locale, 0),
      numeric: true,
    },
    {
      key: "condition",
      label: translations.weather.condition,
      value: (row) => weatherConditionLabel(row.condition, translations),
    },
  ];

  return createDataTable(document, {
    caption: translations.weather.forecastTitle,
    columns,
    rows: forecast,
    emptyMessage: translations.weather.forecastEmpty,
  });
}

function createOfficialWeatherTiles(
  document: Document,
  observation: OfficialWeatherObservation,
  locale: Locale,
  translations: TranslationSchema,
): readonly HTMLElement[] {
  return [
    createStatTile(document, {
      label: translations.common.station,
      value: `${observation.stationName} (${observation.province})`,
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.observedBy,
      value: formatDateTime(observation.observedAt, locale),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.temperature,
      value: formatMeasurement(observation.temperatureCelsius, "\u00b0C", locale, 1),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.feelsLike,
      value: formatMeasurement(observation.apparentTemperatureCelsius, "\u00b0C", locale, 1),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.humidity,
      value: formatPercent(observation.relativeHumidityPercent, locale),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.pressure,
      value: formatMeasurement(observation.pressureHectopascals, "hPa", locale, 1),
      hint: null,
    }),
    createStatTile(document, {
      label: translations.weather.wind,
      value: formatMeasurement(observation.windSpeedKilometresPerHour, "km/h", locale, 0),
      hint: observation.windDirectionText,
    }),
    createStatTile(document, {
      label: translations.weather.condition,
      value: observation.condition ?? missingValuePlaceholder,
      hint: null,
    }),
  ];
}

/**
 * Dibuja la observacion oficial del SMN.
 *
 * Si la fuente no publico una estacion con datos, se muestra el faltante
 * explicito; nunca se reemplaza por el pronostico no oficial.
 */
export function renderOfficialWeather(
  document: Document,
  view: OfficialWeatherView | null,
  locale: Locale,
  translations: TranslationSchema,
): void {
  if (view === null || view.observation === null) {
    renderInto(document, "[data-weather-official]", [
      createEmptyState(document, translations.weather.officialEmpty),
    ]);
    renderInto(document, "[data-weather-official-source]", []);
    return;
  }

  renderInto(document, "[data-weather-official]", [
    ...createOfficialWeatherTiles(document, view.observation, locale, translations),
  ]);

  const source = createTextElement(
    document,
    "p",
    "source-note",
    `${translations.weather.officialSource} \u00b7 ${view.observation.stationName}`,
  );
  renderInto(document, "[data-weather-official-source]", [source]);
}

/**
 * Vuelca la condicion actual, el pronostico y la procedencia en sus bloques.
 *
 * Los tres contenedores son obligatorios en las vistas que usan este modulo:
 * si falta uno, el error aparece en desarrollo en lugar de dejar la pagina a
 * medio dibujar.
 */
export function renderWeatherBlocks(
  document: Document,
  view: WeatherView | null,
  locale: Locale,
  translations: TranslationSchema,
): void {
  if (view === null) {
    renderInto(document, "[data-weather-current]", [
      createEmptyState(document, translations.dashboard.weatherUnavailable),
    ]);
    renderInto(document, "[data-weather-forecast]", []);
    renderInto(document, "[data-weather-source]", []);

    return;
  }

  const currentBlocks =
    view.snapshot.current === null
      ? [createEmptyState(document, translations.weather.currentEmpty)]
      : createCurrentWeatherTiles(document, view.snapshot.current, locale, translations);

  renderInto(document, "[data-weather-current]", currentBlocks);
  renderInto(document, "[data-weather-forecast]", [
    createForecastTable(document, view.snapshot.forecast, locale, translations),
  ]);

  const source = createTextElement(
    document,
    "p",
    "source-note",
    `${translations.weather.forecastSource} \u00b7 ${translations.dashboard.unofficialSource}`,
  );
  renderInto(document, "[data-weather-source]", [source]);
}
