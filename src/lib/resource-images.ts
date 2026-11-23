// Fonctions pures autour des photos des ressources (sans accès au stockage),
// utilisables aussi bien par le back-office que par le site public.

export const RESOURCE_BUCKET = "ressources";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_IMAGES_PER_RESOURCE = 8;
export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

export type AllowedImageType = keyof typeof ALLOWED_IMAGE_TYPES;

export function isAllowedImageType(type: string): type is AllowedImageType {
  return Object.hasOwn(ALLOWED_IMAGE_TYPES, type);
}

/**
 * URL publique d'une photo. La base ne stocke que le chemin dans le bucket :
 * l'URL reste correcte si le projet de stockage change (dev → production).
 */
export function resourceImageUrl(path: string): string {
  const base = process.env.STORAGE_URL?.replace(/\/+$/, "") ?? "";
  return `${base}/storage/v1/object/public/${RESOURCE_BUCKET}/${path}`;
}
