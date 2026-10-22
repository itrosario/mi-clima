# Mi Clima by IT Rosario

Agregador de datos oficiales argentinos sobre clima, alerta de inundación y
niveles hidrométricos de la Cuenca del Plata, publicado como sitio estático
en `/es/` y `/en/`.

El sitio **no tiene backend**: los datos se consultan directamente desde el
navegador a los organismos oficiales (INA, INTA) y a Open-Meteo. No hay base
de datos, ni tareas programadas, ni instantáneas versionadas en el repositorio.

---

## Qué hace

- **Panel** — estado actual del corredor del Paraná (Rosario, San Lorenzo,
  Santa Fe, Paraná, Villa Constitución, Corrientes) con semáforo de inundación.
- **Alertas** — semáforo por estación contra los umbrales oficiales de alerta
  y evacuación, con mapa y distancia a cada umbral.
- **Ríos** — catálogo navegable de ríos y estaciones hidrométricas de la
  Cuenca del Plata.
- **Clima** — condición actual y pronóstico; observados de redes oficiales y
  pronóstico de Open-Meteo (única fuente no oficial, siempre etiquetada).
- **Estadísticas** — anomalía contra percentiles históricos, tendencia y
  velocidad de ascenso, máximos y días en alerta por año, media móvil y
  variabilidad.
- **Descargas** — exportación en CSV, JSON y texto plano, por estación o del
  dataset completo.
- **Fuentes** — metodología, trazabilidad y atribución de cada dato.

## Stack

| Capa           | Tecnología                                               |
| -------------- | -------------------------------------------------------- |
| Sitio          | Astro 7 (salida estática)                                |
| Interactividad | Preact en islas, hydrated solo donde hace falta          |
| Gráficos       | ECharts 6                                                |
| Mapa           | Leaflet 1.9 + OpenStreetMap                              |
| Estilos        | CSS nativo con `@layer`, tokens de diseño y BEM          |
| Tipografía     | Monaspace (autoalojada) + Source Serif 4                 |
| Tests          | Vitest 5 + MSW 3 + Testing Library, Playwright, axe-core |
| Calidad        | Biome (lint + format)                                    |
| Deploy         | Cloudflare Workers (Static Assets) con Wrangler          |

TypeScript estricto de punta a punta (`strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`).

## Puesta en marcha

```bash
npm install
npm run dev          # servidor de desarrollo en http://localhost:4321
```

### Scripts

| Script                  | Descripción                                      |
| ----------------------- | ------------------------------------------------ |
| `npm run dev`           | Servidor de desarrollo con HMR                   |
| `npm run build`         | Genera el sitio estático en `dist/`              |
| `npm run preview`       | Sirve `dist/` localmente                         |
| `npm run check`         | Chequeo de tipos de Astro y TypeScript           |
| `npm run lint`          | Biome: lint + formato                            |
| `npm run lint:fix`      | Biome con escritura automática                   |
| `npm test`              | Tests unitarios y de integración (Vitest)        |
| `npm run test:coverage` | Tests con reporte de cobertura y umbral de 100 % |
| `npm run e2e`           | Tests end-to-end y de accesibilidad (Playwright) |
| `npm run design:check`  | Reglas de diseño (Impeccable)                    |
| `npm run deploy`        | Build + `wrangler deploy`                        |
| `npm run verify`        | Lint + cobertura + build                         |

## Arquitectura

Clean Architecture en capas, dentro de un único paquete:

```
src/
├── domain/         Modelo puro: catálogo, telemetría, semáforo, clima,
│                   analítica, exportación y puertos. Sin E/S ni DOM.
├── application/    Casos de uso: orquestan puertos y devuelven vistas.
├── infrastructure/ Adaptadores: INA, Open-Meteo, cachés, descargas.
└── presentation/   Astro, islas Preact, i18n, estilos.
```

Reglas:
- El dominio no importa nada de `application`, `infrastructure` ni
  `presentation`.
- La infraestructura implementa los puertos definidos en el dominio.
- La presentación solo consume casos de uso; nunca habla con la red.
- Todo acceso a datos externo pasa por un puerto, lo que permite simular la
  red completa en los tests con MSW.

### Cobertura

El objetivo de cobertura es **100 %** en líneas, ramas, funciones y
sentencias sobre todo el TypeScript de `src/`. Quedan fuera los archivos
`.astro`, la configuración y las suites end-to-end.

## Datos

| Fuente     | Uso                                                       | Endpoint                       |
| ---------- | --------------------------------------------------------- | ------------------------------ |
| INA        | Estaciones, niveles, umbrales, percentiles                | `alerta.ina.gob.ar/pub/datos/` |
| INTA       | Serie hidrométrica alternativa y variables agroclimáticas | vía INA                        |
| Open-Meteo | Pronóstico y archive meteorológico                        | `api.open-meteo.com`           |

El INA exige `POST` con cuerpo `application/x-www-form-urlencoded`; las
consultas con `GET` devuelven cero filas. Todos los endpoints publican
`Access-Control-Allow-Origin: *`, por eso el navegador puede consultarlos
directamente.

El detalle completo de cada recurso, de los umbrales y de las decisiones de
normalización está en la página `/es/fuentes/`.

## Despliegue

El sitio se publica como _Workers con Static Assets_:

```bash
npm run build
npx wrangler deploy
```

`wrangler.jsonc` declara `assets.directory = "./dist"` y
`assets.not_found_handling = "404-page"`. Cloudflare observa el repositorio y
reconstruye en cada cambio. Los encabezados de seguridad y de cache viajan en
`public/_headers`, sin necesidad de código de Worker.

## Accesibilidad

Objetivo WCAG 2.1 AA. `axe-core` corre sobre cada página en los tests
end-to-end y el sitio respeta navegación por teclado, foco visible, jerarquía
de encabezados, contraste y `prefers-reduced-motion`.

## Licencia

[MIT](LICENSE) para el código. Los datos publicados por los organismos
oficiales de la República Argentina son de dominio público y se reproducen
con fines informativos, citando siempre su fuente.
