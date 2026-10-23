/**
 * Boton de instalacion de la aplicacion.
 *
 * El navegador avisa con `beforeinstallprompt` cuando el sitio cumple los
 * requisitos para instalarse. El evento se conserva hasta que la persona pulsa
 * el boton y, en ese momento, se abre el dialogo nativo. En iPhone y iPad el
 * navegador no emite ese evento: alli se muestran las instrucciones manuales.
 */

import { queryElement } from "../runtime/dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

/**
 * Conecta el boton de instalacion si el componente esta en la pagina.
 *
 * Devuelve `true` cuando encontro los elementos necesarios y pudo registrar
 * los manejadores, util para las pruebas.
 */
export function initInstallPrompt(documentRoot: Document = document): boolean {
  const container = queryElement<HTMLElement>(documentRoot, "[data-install-app]");
  if (container === null) {
    return false;
  }

  const button = queryElement<HTMLButtonElement>(documentRoot, "[data-install-button]");
  if (button === null) {
    return false;
  }

  const windowRoot = documentRoot.defaultView;
  if (windowRoot === null) {
    return false;
  }

  let installEvent: BeforeInstallPromptEvent | null = null;

  windowRoot.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    installEvent = event as BeforeInstallPromptEvent;
    container.hidden = false;
  });

  windowRoot.addEventListener("appinstalled", () => {
    installEvent = null;
    container.hidden = true;
  });

  button.addEventListener("click", () => {
    if (installEvent === null) {
      return;
    }

    const promptEvent = installEvent;
    installEvent = null;
    container.hidden = true;
    void promptEvent.prompt().catch(() => {
      // Si el navegador cancela el dialogo, el sitio sigue funcionando igual.
    });
  });

  return true;
}
