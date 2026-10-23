---
name: design-review
description: Usar para revisar o mejorar la interfaz de Mi Clima con Impeccable antes de una PR. Cubre detección automática, accesibilidad WCAG 2.1 AA, responsive a 390 px, paridad ES/EN, tokens de la paleta Río sereno, PWA y verificación de que la UI no invente datos.
---

# Design review para Mi Clima

Esta skill complementa a `impeccable`. No reemplaza sus reglas: las ejecuta en
el contexto de este proyecto y agrega los controles que el sitio exige.

## Cuándo usarla

- Antes de abrir o actualizar una pull request con cambios de interfaz.
- Después de tocar componentes Astro, CSS, controladores DOM, gráficos, mapas o
  textos visibles.
- Cuando haya que revisar accesibilidad, responsive, estados de carga/error o
  paridad español/inglés.

## Flujo obligatorio

1. **Leer el contexto**
   - `AGENTS.md`, en especial las secciones 2, 4, 5, 6 y 7.
   - `README.md` y `CONTRIBUTING.md` si el cambio afecta el flujo público.
   - El componente o controlador que se va a modificar y sus tests.

2. **Detección automática**
   ```bash
   npm run design:check
   ```
   Corregir los hallazgos de Impeccable. No se ignoran sin una razón escrita.

3. **Tests primero**
   - Si se agrega un estado o interacción, escribir el test de presentación
     antes de la implementación.
   - Ejecutar el archivo de test mientras se itera:
     ```bash
     npx vitest run tests/presentation/<archivo>.test.ts
     ```

4. **Revisión visual y semántica**
   - Abrir la página en escritorio y a 390 px.
   - Verificar navegación completa por teclado, orden de foco y foco visible.
   - Revisar contraste de texto, bordes y estados hover/focus/disabled.
   - Confirmar que los estados de carga, vacío y error existen y se anuncian con
     `aria-live` cuando corresponde.
   - Revisar `prefers-reduced-motion`.

5. **Datos y textos**
   - Confirmar que ningún valor faltante se muestra como cero o estimación.
   - Confirmar atribución a la fuente oficial y rotulado de Open-Meteo como no
     oficial.
   - Confirmar que los textos nuevos están en `es.ts` y `en.ts` y que no hay
     claves huérfanas.
   - En avisos push, confirmar la advertencia de que no son un boletín oficial
     de emergencia.

6. **PWA y service worker**
   - Verificar que el armazón sigue instalable y que el service worker no cachea
     datos.
   - Si se tocó `public/service-worker.js`, subir la versión de caché y probar
     `push` y `notificationclick` con un payload de ejemplo.

7. **Gates finales**
   ```bash
   npm run lint
   npm run check
   npm run test:coverage
   npm run e2e
   npm run design:check
   ```

## Reglas de diseño del proyecto

- Paleta **Río sereno**, definida en `src/styles/tokens.css`.
- Tokens para color, espacio, radios, tipografía y sombras. Nunca literales.
- CSS nativo con `@layer` y BEM. Nada de estilos inline.
- Tipografía Monaspace + Source Serif 4, ya autoalojadas.
- Componentes con HTML semántico; nada de `div` clickeable sin rol y teclado.
- Gráficos ECharts y mapas Leaflet cargados bajo demanda.
- Responsive real, no solo “se ve bien”: sin scroll horizontal ni texto cortado.
- Ningún texto visible hardcodeado fuera de i18n.

## Checklist de accesibilidad

- [ ] Un solo `h1` por página y jerarquía de encabezados coherente.
- [ ] Todos los controles tienen etiqueta accesible.
- [ ] El foco es visible y no queda atrapado.
- [ ] Los botones deshabilitados se anuncian como tales.
- [ ] Los mensajes asincrónicos usan `role="status"` o `aria-live`.
- [ ] Las imágenes decorativas tienen `alt=""`; las informativas, alt útil.
- [ ] El contraste cumple AA (4.5:1 texto normal, 3:1 texto grande/UI).
- [ ] Se respeta `prefers-reduced-motion`.
- [ ] axe-core pasa en ambos idiomas y en 390 px.

## Checklist de datos

- [ ] No se inventó, interpoló ni completó ningún valor.
- [ ] Los umbrales son los oficiales publicados.
- [ ] Los faltantes se muestran como faltantes.
- [ ] La fuente está citada en la página y en el pie.
- [ ] Las ventanas de datos terminan en la hora en punto.
- [ ] No se agregaron instantáneas ni series al repositorio.

## Checklist de avisos push

- [ ] La suscripción es por dispositivo y sin cuentas.
- [ ] La geolocalización se usa solo en el navegador.
- [ ] Hay selección manual de estación como alternativa.
- [ ] Se explica qué pasa si se deniega el permiso.
- [ ] El aviso aclara que no es un boletín oficial de emergencia.
- [ ] El service worker abre la página de alertas correcta.
- [ ] Los endpoints push se validan y no permiten SSRF.

## Referencias

- `AGENTS.md`
- `CONTRIBUTING.md`
- `src/styles/tokens.css`
- `src/presentation/i18n/translations/es.ts`
- `src/presentation/i18n/translations/en.ts`
- `public/service-worker.js`
