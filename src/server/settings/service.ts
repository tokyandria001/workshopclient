import "server-only";

import { prisma } from "@/lib/prisma";

/** Délai de paiement après acceptation, en heures (paramètre de la cliente). */
export const PAYMENT_DELAY_KEY = "paiement.delaiHeures";
export const DEFAULT_PAYMENT_DELAY_HOURS = 72;

/** Lit un paramètre numérique, avec une valeur par défaut si absent ou invalide. */
export async function getNumberSetting(
  key: string,
  fallback: number,
): Promise<number> {
  const setting = await prisma.setting.findUnique({ where: { key } });
  const value = Number(setting?.value);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}
