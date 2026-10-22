import { defineConfig, devices } from "@playwright/test";

const previewServerUrl = "http://localhost:4321";
const isContinuousIntegration = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: isContinuousIntegration,
  retries: isContinuousIntegration ? 2 : 0,
  ...(isContinuousIntegration ? { workers: 2 } : {}),
  reporter: isContinuousIntegration ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: previewServerUrl,
    trace: "on-first-retry",
    locale: "es-AR",
    timezoneId: "America/Argentina/Cordoba",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 4321",
    url: previewServerUrl,
    reuseExistingServer: !isContinuousIntegration,
    timeout: 180_000,
  },
});
