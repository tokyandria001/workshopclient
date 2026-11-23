import { fileURLToPath } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Lancer Vitest via `npm run test` (scripts/run-vitest.mjs), qui corrige un
// problème de lettre de lecteur sous Windows.
export default defineConfig({
  plugins: [react()],
  resolve: {
    // Résout l'alias "@/*" défini dans tsconfig.json.
    tsconfigPaths: true,
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          environment: "jsdom",
          include: ["tests/unit/**/*.test.{ts,tsx}"],
          // Expose afterEach globalement : Testing Library nettoie alors le
          // DOM automatiquement après chaque test.
          globals: true,
        },
      },
      {
        // Tests d'intégration : vraie base de données (variables du .env).
        extends: true,
        resolve: {
          alias: {
            // « server-only » interdit l'import hors de Next.js : neutralisé
            // pour appeler les services directement depuis les tests.
            "server-only": fileURLToPath(
              new URL(
                "./tests/integration/server-only-stub.ts",
                import.meta.url,
              ),
            ),
          },
        },
        test: {
          name: "integration",
          environment: "node",
          include: ["tests/integration/**/*.test.ts"],
          setupFiles: ["dotenv/config"],
          testTimeout: 60_000,
          hookTimeout: 60_000,
        },
      },
    ],
  },
});
