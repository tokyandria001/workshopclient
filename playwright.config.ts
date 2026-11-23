import "dotenv/config";

import { defineConfig, devices } from "@playwright/test";

// Port dédié aux tests : ne réutilise jamais par erreur un `npm run dev`
// ouvert sur le port 3000 pendant le développement.
const PORT = 3100;
// Dossier des e-mails capturés (lu par tests/e2e/outbox.ts).
const EMAIL_OUTBOX_DIR = ".emails-test";
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
    // Par défaut, tests sur le build de production : pages déjà compilées,
    // donc rapides et stables, et comportement identique à la mise en ligne.
    // E2E_DEV=1 pour tester sur le serveur de développement.
    command: process.env.E2E_DEV
      ? `npm run dev -- -p ${PORT}`
      : `npm run build && npm run start -- -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 300_000,
    env: {
      ...process.env,
      // E-mails écrits sur disque (jamais envoyés) pour que les tests en
      // vérifient le contenu et les liens.
      EMAIL_DELIVERY: "fichier",
      EMAIL_OUTBOX_DIR: EMAIL_OUTBOX_DIR,
      APP_URL: baseURL,
    } as Record<string, string>,
  },
});
