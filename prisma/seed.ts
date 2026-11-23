// Script de seed : `npx prisma db seed` (ou `npm run db:seed`).
// Idempotent : peut être relancé sans créer de doublons ni écraser les
// modifications faites depuis le back-office.

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { PrismaClient } from "../src/generated/prisma/client";

import { seedPages, seedResources, seedSettings } from "./seed-data";

const env = z
  .object({
    DIRECT_URL: z
      .string("DIRECT_URL est manquante")
      .min(1, "DIRECT_URL est manquante"),
    SEED_ADMIN_EMAIL: z.email(
      "SEED_ADMIN_EMAIL est manquante ou n'est pas une adresse e-mail",
    ),
    SEED_ADMIN_PASSWORD: z
      .string("SEED_ADMIN_PASSWORD est manquante")
      .min(12, "SEED_ADMIN_PASSWORD doit contenir au moins 12 caractères"),
  })
  .safeParse(process.env);

if (!env.success) {
  console.error("Variables d'environnement invalides pour le seed :");
  for (const issue of env.error.issues) console.error(`  - ${issue.message}`);
  process.exit(1);
}

const { DIRECT_URL, SEED_ADMIN_EMAIL, SEED_ADMIN_PASSWORD } = env.data;

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: DIRECT_URL }),
});

async function main() {
  const adminEmail = SEED_ADMIN_EMAIL.toLowerCase();
  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Administrateur",
      passwordHash: await bcrypt.hash(SEED_ADMIN_PASSWORD, 12),
    },
  });
  console.log(`✓ Administrateur : ${adminEmail}`);

  for (const { id, ...data } of seedResources) {
    await prisma.resource.upsert({
      where: { id },
      update: {},
      create: { id, ...data, images: [] },
    });
  }
  console.log(`✓ Ressources : ${seedResources.length}`);

  for (const page of seedPages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log(`✓ Pages : ${seedPages.length}`);

  for (const [key, value] of Object.entries(seedSettings)) {
    await prisma.setting.upsert({
      where: { key },
      update: {},
      create: { key, value },
    });
  }
  console.log(`✓ Paramètres : ${Object.keys(seedSettings).length}`);
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
