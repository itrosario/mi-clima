# AGENTS.md

Instrucciones obligatorias para cualquier persona o agente que trabaje en
**Mi Clima by IT Rosario**. Si una tarea entra en conflicto con este documento,
se detiene y se consulta antes de implementar.

## 1. Proyecto y propósito público

- **Autoría:** Juan Martín Villanueva para **IT Rosario**. La autoría, el enlace
  al repositorio y la licencia MIT deben conservarse en el sitio, el README y
  los metadatos.
- **Propósito:** agregar y ordenar datos oficiales de clima, niveles
  hidrométricos y alertas de inundación de la Cuenca del Plata para uso público
  y gratuito.
- **Alcance:** español e inglés, sitio estático instalable (PWA), accesible y
  responsive. No hay cuentas de usuario ni recolección de datos personales más
  allá de lo estrictamente necesario para los avisos push.
- **Idioma:** identificadores y código en inglés; documentación, mensajes de
  interfaz y commits en castellano.

## 2. Regla de oro: no inventar datos

Está prohibido inventar, interpolar, completar, corregir, redondear de forma
engañosa o “rellenar” valores publicados por las fuentes.

- Si una fuente no publica un dato, la interfaz muestra el faltante explícito;
  nunca un cero, un promedio ni un valor estimado.
- No se agregan instantáneas, series históricas ni umbrales al repositorio.
- Los umbrales de alerta y evacuación son únicamente los publicados por el
  organismo oficial. No se deducen ni se copian entre estaciones.
- Las ventanas de datos deben terminar en la hora en punto para compartir la
  clave de caché entre visitantes.
- Los datos oficiales se atribuyen siempre a su fuente. Open-Meteo es la única
  fuente no oficial y debe estar rotulada como tal en todo contexto.
- Una estación sin umbrales publicados tiene estado `undefined`; no se le asigna
  un semáforo inventado.
- Los avisos push se derivan de umbrales oficiales del INA y **no** son un
  boletín oficial de emergencia. El texto debe decirlo.

Fuentes actuales: INA (`alerta.ina.gob.ar`), Prefectura Naval Argentina
(`contenidosweb.prefecturanaval.gob.ar`) y Open-Meteo (`api.open-meteo.com`).
Toda fuente nueva se documenta en `/es/fuentes/` y `/en/fuentes/` con endpoint,
frecuencia, licencia y método de normalización.

## 3. Arquitectura: Clean Architecture + DDD

El proyecto usa Clean Architecture con un modelo de dominio explícito.

```text
src/
  domain/         Modelo puro: catálogo, telemetría, semáforo, clima,
                  analítica, exportación y puertos. Sin E/S, DOM ni red.
  application/    Casos de uso: orquestan puertos y devuelven vistas.
  infrastructure/ Adaptadores: INA, Prefectura, Open-Meteo, cachés,
                  descargas y almacenamiento.
  presentation/   i18n, formateo, controladores DOM, gráficos, mapa,
                  renderizado, componentes y estilos.
  worker/         Entrada del Worker, proxies, caché de borde, API de avisos
                  y monitor programado.
```

Reglas de dependencia:

- `domain/` no importa de `application/`, `infrastructure/`, `presentation/` ni
  `worker/`.
- `application/` depende del dominio y de sus puertos, nunca de adaptadores
  concretos.
- `infrastructure/` implementa puertos del dominio; no contiene reglas de
  negocio.
- `presentation/` consume casos de uso; no habla directamente con orígenes
  externos.
- `worker/` expone transporte HTTP y tareas programadas; la lógica de dominio
  se reutiliza desde `domain/` y `application/`, no se duplica.
- Todo acceso externo pasa por un puerto para poder simularlo en tests.
- Un archivo, una responsabilidad. Nombres descriptivos, sin abreviaturas
  oscuras.

## 4. TDD obligatorio

El flujo es **red → green → refactor**:

1. Escribir primero el test que describe el comportamiento esperado.
2. Implementar lo mínimo para que pase.
3. Refactorizar con la suite en verde.
4. No se acepta código de producción nuevo sin tests que lo cubran.

### Cobertura

- **100 % de líneas, ramas, funciones y sentencias** sobre todo el TypeScript de
  `src/`.
