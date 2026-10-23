# Changelog

Todas las novedades relevantes del proyecto se registran en este archivo.

El formato sigue [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) y
el proyecto sigue [Semantic Versioning](https://semver.org/lang/es/).

## [No publicado]

### Añadido

- Proxies del Worker para INA y Open-Meteo, además de Prefectura, con caché de
  borde compartida y renovación horaria. El catálogo del INA se guarda seis
  horas y los percentiles un día.
- Actualización automática de las páginas de datos cada hora mientras la pestaña
  está visible, y al volver a ella si pasó más de una hora.
- Las ventanas relativas terminan en la hora en punto para que todos los
  visitantes compartan la misma clave de caché durante cada hora.
- Autoría visible de Juan Martín Villanueva para IT Rosario en el pie, la página
  de fuentes y los metadatos del documento, junto con el propósito público del
  sitio y la aclaración de que no se agregan ni inventan datos.
- Selector de vista del gráfico del panel: nivel absoluto o índice contra el
  promedio de cada estación (`100 = promedio`), calculado solo con lecturas
  reales y sin proyectar valores futuros.
- Aplicación web instalable con manifest por idioma, iconos de 192/512 px,
  versión maskable, `apple-touch-icon`, botón de instalación y service worker.
- El service worker cachea solo el armazón y los assets; las consultas de datos
  pasan por los proxies del Worker, que comparten una copia de borde durante una
  hora.
- Adaptación responsive del encabezado, formularios, gráficos, mapas, tarjetas y
  tablas, con soporte para áreas seguras y rotación de pantalla.
- Enlace al repositorio de GitHub en el pie, la página de fuentes y el README,
  para descargar el código o proponer cambios.
- Avisos Web Push públicos y sin cuentas. Suscripción por dispositivo desde
  `/es/alertas/` y `/en/alertas/`. La geolocalización se usa solo en el
  navegador para elegir la estación más cercana (hasta 300 km); no se envían
  coordenadas al servidor. Se puede elegir una estación manualmente.
- Monitor de crecidas con Cron Trigger de Cloudflare cada 15 minutos. Se avisa
  al entrar en alerta o evacuación, al salir a estado inferior (`clear`) y en
  subidas marcadas (≥ 0,30 m en 6 h o ≥ 0,50 m en 24 h) con enfriamiento de
  12 horas por estación. La primera ejecución solo toma una fotografía del
  estado. Los avisos derivan de umbrales oficiales del INA y no son un boletín
  oficial de emergencia.
- API de avisos `/api/alertas/vapid`, `/api/alertas/suscripcion` y
  `/api/alertas/baja` con validación, lista de hosts push permitidos, TTL de
  un año, renovación al reactivar y baja automática ante respuestas `404/410`.
  Las claves VAPID pueden configurarse por entorno o generarse y guardarse en
  KV (`ALERTS`), autoprovisionado por Cloudflare.
- Service worker con manejo `push` y `notificationclick` (abre `/es/alertas/` o
  `/en/alertas/` según el aviso). Requiere PWA instalada en iOS/iPadOS 16.4+.
- `AGENTS.md` con reglas obligatorias del proyecto y skill local
  `.opencode/skills/design-review/SKILL.md` para revisión con `impeccable`.

### Cambiado

- La Política de Seguridad de Contenido ya no permite conexiones directas a las
  fuentes externas: todos los datos pasan por el mismo origen.
- La licencia MIT queda a nombre de Juan Martín Villanueva (IT Rosario), y
  `package.json` declara autor y licencia.
- Nueva paleta **Río sereno**: superficies frías, acento azul profundo y turquesa,
  y ámbar reservado para las alertas. Se actualizaron los temas claro y oscuro,
  el favicon, los iconos y el color de la barra del navegador.
- El texto mínimo del sistema de diseño subió a 12 px para mejorar la lectura en
  pantallas de alta densidad.
- Los gráficos y el mapa se redimensionan cuando cambia el contenedor.

### Corregido

- El gráfico del corredor ya no necesita extrapolar: cada curva puede compararse
  contra su propio promedio sin alterar los días sin lectura.

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
