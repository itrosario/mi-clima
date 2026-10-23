/**
 * Registro del service worker que habilita la instalacion y el arranque
 * offline de la aplicacion.
 *
 * El registro es opcional: un navegador sin soporte o una instalacion fallida
 * nunca deben impedir que el sitio muestre sus datos.
 */

export type ServiceWorkerRegistrar = Pick<ServiceWorkerContainer, "register">;

export function registerServiceWorker(container: ServiceWorkerRegistrar | undefined): void {
  if (container === undefined) {
    return;
  }

  void container.register("/service-worker.js").catch(() => {
    // La aplicacion sigue funcionando en linea aunque falle el registro.
  });
}
