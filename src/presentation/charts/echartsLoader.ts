/**
 * Carga diferida de ECharts.
 *
 * El paquete completo pesa cerca de un megabyte. Se importa solo cuando una
 * pagina realmente dibuja un grafico; el resto del sitio no lo descarga.
 */

import type { EChartsModuleLike } from "./chartRenderer";

export async function loadEChartsModule(): Promise<EChartsModuleLike> {
  return import("echarts");
}
