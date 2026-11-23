import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import type { ResourceType } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { resourceImageUrl } from "@/lib/resource-images";

/**
 * Étiquette de cache du catalogue public. Les actions du back-office qui
 * modifient une ressource appellent updateTag(CATALOG_TAG) : le changement est
 * visible immédiatement sur le site.
 */
export const CATALOG_TAG = "catalogue";

// Seuls les champs publics sont lus (pas de dates internes, etc.).
const publicFields = {
  id: true,
  type: true,
  name: true,
  description: true,
  images: true,
  priceCents: true,
  priceUnit: true,
  depositCents: true,
  quantityTotal: true,
} as const;

function toPublic<T extends { images: string[] }>(resource: T) {
  return { ...resource, images: resource.images.map(resourceImageUrl) };
}

/** Ressources actives, éventuellement filtrées par type. */
export async function getCatalog(type: ResourceType | null) {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const resources = await prisma.resource.findMany({
    where: { active: true, ...(type ? { type } : {}) },
    select: publicFields,
    // La salle d'abord (ordre de déclaration de l'enum), puis le matériel
    // par ordre alphabétique.
    orderBy: [{ type: "asc" }, { name: "asc" }],
  });
  return resources.map(toPublic);
}

/** Fiche d'une ressource active, ou `null` si elle est inconnue ou inactive. */
export async function getCatalogResource(id: string) {
  "use cache";
  cacheTag(CATALOG_TAG);
  cacheLife("hours");

  const resource = await prisma.resource.findFirst({
    where: { id, active: true },
    select: publicFields,
  });
  return resource ? toPublic(resource) : null;
}

export type CatalogResource = NonNullable<
  Awaited<ReturnType<typeof getCatalogResource>>
>;
