/**
 * Arranque del tema visual.
 *
 * Se carga como script clasico en el `<head>` para que el tema correcto este
 * aplicado antes del primer pintado y no se produzca un destello. Vive como
 * archivo propio (no inline) para no acoplar codigo al HTML.
 */
(function bootTheme() {
  try {
    const storedPreference = window.localStorage.getItem("mi-clima-theme");
    if (storedPreference === "light" || storedPreference === "dark") {
      document.documentElement.setAttribute("data-theme", storedPreference);
    }
  } catch {
    // Almacenamiento no disponible: se mantiene el tema automatico del sistema.
  }
})();
