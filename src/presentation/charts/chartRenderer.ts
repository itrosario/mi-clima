/**
 * Envoltorio minimo de ECharts.
 *
 * El controlador no conoce la API del graficador: recibe esta interfaz con
 * `render`, `resize` y `dispose`. Asi las pruebas de pagina pueden inyectar un
 * doble y la libreria se carga solo en las vistas que dibujan graficos.
 */

export interface EChartsInstanceLike {
  setOption(option: unknown): void;
  resize(): void;
  dispose(): void;
}

export interface EChartsModuleLike {
  init(container: HTMLElement): EChartsInstanceLike;
}

export interface ChartRenderer {
  render(option: unknown): void;
  resize(): void;
  dispose(): void;
}

export function createChartRenderer(
  container: HTMLElement,
  module: EChartsModuleLike,
): ChartRenderer {
  const instance = module.init(container);
  const resizeObserver = new ResizeObserver(() => {
    instance.resize();
  });
  resizeObserver.observe(container);

  return {
    render: (option) => {
      instance.setOption(option);
    },
    resize: () => {
      instance.resize();
    },
    dispose: () => {
      resizeObserver.disconnect();
      instance.dispose();
    },
  };
}
