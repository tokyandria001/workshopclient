import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { MAX_IMAGES_PER_RESOURCE } from "@/lib/resource-images";

import type { ResourceFormData } from "./schema";

// Accès aux données des ressources. Ces fonctions ne vérifient pas
// l'authentification : les pages et actions du back-office appellent
// requireAdmin() avant de les utiliser.

export function listResources() {
  return prisma.resource.findMany({
    orderBy: [{ type: "asc" }, { active: "desc" }, { name: "asc" }],
  });
}

export function getResource(id: string) {
  return prisma.resource.findUnique({ where: { id } });
}

export function createResource(data: ResourceFormData) {
  return prisma.resource.create({ data: { ...data, images: [] } });
}

export async function updateResource(id: string, data: ResourceFormData) {
  const { count } = await prisma.resource.updateMany({ where: { id }, data });
  return count === 1;
}

export async function setResourceActive(id: string, active: boolean) {
  const { count } = await prisma.resource.updateMany({
    where: { id },
    data: { active },
  });
  return count === 1;
}

export type DeleteResult =
  | { ok: true; images: string[] }
  | { ok: false; reason: "introuvable" | "reservations" };

/**
 * Suppression définitive, refusée si la ressource figure dans au moins une
 * réservation (section 6.3) : il faut alors la désactiver.
 * La contrainte de clé étrangère (ON DELETE RESTRICT) garantit ce refus même
 * si une réservation est créée entre la vérification et la suppression.
 */
export async function deleteResource(id: string): Promise<DeleteResult> {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { images: true, _count: { select: { items: true } } },
  });
  if (!resource) return { ok: false, reason: "introuvable" };
  if (resource._count.items > 0) return { ok: false, reason: "reservations" };

  try {
    await prisma.resource.delete({ where: { id } });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2003") return { ok: false, reason: "reservations" };
      if (error.code === "P2025") return { ok: false, reason: "introuvable" };
    }
    throw error;
  }
  return { ok: true, images: resource.images };
}

export async function countResourceImages(id: string) {
  const resource = await prisma.resource.findUnique({
    where: { id },
    select: { images: true },
  });
  return resource ? resource.images.length : null;
}

// Les deux fonctions suivantes modifient la liste des photos en une seule
// requête SQL atomique : pas de transaction interactive (plusieurs allers-
// retours vers la base), et aucun risque de dépasser la limite ou de perdre
// une photo lors d'envois simultanés.

/** Ajoute une photo, sauf si la limite est atteinte. */
export async function addResourceImage(id: string, path: string) {
  const updated = await prisma.$executeRaw`
    UPDATE "Resource"
    SET "images" = array_append("images", ${path}), "updatedAt" = now()
    WHERE "id" = ${id}
      AND cardinality("images") < ${MAX_IMAGES_PER_RESOURCE}`;
  return updated === 1;
}

/** Retire une photo de la ressource. Retourne `true` si elle y figurait. */
export async function removeResourceImage(id: string, path: string) {
  const updated = await prisma.$executeRaw`
    UPDATE "Resource"
    SET "images" = array_remove("images", ${path}), "updatedAt" = now()
    WHERE "id" = ${id} AND ${path} = ANY("images")`;
  return updated === 1;
}
