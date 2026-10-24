# Mi Clima by IT Rosario

Agregador de datos oficiales argentinos sobre clima, alertas de inundación y
niveles hidrométricos de la Cuenca del Plata, publicado como sitio estático en
`/es/` y `/en/`.

**Un proyecto de Juan Martín Villanueva para IT Rosario**, de uso público y
gratuito. El sitio recopila y ordena datos oficiales; no agrega, rellena ni
inventa lecturas. Cuando una fuente no publica un dato, la interfaz lo muestra
como faltante. Los avisos Web Push son opcionales, sin cuentas, sin envío de
coordenadas al servidor y basados en umbrales oficiales del INA; no son un
boletín oficial de emergencia. Las suscripciones solo guardan endpoint, claves de
cifrado y estaciones elegidas. En iOS/iPadOS 16.4+ se requiere la app instalada.

Código fuente, incidencias y propuestas:
[github.com/itrosario/mi-clima](https://github.com/itrosario/mi-clima).

El sitio no guarda instantáneas de datos versionadas. Cada página consulta las
fuentes al abrirse, se actualiza sola cada hora mientras la pestaña sigue visible
y vuelve a consultar cuando cambia el rango de fechas. El INA, Open-Meteo y la
Prefectura Naval pasan por proxies del Worker con una caché de borde compartida:
la primera visita de cada hora consulta la fuente y las siguientes reciben esa
misma lectura durante la hora. Las suscripciones a avisos Web Push se guardan
en KV (binding `ALERTS`) con los datos mínimos necesarios (endpoint, claves de
cifrado y estaciones elegidas); no se guardan coordenadas ni identificadores
personales. Un Cron Trigger de Cloudflare ejecuta el monitor cada 15 minutos
para revisar las estaciones. No se guardan series históricas en el servidor.

---

## Qué hace

- **Panel** — estado actual del corredor del Paraná (Corrientes, Paraná, Santa
  Fe, San Lorenzo, Rosario y Villa Constitución) con semáforo de inundación,
  comparación entre estaciones, gráfico en nivel absoluto o como índice contra
  el promedio de cada estación, y clima de Rosario.
- **Alertas** — semáforo por estación contra los umbrales oficiales de alerta y
  evacuación, mapa interactivo, distancia a cada umbral y panel separado con
  las alturas publicadas por la Prefectura Naval. Suscripción opcional a avisos
  Web Push por dispositivo (geolocalización solo en el navegador, selección
  manual, sin coordenadas en el servidor). Los avisos derivan de umbrales
  oficiales del INA y no son un boletín oficial de emergencia. En iOS/iPadOS
  16.4+ es necesario tener la app instalada.
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
| Backend        | Worker con proxies de INA, Open-Meteo y Prefectura, caché de borde, API de avisos push, KV y Cron Trigger cada 15 minutos |
| PWA            | Manifest por idioma, iconos instalables, service worker propio y avisos Web Push |
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
└── worker/         Entrada del Worker, proxies y caché de borde compartida.
```

Reglas:

- El dominio no importa nada de `application`, `infrastructure`,
  `presentation` ni `worker`.
- La infraestructura implementa los puertos definidos en el dominio.
- La presentación consume casos de uso; nunca habla con la red directamente.
- Todo acceso externo pasa por un puerto, lo que permite simular la red
  completa en los tests sin salir a internet.
- El Worker expone `/api/ina`, `/api/clima`, `/api/prefectura` y
  `/api/prefectura/historico`. Los proxies solo reenvían parámetros permitidos y
  cachean respuestas exitosas; los errores nunca se cachean.

### Estrategia de pruebas

- Dominio, aplicación e infraestructura: Vitest en Node, con dobles en memoria
  y payloads recortados de las fuentes reales.
- Presentación: Vitest con happy-dom y controladores reales sobre el DOM.
- End-to-end: Playwright contra el build de producción, con toda la red
  interceptada y axe-core aplicado a cada sección en ambos idiomas.

El objetivo de cobertura es **100 %** en líneas, ramas, funciones y sentencias
sobre todo el TypeScript de `src/`. Quedan fuera los archivos `.astro`, la
configuración y las suites end-to-end.

## Autoría

**Mi Clima by IT Rosario** fue ideado, diseñado y pensado por **Juan Martín Villanueva** para **IT Rosario**.

El código fuente fue generado íntegramente con IA mediante [OpenCode](https://github.com/sst/opencode) y el modelo **Big Pickle**, bajo dirección, revisión y supervisión del autor.

## Datos

| Fuente               | Uso                                                       | Endpoint                                  |
| -------------------- | --------------------------------------------------------- | ----------------------------------------- |
| INA                  | Estaciones, niveles, umbrales y percentiles               | `alerta.ina.gob.ar/pub/datos/`            |
| INTA                 | Serie hidrométrica alternativa, visible vía INA           | `alerta.ina.gob.ar/pub/datos/`            |
| Prefectura Naval     | Alturas de escala de los puertos del corredor             | `contenidosweb.prefecturanaval.gob.ar`    |
| SMN                  | Observación oficial del tiempo presente (vía /api/smn)   | `ssl.smn.gob.ar/dpd/zipopendata.php`     |
| Open-Meteo           | Condición actual y pronóstico (fuente no oficial)         | `api.open-meteo.com`                      |

El INA exige `POST` con cuerpo `application/x-www-form-urlencoded`; las
consultas con `GET` devuelven cero filas. El Worker recibe `GET` desde el
navegador y reconstruye el formulario contra el INA. Open-Meteo y la Prefectura
también pasan por el Worker, que normaliza la tabla de Prefectura a JSON.

Las ventanas relativas terminan en la hora en punto para que todos los
visitantes compartan la misma clave de caché. Las series y el clima se guardan
una hora en el borde; el catálogo del INA, seis horas; los percentiles, un día.
La primera visita de cada período actualiza la copia y las siguientes la
reutilizan, sin guardar series históricas ni completar datos faltantes.

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
el Worker agrega la caché de borde de los tres proxies y el frontend se refresca
solo cada hora mientras la pestaña está visible.

## Aplicación instalable

El sitio se puede instalar en Android, iPhone, iPad y escritorio. Cada idioma
tiene su propio manifest (`/manifest.es.webmanifest` y
`/manifest.en.webmanifest`), con iconos de 192 y 512 px, versión maskable y
`apple-touch-icon`.

El service worker (`/service-worker.js`) guarda únicamente el armazón de la
aplicación y los assets con hash para que pueda abrirse sin conexión. **El
service worker no cachea datos**: las consultas van al Worker, que comparte una
caché de borde de una hora entre visitantes. Así se reduce el tráfico sin
mostrar lecturas inventadas ni congelar una copia local por tiempo indefinido.
El service worker gestiona `push` y `notificationclick` para los avisos de
inundación. En Android y escritorio el navegador ofrece el botón de instalación;
en iPhone y iPad se usa _Compartir → Añadir a pantalla de inicio_. Para recibir
avisos push en iOS/iPadOS es necesario tener la app instalada y usar iOS 16.4+.

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