- Quedan fuera los archivos `.astro`, la configuración y las suites E2E.
- No se baja el umbral ni se agregan exclusiones para “hacer pasar” la
  cobertura. Si una rama es difícil de probar, se rediseña el código.
- Los tests no salen a internet. Se usan dobles en memoria y payloads recortados
  de las fuentes reales.
- Los errores, estados vacíos, permisos denegados, respuestas 404/410 y fallos
  de red deben tener tests.

### Tipos de prueba

- **Dominio y aplicación:** Vitest en Node, sin DOM ni red.
- **Infraestructura:** Vitest con dobles de puertos y payloads reales
  recortados.
- **Presentación:** Vitest con `happy-dom` y controladores reales sobre el DOM.
- **Integración del Worker:** Vitest con `Request`/`Response` reales y dobles de
  KV, caché y `fetch`.
- **End-to-end:** Playwright contra el build de producción, con la red
  interceptada y `axe-core` en cada sección de ambos idiomas.
- Los tests E2E cubren escritorio y 390 px de ancho.

## 5. Calidad, comandos y gates

Versión de Node fijada en `.node-version` (24.22.1). Antes de abrir o actualizar
una pull request deben pasar, sin excepciones:

```bash
npm run lint
npm run check
npm run test:coverage
npm run e2e
npm run design:check
```

`npm run verify` ejecuta lint + cobertura + build. El build no reemplaza a los
E2E.

- TypeScript estricto: `strict`, `noUncheckedIndexedAccess`,
  `exactOptionalPropertyTypes`, `noImplicitOverride`, `verbatimModuleSyntax`.
- Prohibido `any`; Biome lo rechaza.
- Biome decide el formato. No se formatea a mano: `npm run lint:fix`.
- No se silencian errores con `console.log`, `@ts-ignore` ni reglas desactivadas
  sin justificación escrita.
- Los errores de red no deben romper la página: siempre hay estado de carga,
  error, reintento y contenido alternativo.

## 6. Diseño, accesibilidad y PWA

- Objetivo **WCAG 2.1 AA**: navegación por teclado, foco visible, jerarquía de
  encabezados, contraste, etiquetas de formulario, textos alternativos y
  `aria-live` para estados asincrónicos.
- Respetar `prefers-reduced-motion`.
- Responsive real: probar 390 px y escritorio; sin desbordes horizontales.
- Usar la paleta **“Río sereno”**, los tokens de `src/styles/tokens.css` y las
  convenciones BEM existentes. Nunca literales de color o espaciado.
- CSS en archivos propios. Nada de `<style>` ni scripts inline.
- Gráficos normalizados cuando corresponda y siempre con descripción accesible.
- Mantener la PWA: manifests por idioma, iconos, service worker y
  funcionamiento offline del armazón.
- El service worker no cachea datos meteorológicos ni hidrológicos; solo el
  armazón y assets con hash.
- Toda funcionalidad nueva debe funcionar con JavaScript deshabilitado en su
  contenido principal o degradar con un mensaje claro.
- Cada texto visible debe existir en `es.ts` y `en.ts`. El tipo
  `TranslationSchema` obliga a mantener la paridad.
- El trabajo de diseño se apoya en `impeccable` y en la skill local
  `.opencode/skills/design-review/SKILL.md`.

## 7. Avisos Web Push (reglas específicas)

Los avisos son públicos, sin cuentas, y se activan por dispositivo.

- La suscripción se guarda en KV con el endpoint push, sus claves públicas y
  las estaciones elegidas. **Nunca** se guardan coordenadas ni identificadores
  personales.
- La geolocalización se usa **solo en el navegador** para elegir la estación más
  cercana. No se envía al servidor. Si se deniega o el visitante está a más de
  300 km del corredor, se ofrece elegir una estación manualmente.
- El monitor corre cada 15 minutos mediante un Cron Trigger de Cloudflare.
- Disparadores:
  - entrada en `alert` o `evacuation`;
  - salida de `alert`/`evacuation` a un estado inferior (`clear`);
  - subida marcada: **≥ 0,30 m en 6 h** o **≥ 0,50 m en 24 h**.
