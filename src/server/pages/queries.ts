import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { prisma } from "@/lib/prisma";

/** Étiquette de cache des pages de contenu (à vider lors de leur modification). */
export const PAGES_TAG = "pages";

/** Page de contenu (mentions légales, CGL…) par son identifiant d'URL. */
export async function getPage(slug: string) {
  "use cache";
  cacheTag(PAGES_TAG);
  cacheLife("hours");
  return prisma.page.findUnique({
    where: { slug },
    select: { title: true, content: true },
  });
}
