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
    environment: "jsdom",
    include: ["tests/unit/**/*.test.{ts,tsx}"],
    // Expose afterEach globalement : Testing Library nettoie alors le DOM
    // automatiquement après chaque test.
    globals: true,
  },
});