- La subida marcada tiene un enfriamiento de **12 horas** por estación. No se
  repiten avisos por el mismo evento.
- La primera corrida del monitor solo toma una fotografía del estado: no envía
  avisos históricos.
- Si una estación no publica datos nuevos, se conserva el último estado y **no**
  se inventa una transición.
- Cada aviso aclara que se basa en umbrales oficiales del INA y que no es un
  boletín oficial de emergencia.
- El texto se adapta al idioma guardado en la suscripción (`es`/`en`).
- La API solo acepta endpoints HTTPS de servicios push conocidos. Rechaza
  cuerpos inválidos, orígenes ajenos y suscripciones sin estación válida.
- Las suscripciones vencidas (404/410) se eliminan. Las suscripciones tienen TTL
  de un año y se renuevan al volver a activarlas.
- La clave VAPID privada nunca se envía al navegador. Puede configurarse por
  entorno o generarse y guardarse en KV.
- En iPhone/iPad los avisos requieren iOS 16.4+ y la app instalada. La interfaz
  debe explicarlo.
- El service worker maneja `push` y `notificationclick` y abre `/es/alertas/` o
  `/en/alertas/` según corresponda.

## 8. Seguridad y privacidad

- No se commitean secretos, tokens, claves privadas ni endpoints personales.
- Validar y limitar todo dato de entrada: tamaño de cuerpo, tipo de contenido,
  endpoint, longitudes y estaciones permitidas.
- No se permite SSRF: los endpoints push se restringen a hosts conocidos.
- Las respuestas de la API de avisos van con `Cache-Control: no-store`.
- Los errores no deben filtrar detalles internos ni datos personales.
- La caché de borde solo guarda respuestas exitosas de datos públicos; los
  errores no se cachean.
- Respetar la licencia MIT del código y las licencias de las fuentes y
  tipografías.

## 9. Git, commits y pull requests

- La rama `main` está protegida: **no se aceptan pushes directos**. Todo cambio
  entra por pull request, salvo emergencia explícita del mantenedor.
- Crear una rama desde `main` con un nombre descriptivo.
- Commits atómicos y semánticos, en castellano, siguiendo la skill `git-story`:

```text
<tipo>: <descripción en imperativo>

<cuerpo opcional: motivo, impacto, referencias>
```

- Tipos habituales: `feat`, `fix`, `refactor`, `test`, `docs`, `build`, `ci`,
  `chore`, `perf`, `style`.
- No usar `git add .` a ciegas: revisar el diff antes de preparar.
- No reescribir historia compartida.
- Antes de la PR: actualizar `CHANGELOG.md` en `[No publicado]`, ejecutar los
  gates y describir el impacto en el usuario.
- La PR requiere revisión y conversación resuelta antes de fusionar.

## 10. Definición de terminado

Una tarea está terminada solo si:

- [ ] Los tests se escribieron antes o junto con el código y cubren el 100 %.
- [ ] `npm run lint`, `npm run check`, `npm run test:coverage`, `npm run e2e` y
  `npm run design:check` pasan.
- [ ] No se inventaron, interpolaron ni completaron datos oficiales.
- [ ] La atribución, autoría y advertencias oficiales siguen presentes.
- [ ] Español e inglés están completos y sincronizados.
- [ ] La interfaz es accesible, responsive y funciona con teclado.
- [ ] La PWA sigue instalable y el service worker no cachea datos.
- [ ] Los avisos push cumplen las reglas de la sección 7.
- [ ] La documentación y el `CHANGELOG.md` están actualizados.
- [ ] El cambio entró por pull request y `main` quedó desplegado y verificado.

## 11. Referencias internas

- `README.md`: visión general, stack, datos y despliegue.
- `CONTRIBUTING.md`: convenciones de contribución y commits.
- `CHANGELOG.md`: historial de cambios.
- `src/domain/`: modelo y puertos.
- `src/application/`: casos de uso.
- `src/infrastructure/`: adaptadores.
- `src/presentation/`: interfaz, i18n, estilos y controladores.
- `src/worker/`: proxies, API de avisos y monitor.
- `wrangler.jsonc`: bindings, assets y Cron Trigger.
- `.opencode/skills/design-review/SKILL.md`: flujo de revisión de diseño.
