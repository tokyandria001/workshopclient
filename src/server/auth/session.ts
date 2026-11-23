import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ADMIN_LOGIN } from "@/server/auth/redirect";

import type { AuthenticatedAdmin } from "./credentials";

/**
 * Point de contrôle unique de l'authentification côté serveur.
 *
 * À appeler dans chaque page, action serveur et route du back-office : le
 * proxy ne fait qu'une vérification rapide du cookie et ne suffit pas.
 * Vérifie aussi que le compte existe toujours en base (un administrateur
 * supprimé perd l'accès immédiatement, sans attendre l'expiration du cookie).
 * Redirige vers la page de connexion si l'accès est refusé.
 */
export async function requireAdmin(): Promise<AuthenticatedAdmin> {
  const session = await auth();
  const adminId = session?.user?.id;
  if (!adminId) redirect(ADMIN_LOGIN);

  const admin = await prisma.adminUser.findUnique({
    where: { id: adminId },
    select: { id: true, email: true, name: true },
  });
  if (!admin) redirect(ADMIN_LOGIN);

  return admin;
}
