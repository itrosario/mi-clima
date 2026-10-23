# Changelog

Todas las novedades relevantes del proyecto se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [No publicado]

## [0.1.0] — 2026-10-22

### Añadido

- Sitio Astro 7 estático con rutas `/es/` y `/en/`, navegación completa y una
  sección por flujo: panel, alertas, ríos, estaciones, clima, estadísticas,
  descargas y fuentes.
- Sistema de diseño basado en tokens, `@layer`, BEM y la paleta del semáforo
  hidrológico, con temas claro, oscuro y automático.
- Tipografía autoalojada: Monaspace variable y Source Serif 4 variable.
- Diccionario de traducciones tipado: una clave faltante rompe la compilación.
- Persistencia del tema visual en `localStorage`, aplicada antes del primer
  pintado sin scripts inline.
- Modelo de dominio puro para catálogo, telemetría, umbrales, semáforo, clima,
  analítica de series, comparación y exportación.
- Adaptadores del INA para estaciones, observaciones y percentiles; adaptador de
  Open-Meteo; adaptador de la Prefectura Naval; cachés en memoria y de sesión.
- Panel del corredor del Paraná con seis estaciones, tarjetas, comparación,
  clima no oficial y gráfico de niveles.
- Alertas con mapa Leaflet, leyenda del semáforo, aviso de evacuación y panel
  separado de alturas de Prefectura.
- Catálogo de ríos con búsqueda y catálogo/ficha de estaciones con ventana de
  90 días y gráfico de media móvil.
- Estadísticas con anomalía contra percentiles, tendencia, velocidad de
  ascenso, extremos anuales, días en alerta, media móvil configurable y
  comparación entre estaciones.
- Descargas en CSV, JSON y texto plano generadas en el navegador, por estación
  y del dataset maestro del corredor.
- Worker de Cloudflare que expone `/api/prefectura` y
  `/api/prefectura/historico`, normaliza la tabla de la Prefectura y cachea en
  el borde.
- Encabezados de seguridad y cache mediante `public/_headers`, con CSP que
  habilita solo las fuentes y los mosaicos de OpenStreetMap necesarios.
- Suite de tests con Vitest, happy-dom, Playwright y axe-core, con cobertura
  del 100 % sobre todo el TypeScript de `src/`.
- Tests end-to-end con red completamente simulada para las ocho secciones en
  ambos idiomas, incluidos flujos de descarga, filtros y accesibilidad.
- Integración continua con Biome, Impeccable, chequeo de tipos, cobertura,
  build, end-to-end y publicación del reporte de Playwright.
- Documentación del proyecto: README, CHANGELOG, CONTRIBUTING y licencia MIT.

[No publicado]: https://github.com/itrosario/mi-clima/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/itrosario/mi-clima/releases/tag/v0.1.0
