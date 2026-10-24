/**
 * Entrada del Worker de Cloudflare.
 *
 * El sitio es estatico: los assets se sirven desde `dist` y el Worker atiende
 * los proxies de datos de INA, Open-Meteo, SMN y Prefectura Naval, la API de
 * avisos push y el Cron que revisa las estaciones. Las respuestas exitosas de
 * datos se comparten en la cache del borde del runtime de Cloudflare.
 */

import {
  handleAlertRequest,
  handleAlertSchedule,
  isAlertsPath,
  type ScheduledContextLike,
  type ScheduledControllerLike,
} from "./alertsWorker";
import type { AlertWorkerEnvironment } from "./alertTypes";
import { handleInaRequest, inaWorkerPath } from "./inaWorker";
import { handlePrefecturaRequest, type WorkerCache } from "./prefecturaWorker";
import { handleSmnRequest, smnWorkerPath } from "./smnWorker";
import { handleWeatherRequest, weatherWorkerPath } from "./weatherWorker";

interface CloudflareCacheStorage {
  readonly default?: WorkerCache;
}

function edgeCache(): WorkerCache | null {
  const storage = (globalThis as { caches?: CloudflareCacheStorage }).caches;

  return storage?.default ?? null;
}

export default {
  fetch(request: Request, environment: AlertWorkerEnvironment = {}): Promise<Response> {
    const dependencies = { cache: edgeCache() };
    const { pathname } = new URL(request.url);

    if (isAlertsPath(pathname)) {
      return handleAlertRequest(request, {
        kv: environment.ALERTS ?? null,
        environment,
      });
    }

    if (pathname === inaWorkerPath) {
      return handleInaRequest(request, dependencies);
    }

    if (pathname === weatherWorkerPath) {
      return handleWeatherRequest(request, dependencies);
    }

    if (pathname === smnWorkerPath) {
      return handleSmnRequest(request, dependencies);
    }

    return handlePrefecturaRequest(request, dependencies);
  },

  scheduled(
    controller: ScheduledControllerLike,
    environment: AlertWorkerEnvironment,
    context: ScheduledContextLike,
  ): void {
    handleAlertSchedule(controller, environment, context, { cache: edgeCache() });
  },
};
