# Cómo contribuir

Gracias por querer mejorar **Mi Clima by IT Rosario**. Esta guía describe cómo
trabajar en el repositorio: convenciones de código, flujo de trabajo, pruebas
y estilo de commits.

## Requisitos

- Node.js ≥ 22.23.4
- npm ≥ 10
- Git

## Puesta en marcha

```bash
npm install
npm run dev
```

Antes de abrir una pull request:

```bash
npm run verify   # lint + cobertura + build
npm run e2e      # end-to-end y accesibilidad
```

## Convenciones de código

- **TypeScript estricto**: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`.
  No se usa `any`; Biome lo prohíbe.
- **Clean Architecture**: las dependencias apuntan hacia dentro.
  - `domain/` no importa de otras capas y no conoce el DOM ni la red.
  - `application/` coordina casos de uso usando los puertos del dominio.
  - `infrastructure/` implementa los puertos (INA, Prefectura, Open-Meteo,
    cachés y descargas).
  - `presentation/` son controladores DOM, renderizado, formateo, i18n, gráficos,
    mapa, componentes y layouts Astro.
  - `worker/` solo expone el proxy de Prefectura; no contiene reglas de dominio.
- **Responsabilidad única**: un archivo, un módulo, una razón para cambiar.
- **Nombres descriptivos**: los identificadores van en inglés; el glosario de
  dominio está documentado en castellano.
- **CSS separado del HTML**: nunca hay `<style>` inline ni scripts inline. El
  CSS viaja siempre como archivo propio y los valores salen de los tokens de
  `src/styles/tokens.css`.
- **Formato**: Biome decide. Nunca edites el formato a mano; usá
  `npm run lint:fix`.

## Tests

La cobertura del 100 % sobre todo el TypeScript de `src/` no es negociable.

- **Dominio y aplicación**: tests unitarios con Vitest, sin red.
- **Infraestructura**: dobles de los puertos y payloads recortados de las
  fuentes reales; ningún test sale a internet.
- **Presentación**: Vitest con happy-dom y controladores reales sobre el DOM.
- **End-to-end**: Playwright con el build de producción, red completamente
  simulada; cada sección y cada idioma se validan con axe-core contra WCAG 2.1
  AA.

Al escribir código nuevo:

1. Escribí primero el test que describe el comportamiento esperado.
2. Implementá lo mínimo para que pase.
3. Refactorizá con la suite en verde.

## Accesibilidad y diseño

- Cada elemento interactivo es alcanzable por teclado y tiene foco visible.
- Los componentes usan tokens, nunca literales de color o espaciado.
- Los estados de carga, error y vacío están siempre presentes en la interfaz.
- Los textos alternatives están escritos y se traducen.
- `npm run design:check` valida las reglas de Impeccable.

## Idiomas

Todo el texto visible vive en `src/presentation/i18n/translations/`. El
diccionario inglés debe cumplir el tipo `TranslationSchema`, así que agregar
una clave en castellano rompe la compilación hasta que se la traduzca.

## Commits

El historial se escribe con la skill `git-story`: cada commit es una unidad
conceptual con una intención clara, en castellano, y el cuerpo explica el
porqué cuando no es evidente.

```text
<tipo>: <descripcion en imperativo>

<cuerpo opcional: motivo, impacto, referencias>
```

Tipos habituales: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`,
`chore`, `perf`, `style`.

Reglas prácticas:

- Un commit, una idea. Si el mensaje necesita una conjunción, probablemente
  sean dos commits.
- Nada de `git add .` a ciegas: se revisa el diff antes de preparar.
- No se reescribe historia compartida (`master`).

## Pull requests

1. Creá una rama desde `master`: `git switch -c feature/...`.
2. Trabajá con commits pequeños y Atómicos.
3. Verificá que `npm run verify` y `npm run e2e` pasan en local.
4. Actualizá el `CHANGELOG.md` bajo `[No publicado]`.
5. Abrí la pull request describiendo el cambio y su impacto en el usuario.

## Datos y fuentes

- El sitio reproduce datos oficiales. Cualquier fuente nueva debe documentarse
  en `/es/fuentes/` con su endpoint, su frecuencia de actualización y su
  licencia.
- Si la fuente no publica CORS, se agrega una ruta al Worker y se documenta el
  cache de borde; el navegador nunca consulta un origen sin CORS.
- No se agregan instantáneas de datos al repositorio: todo se consulta en
  tiempo de ejecución.
- Los datos oficiales son de dominio público; Open-Meteo y las fuentes de
  tipografía mantienen sus propias licencias.

## Código de conducta

Sé respetuoso y constructivo. Los debates se centran en el código y en los
datos, nunca en las personas.
