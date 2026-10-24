/**
 * Pagina de clima.
 *
 * Consulta la condicion actual y el pronostico de Rosario. Toda la traduccion
 * visual la resuelve `renderWeatherBlocks`, que ademas etiqueta la fuente no
 * oficial.
 */

import {
  loadOfficialWeather,
  type OfficialWeatherView,
} from "@/application/weather/loadOfficialWeather";
import { loadWeather, type WeatherView } from "@/application/weather/loadWeather";
import { getTranslations } from "../i18n";
import { renderOfficialWeather, renderWeatherBlocks } from "../rendering/weather";
import { startAutoRefresh } from "../runtime/autoRefresh";
import { readPageLocale, resolvePageContext, runPage } from "../runtime/pageRuntime";
import type { PageOptions } from "./pageOptions";

export interface WeatherPageData {
  readonly forecast: WeatherView;
  readonly official: OfficialWeatherView | null;
}

export async function startWeatherPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);

  const load = async (signal: AbortSignal): Promise<WeatherPageData> => {
    const [forecast, official] = await Promise.allSettled([
      loadWeather({ source: services.weatherSource, clock: services.clock }, {}, signal),
      loadOfficialWeather(
        { source: services.officialWeatherSource, clock: services.clock },
        undefined,
        signal,
      ),
    ]);

    if (forecast.status === "rejected") {
      throw forecast.reason;
    }

    return {
      forecast: forecast.value,
      official: official.status === "fulfilled" ? official.value : null,
    };
  };

  const render = (data: WeatherPageData): void => {
    renderOfficialWeather(document, data.official, locale, translations);
    renderWeatherBlocks(document, data.forecast, locale, translations);
  };

  const run = (): Promise<void> =>
    runPage({ document, load, render, fallbackErrorMessage: translations.common.error });

  await run();
  startAutoRefresh({ document, refresh: run });
}
