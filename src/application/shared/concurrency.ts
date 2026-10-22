/**
 * Ejecucion acotada de tareas asincronicas.
 *
 * El INA responde una estacion por consulta. Para no abrir decenas de
 * conexiones a la vez, las estaciones se procesan con un limite de
 * concurrencia y se conserva el orden de entrada en el resultado.
 */

/** Ejecuta el mapeo con un maximo de promesas en vuelo y orden estable. */
export async function mapWithConcurrency<TItem, TResult>(
  items: readonly TItem[],
  limit: number,
  mapper: (item: TItem, index: number) => Promise<TResult>,
): Promise<TResult[]> {
  const workerCount = Math.max(1, Math.min(Math.trunc(limit), items.length || 1));
  const results = new Array<TResult>(items.length);

  let nextIndex = 0;

  async function worker(): Promise<void> {
    for (;;) {
      const currentIndex = nextIndex;
      nextIndex += 1;

      if (currentIndex >= items.length) {
        return;
      }

      results[currentIndex] = await mapper(items[currentIndex] as TItem, currentIndex);
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return results;
}
