/**
 * Regresion lineal por minimos cuadrados.
 *
 * Pieza pura y reutilizable. La funcion es total: nunca devuelve `null` ni
 * lanza, para que quien la usa no tenga que cubrir ramas defensivas
 * inalcanzables. Cuando no hay datos suficientes devuelve una recta plana con
 * `rSquared` en cero, que se distingue del ajuste perfecto (`rSquared` en uno).
 */

export interface LinearRegression {
  /** Pendiente de la recta: unidades de Y por unidad de X. */
  readonly slope: number;
  /** Ordenada al origen. */
  readonly intercept: number;
  /** Coeficiente de determinacion, entre 0 y 1. */
  readonly rSquared: number;
  readonly sampleCount: number;
}

const degenerateRegression: LinearRegression = {
  slope: 0,
  intercept: 0,
  rSquared: 0,
  sampleCount: 0,
};

/**
 * Ajusta una recta a un conjunto de pares (x, y).
 *
 * Si las series tienen longitudes distintas se usan tantos pares como permita
 * la mas corta: la funcion no completa datos faltantes ni descarta el calculo.
 */
export function linearRegression(xs: readonly number[], ys: readonly number[]): LinearRegression {
  const sampleCount = Math.min(xs.length, ys.length);

  if (sampleCount < 2) {
    return { ...degenerateRegression, sampleCount };
  }

  const meanX = xs.slice(0, sampleCount).reduce((total, value) => total + value, 0) / sampleCount;
  const meanY = ys.slice(0, sampleCount).reduce((total, value) => total + value, 0) / sampleCount;

  let covariance = 0;
  let varianceX = 0;
  let totalSumOfSquares = 0;

  for (let index = 0; index < sampleCount; index += 1) {
    const deviationX = (xs[index] as number) - meanX;
    const deviationY = (ys[index] as number) - meanY;

    covariance += deviationX * deviationY;
    varianceX += deviationX * deviationX;
    totalSumOfSquares += deviationY * deviationY;
  }

  const slope = varianceX === 0 ? 0 : covariance / varianceX;
  const intercept = meanY - slope * meanX;

  if (totalSumOfSquares === 0) {
    return { slope, intercept, rSquared: 1, sampleCount };
  }

  let residualSumOfSquares = 0;
  for (let index = 0; index < sampleCount; index += 1) {
    const residual = (ys[index] as number) - (slope * (xs[index] as number) + intercept);
    residualSumOfSquares += residual * residual;
  }

  const rSquared = 1 - residualSumOfSquares / totalSumOfSquares;

  return {
    slope,
    intercept,
    rSquared: Math.max(0, Math.min(1, rSquared)),
    sampleCount,
  };
}
