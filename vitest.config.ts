import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Configuracion de pruebas unitarias y de integracion.
 *
 * El JSX de Preact lo resuelve oxc a partir de `jsxImportSource: "preact"`
 * declarado en `tsconfig.json`, igual que en el build de Astro.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@domain": fileURLToPath(new URL("./src/domain", import.meta.url)),
      "@application": fileURLToPath(new URL("./src/application", import.meta.url)),
      "@infrastructure": fileURLToPath(new URL("./src/infrastructure", import.meta.url)),
      "@presentation": fileURLToPath(new URL("./src/presentation", import.meta.url)),
    },
  },
  test: {
    globals: true,
    // Un entorno por worker: amortiza el costo de crear el DOM sin perder
    // aislamiento entre archivos.
    pool: "threads",
    isolate: false,
    // Por defecto las pruebas corren sin DOM: la logica de dominio no lo
    // necesita. Las pruebas de componentes declaran `happy-dom` en su cabecera.
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    testTimeout: 20_000,
    hookTimeout: 20_000,
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts", "src/**/*.tsx"],
      exclude: ["src/**/*.d.ts"],
      thresholds: {
        lines: 100,
        branches: 100,
        functions: 100,
        statements: 100,
      },
    },
  },
});
