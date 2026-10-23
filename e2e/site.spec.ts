import AxeBuilder from "@axe-core/playwright";
import { expect, type Page, test } from "@playwright/test";
import { mockDataSources } from "./fixtures";

const locales = ["es", "en"] as const;

const sections = [
  { slug: "", waitFor: "[data-corridor-cards] .station-card" },
  { slug: "alertas", waitFor: ".leaflet-container" },
  { slug: "rios", waitFor: ".river-group" },
  { slug: "estaciones", waitFor: "[data-station-catalogue] tbody tr" },
  { slug: "clima", waitFor: "[data-weather-current] .stat-tile" },
  { slug: "estadisticas", waitFor: "[data-statistics-anomaly] > *" },
  { slug: "descargas", waitFor: "[data-export-summary]:not(:empty)" },
  { slug: "fuentes", waitFor: ".source-grid .card" },
] as const;

function sectionUrl(locale: string, slug: string): string {
  return slug === "" ? `/${locale}/` : `/${locale}/${slug}/`;
}

async function openSection(page: Page, locale: string, slug: string): Promise<void> {
  await page.goto(sectionUrl(locale, slug));
  await expect(page.locator("h1")).toBeVisible();
}

test.beforeEach(async ({ page }) => {
  await mockDataSources(page);
});

for (const locale of locales) {
  test.describe(`sitio en ${locale}`, () => {
    for (const section of sections) {
      const sectionName = section.slug === "" ? "panel" : section.slug;

      test(`${sectionName} carga sus datos`, async ({ page }) => {
        await openSection(page, locale, section.slug);
        await expect(page.locator(section.waitFor).first()).toBeVisible();
        await expect(page.locator("[data-page-error]")).toBeHidden();
      });

      test(`${sectionName} no tiene violaciones WCAG 2.1 AA`, async ({ page }) => {
        await openSection(page, locale, section.slug);
        await expect(page.locator(section.waitFor).first()).toBeVisible();

        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
          .analyze();

        expect(
          results.violations,
          `${locale}/${section.slug}: ${results.violations
            .map((violation) => `${violation.id} (${violation.nodes.length})`)
            .join(", ")}`,
        ).toEqual([]);
      });
    }

    test("navega entre todas las secciones", async ({ page }) => {
      await openSection(page, locale, "");

      for (const section of sections) {
        const href = section.slug === "" ? `/${locale}/` : `/${locale}/${section.slug}/`;
        await expect(page.locator(`.site-header__nav a[href="${href}"]`)).toHaveCount(1);
      }
    });
  });
}

test.describe("flujos interactivos", () => {
  test("el panel grafica el corredor y muestra el clima no oficial", async ({ page }) => {
    await openSection(page, "es", "");

    await expect(page.locator("[data-corridor-chart] canvas")).toBeVisible();
    await expect(page.locator("[data-weather-source]")).toContainText("Open-Meteo");
    await expect(page.locator("[data-emergency-banner]")).toBeVisible();
  });

  test("las alertas muestran mapa, tarjetas y alturas de Prefectura", async ({ page }) => {
    await openSection(page, "es", "alertas");

    await expect(page.locator(".leaflet-container")).toBeVisible();
    await expect(page.locator("[data-prefectura-table]")).toContainText("Rosario");
    await expect(page.locator("[data-alert-cards] .station-card")).toHaveCount(6);
    await expect(page.locator("[data-status-legend] li")).toHaveCount(5);
  });

  test("las estadisticas cambian de estacion y de ventana movil", async ({ page }) => {
    await openSection(page, "es", "estadisticas");

    await page.locator("[data-station-select]").selectOption("33");
    await expect(page.locator("[data-statistics-meta]")).toContainText("San Lorenzo");

    await page.locator("[data-moving-window]").selectOption("30");
    await expect(page.locator("[data-statistics-chart] canvas")).toBeVisible();
  });

  test("las descargas generan el dataset maestro y el de una estacion", async ({ page }) => {
    await openSection(page, "es", "descargas");

    const masterDownload = page.waitForEvent("download");
    await page.locator("[data-export-master-button]").click();
    const masterFile = await masterDownload;
    expect(masterFile.suggestedFilename()).toMatch(/^corredor-parana.*\.csv$/);

    await page.locator("[data-export-station]").selectOption("34");
    await page.locator("[data-export-format]").selectOption("json");

    const stationDownload = page.waitForEvent("download");
    await page.locator("[data-export-station-button]").click();
    const stationFile = await stationDownload;
    expect(stationFile.suggestedFilename()).toMatch(/^estacion-34.*\.json$/);
  });

  test("el buscador de rios filtra sin recargar", async ({ page }) => {
    await openSection(page, "es", "rios");

    await page.locator("[data-river-search]").fill("Rosario");
    await expect(page.locator("[data-river-list]")).toContainText("Rosario");
    await expect(page.locator("[data-river-list] .river-group")).toHaveCount(1);
  });

  test("el idioma se conserva al cambiar de seccion", async ({ page }) => {
    await openSection(page, "en", "");

    await page.locator('.site-header__nav a[href="/en/clima/"]').click();

    await expect(page).toHaveURL(/\/en\/clima\/$/);
    await expect(page.locator("html")).toHaveAttribute("lang", "en");
  });
});
