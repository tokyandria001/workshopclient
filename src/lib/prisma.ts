import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("La variable d'environnement DATABASE_URL est manquante.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Une seule instance par processus : en développement, le rechargement à chaud
// recréerait sinon un pool de connexions à chaque modification.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
