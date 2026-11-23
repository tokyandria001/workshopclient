import "server-only";

import { randomUUID } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import {
  ALLOWED_IMAGE_TYPES,
  RESOURCE_BUCKET,
  type AllowedImageType,
} from "@/lib/resource-images";

let client: SupabaseClient | undefined;

/**
 * Client Supabase limité au stockage, avec la clé secrète : serveur uniquement.
 * L'application n'utilise ni l'authentification ni la Data API de Supabase.
 */
function storage() {
  if (!client) {
    const url = process.env.STORAGE_URL;
    const key = process.env.STORAGE_KEY;
    if (!url || !key) {
      throw new Error(
        "Les variables STORAGE_URL et STORAGE_KEY sont nécessaires pour gérer les photos.",
      );
    }
    client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return client.storage;
}

/** Envoie une photo et retourne son chemin dans le bucket. */
export async function uploadResourceImage(
  resourceId: string,
  file: File & { type: AllowedImageType },
): Promise<string> {
  const path = `${resourceId}/${randomUUID()}.${ALLOWED_IMAGE_TYPES[file.type]}`;
  const { error } = await storage()
    .from(RESOURCE_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw new Error(`Échec de l'envoi de la photo : ${error.message}`);
  return path;
}

export async function deleteResourceImages(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await storage().from(RESOURCE_BUCKET).remove(paths);
  if (error) {
    throw new Error(`Échec de la suppression des photos : ${error.message}`);
  }
}
