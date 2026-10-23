/**
 * Actualizacion periodica de una pagina de datos.
 *
 * La pagina vuelve a ejecutar su ciclo de carga cada hora mientras la pestana
 * esta visible. Si estuvo oculta mas de una hora, se actualiza al recuperar el
 * foco. El temporizador se cancela cuando la pagina se descarga.
 */

export const defaultAutoRefreshMilliseconds = 60 * 60 * 1000;

export interface AutoRefreshOptions {
  readonly document: Document;
  readonly refresh: () => Promise<void> | void;
  readonly intervalMilliseconds?: number;
}

/** Arranca el ciclo y devuelve una funcion para detenerlo. */
export function startAutoRefresh(options: AutoRefreshOptions): () => void {
  const view = options.document.defaultView;

  if (view === null) {
    return () => undefined;
  }

  const interval = options.intervalMilliseconds ?? defaultAutoRefreshMilliseconds;
  let timer: number | null = null;
  let stopped = false;
  let lastRefresh = Date.now();

  const clearTimer = (): void => {
    if (timer !== null) {
      view.clearTimeout(timer);
      timer = null;
    }
  };

  const schedule = (): void => {
    if (!stopped) {
      timer = view.setTimeout(() => {
        void tick();
      }, interval);
    }
  };

  const tick = async (): Promise<void> => {
    timer = null;

    if (stopped) {
      return;
    }

    if (options.document.visibilityState !== "hidden") {
      lastRefresh = Date.now();
      await Promise.resolve(options.refresh()).catch(() => undefined);
    }

    schedule();
  };

  const onVisibilityChange = (): void => {
    if (options.document.visibilityState !== "hidden" && Date.now() - lastRefresh >= interval) {
      clearTimer();
      void tick();
    }
  };

  const stop = (): void => {
    stopped = true;
    clearTimer();
    options.document.removeEventListener("visibilitychange", onVisibilityChange);
    view.removeEventListener("pagehide", stop);
  };

  options.document.addEventListener("visibilitychange", onVisibilityChange);
  view.addEventListener("pagehide", stop, { once: true });
  schedule();

  return stop;
}
