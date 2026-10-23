/**
 * Pagina de clima.
 *
 * Consulta la condicion actual y el pronostico de Rosario. Toda la traduccion
 * visual la resuelve `renderWeatherBlocks`, que ademas etiqueta la fuente no
 * oficial.
 */

import { loadWeather, type WeatherView } from "@/application/weather/loadWeather";
import { getTranslations } from "../i18n";
import { renderWeatherBlocks } from "../rendering/weather";
import { readPageLocale, resolvePageContext, runPage } from "../runtime/pageRuntime";
import type { PageOptions } from "./pageOptions";

export async function startWeatherPage(options: PageOptions): Promise<void> {
  const { document, services } = resolvePageContext(options);
  const locale = readPageLocale(document);
  const translations = getTranslations(locale);

  const load = (signal: AbortSignal): Promise<WeatherView> =>
    loadWeather({ source: services.weatherSource, clock: services.clock }, {}, signal);

  const render = (view: WeatherView): void => {
    renderWeatherBlocks(document, view, locale, translations);
  };

  await runPage({ document, load, render, fallbackErrorMessage: translations.common.error });
}
