import { fileURLToPath } from "node:url";
import { defineConfig } from "astro/config";

/**
 * Configuracion de Astro para "Mi Clima by IT Rosario".
 *
 * El sitio es estatico y no tiene backend: toda la consulta a los organismos
 * oficiales (INA, Open-Meteo) ocurre en el navegador. No se usa el renderer de
 * Preact porque el proyecto monta sus controladores como modulos externos, de
 * modo que ningun script ni estilo quede embebido en el HTML. Preact sigue
 * disponible como dependencia para los widgets que se monten a mano.
 */
export default defineConfig({
  site: "https://mi-clima.itrosario.com",
  output: "static",
  trailingSlash: "always",
  build: {
    // El CSS jamas se inyecta inline en el HTML: viaja siempre como archivo propio.
    inlineStylesheets: "never",
    assets: "assets",
  },
  vite: {
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    build: {
      // Ningun JavaScript ni asset pequeno se embebe en el HTML: Astro inlinea
      // los chunks por debajo de este limite, y aca el limite es cero.
      assetsInlineLimit: 0,
      rollupOptions: {
        output: {
          // Cada responsabilidad tecnica viaja en su propio archivo JavaScript.
          manualChunks(moduleId) {
            if (
              moduleId.includes("node_modules/echarts") ||
              moduleId.includes("node_modules/zrender")
            ) {
              return "echarts";
            }
            if (moduleId.includes("node_modules/leaflet")) {
              return "leaflet";
            }
            if (moduleId.includes("node_modules/preact")) {
              return "vendor";
            }
            return undefined;
          },
        },
      },
    },
  },
});
