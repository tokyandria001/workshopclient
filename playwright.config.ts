import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  globalTeardown: "./tests/e2e/global-teardown.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    locale: "fr-FR",
    timezoneId: "Europe/Paris",
    trace: "on-first-retry",
  },
  projects: [
    // Mobile first : 360 px de large, comme exigé à l'étape 12.
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], viewport: { width: 360, height: 780 } },
    },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
