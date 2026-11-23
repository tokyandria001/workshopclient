import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // La CLI (migrations, Studio) utilise la connexion directe (port 5432).
    // L'application utilise DATABASE_URL (pooler) : voir src/lib/prisma.ts.
    url: env("DIRECT_URL"),
  },
});
