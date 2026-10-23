# Mi Clima by IT Rosario

Agregador de datos oficiales argentinos sobre clima, alertas de inundación y
niveles hidrométricos de la Cuenca del Plata, publicado como sitio estático en
`/es/` y `/en/`.

**Un proyecto de Juan Martín Villanueva para IT Rosario**, de uso público y
gratuito. El sitio recopila y ordena datos oficiales; no agrega, rellena ni
inventa lecturas. Cuando una fuente no publica un dato, la interfaz lo muestra
como faltante.

Código fuente, incidencias y propuestas:
[github.com/itrosario/mi-clima](https://github.com/itrosario/mi-clima).

El sitio no tiene base de datos, tareas programadas ni instantáneas de datos
versionadas: cada página consulta las fuentes al abrirse y vuelve a consultarlas
cuando cambia el rango de fechas. El INA y Open-Meteo se llaman directamente
desde el navegador; las alturas de la Prefectura Naval pasan por un Worker
mínimo del propio dominio, porque su sitio no habilita CORS.

---

## Qué hace

- **Panel** — estado actual del corredor del Paraná (Corrientes, Paraná, Santa
  Fe, San Lorenzo, Rosario y Villa Constitución) con semáforo de inundación,
  comparación entre estaciones, gráfico en nivel absoluto o como índice contra
  el promedio de cada estación, y clima de Rosario.
- **Alertas** — semáforo por estación contra los umbrales oficiales de alerta y
  evacuación, mapa interactivo, distancia a cada umbral y panel separado con
  las alturas publicadas por la Prefectura Naval.
- **Ríos** — catálogo navegable de ríos, tramos y estaciones hidrométricas de la
  Cuenca del Plata, con búsqueda en vivo.
- **Estaciones** — catálogo completo y ficha de cada escala con los últimos 90
  días, umbrales, red y enlaces a sus estadísticas.
- **Clima** — condición actual y pronóstico de Open-Meteo, la única fuente no
  oficial, siempre etiquetada como tal.
- **Estadísticas** — anomalía contra percentiles históricos, tendencia y
  velocidad de ascenso, máximos y días en alerta por año, media móvil de 2, 7 o
  30 días y comparación entre estaciones.
- **Descargas** — CSV, JSON y texto plano generados en el navegador, por
  estación o para el corredor completo.
- **Fuentes** — metodología, trazabilidad, atribución y advertencias de cada
  dato.

## Stack

| Capa           | Tecnología                                                       |
| -------------- | ---------------------------------------------------------------- |
| Sitio          | Astro 7 (salida estática)                                        |
| Interactividad | TypeScript sin framework; controladores DOM y HTML semántico     |
| Gráficos       | ECharts 6, cargado por demanda                                   |
| Mapa           | Leaflet 1.9 + OpenStreetMap, cargado por demanda                 |
| Estilos        | CSS nativo con `@layer`, tokens de diseño y BEM                  |
| Tipografía     | Monaspace (autoalojada) + Source Serif 4                         |
| Tests          | Vitest 5 + happy-dom, Playwright y axe-core                      |
| Calidad        | Biome (lint + format) e Impeccable                               |
| Backend        | Worker mínimo para el proxy de Prefectura, sin estado            |
| PWA            | Manifest por idioma, iconos instalables y service worker propio  |
| Deploy         | Cloudflare Workers (Static Assets) con Wrangler                  |

TypeScript estricto de punta a punta (`strict`, `noUncheckedIndexedAccess`,
`exactOptionalPropertyTypes`).

## Puesta en marcha

Requiere Node.js ≥ 22.23.4 (la versión fijada en `.node-version` es 24.22.1).

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
├── infrastructure/ Adaptadores: INA, Prefectura, Open-Meteo, cachés, descargas.
├── presentation/   i18n, formateo, controladores de página, gráficos, mapa,
│                   renderizado del DOM, componentes y estilos.
└── worker/         Entrada del Worker y proxy de Prefectura con cache de borde.
```

Reglas:

- El dominio no importa nada de `application`, `infrastructure`,
  `presentation` ni `worker`.
- La infraestructura implementa los puertos definidos en el dominio.
- La presentación consume casos de uso; nunca habla con la red directamente.
- Todo acceso externo pasa por un puerto, lo que permite simular la red
  completa en los tests sin salir a internet.
- El Worker solo expone `/api/prefectura` y `/api/prefectura/historico`.

### Estrategia de pruebas

- Dominio, aplicación e infraestructura: Vitest en Node, con dobles en memoria
  y payloads recortados de las fuentes reales.
- Presentación: Vitest con happy-dom y controladores reales sobre el DOM.
- End-to-end: Playwright contra el build de producción, con toda la red
  interceptada y axe-core aplicado a cada sección en ambos idiomas.

El objetivo de cobertura es **100 %** en líneas, ramas, funciones y sentencias
sobre todo el TypeScript de `src/`. Quedan fuera los archivos `.astro`, la
configuración y las suites end-to-end.

## Datos

| Fuente               | Uso                                                       | Endpoint                                  |
| -------------------- | --------------------------------------------------------- | ----------------------------------------- |
| INA                  | Estaciones, niveles, umbrales y percentiles               | `alerta.ina.gob.ar/pub/datos/`            |
| INTA                 | Serie hidrométrica alternativa, visible vía INA           | `alerta.ina.gob.ar/pub/datos/`            |
| Prefectura Naval     | Alturas de escala de los puertos del corredor             | `contenidosweb.prefecturanaval.gob.ar`    |
| Open-Meteo           | Condición actual y pronóstico (fuente no oficial)         | `api.open-meteo.com`                      |

El INA exige `POST` con cuerpo `application/x-www-form-urlencoded`; las
consultas con `GET` devuelven cero filas. El navegador lo consulta directamente
porque publica CORS. La Prefectura no lo hace, así que el Worker descarga su
tabla, la normaliza a JSON y la cachea en el borde durante pocos minutos.

Las estaciones que aparecen tanto en el INA como en la Prefectura se muestran
por separado: la Prefectura manda en el panel oficial de alturas y el INA sigue
siendo la fuente del semáforo y de las series históricas.

El detalle completo de cada recurso, de los umbrales y de las decisiones de
normalización está en la página `/es/fuentes/`.

## Despliegue

El sitio se publica como _Workers con Static Assets_:

```bash
npm run build
npx wrangler deploy
```

`wrangler.jsonc` declara `main = "src/worker/index.ts"`,
`assets.directory = "./dist"` y `assets.not_found_handling = "404-page"`.
Cloudflare observa el repositorio y reconstruye en cada cambio. Los encabezados
de seguridad y de cache de los archivos estáticos viajan en `public/_headers`;
el Worker agrega el cache de borde del proxy de Prefectura.

## Aplicación instalable

El sitio se puede instalar en Android, iPhone, iPad y escritorio. Cada idioma
tiene su propio manifest (`/manifest.es.webmanifest` y
`/manifest.en.webmanifest`), con iconos de 192 y 512 px, versión maskable y
`apple-touch-icon`.

El service worker (`/service-worker.js`) guarda únicamente el armazón de la
aplicación y los assets con hash para que pueda abrirse sin conexión. **Los
datos hidrológicos y meteorológicos nunca se cachean**: cada consulta va a las
fuentes oficiales, igual que en la versión en línea. En Android y escritorio el
navegador ofrece el botón de instalación; en iPhone y iPad se usa
_Compartir → Añadir a pantalla de inicio_.

## Accesibilidad y rendimiento

Objetivo WCAG 2.1 AA. `axe-core` corre sobre las dieciséis vistas (ocho
secciones por idioma) en los tests end-to-end. El sitio respeta navegación por
teclado, foco visible, jerarquía de encabezados, contraste y
`prefers-reduced-motion`. La navegación, los formularios, los gráficos y el mapa
se prueban también a 390 px de ancho para verificar que no haya desbordes
horizontales.

ECharts y Leaflet se importan dinámicamente solo en las páginas que los usan.
El contenido se renderiza en el servidor como HTML estático y los controladores
del navegador completan los datos sin hidratar componentes. Los gráficos y el
mapa escuchan cambios de tamaño para adaptarse a la rotación del teléfono.

## Licencia

[MIT](LICENSE) para el código, © Juan Martín Villanueva (IT Rosario). Los datos publicados por los organismos
oficiales de la República Argentina son de dominio público y se reproducen con
fines informativos, citando siempre su fuente.
