/**
 * Ayudas minimas de manipulacion del DOM.
 *
 * La interfaz se arma con nodos creados desde TypeScript y con el texto
 * siempre asignado por `textContent`: ningun dato de origen externo se
 * interpreta como HTML.
 */

import { missingValuePlaceholder } from "../format/formatters";

/** Busca un elemento y falla con un mensaje util si no existe. */
export function requireElement<TElement extends Element>(
  root: ParentNode,
  selector: string,
): TElement {
  const element = root.querySelector<TElement>(selector);

  if (element === null) {
    throw new Error(`Falta el elemento requerido: ${selector}`);
  }

  return element;
}

export function queryElement<TElement extends Element>(
  root: ParentNode,
  selector: string,
): TElement | null {
  return root.querySelector<TElement>(selector);
}

export function createTextElement<TTag extends keyof HTMLElementTagNameMap>(
  document: Document,
  tagName: TTag,
  className: string,
  text: string,
): HTMLElementTagNameMap[TTag] {
  const element = document.createElement(tagName);
  element.className = className;
  element.textContent = text;

  return element;
}

export function clearElement(element: Element): void {
  element.replaceChildren();
}

/** Vacia un contenedor y lo llena con los nodos indicados. */
export function renderInto(document: Document, selector: string, children: readonly Node[]): void {
  const container = requireElement<HTMLElement>(document, selector);
  clearElement(container);
  container.append(...children);
}

export function createEmptyState(document: Document, message: string): HTMLElement {
  return createTextElement(document, "p", "empty-state", message);
}

/** Muestra u oculta un elemento con el atributo `hidden`. */
export function setHidden(element: HTMLElement, hidden: boolean): void {
  element.hidden = hidden;
}

/** Texto de un valor opcional, con raya cuando la fuente no lo publico. */
export function valueOrPlaceholder(value: string | null): string {
  if (value === null || value.trim().length === 0) {
    return missingValuePlaceholder;
  }

  return value;
}
