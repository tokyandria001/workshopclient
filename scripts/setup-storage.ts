// Crée (ou met à jour) les buckets de stockage Supabase : `npm run storage:setup`.
// Idempotent : peut être relancé sans risque, en développement comme en production.

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";

import {
  ALLOWED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
  RESOURCE_BUCKET,
} from "../src/lib/resource-images";

const url = process.env.STORAGE_URL;
const key = process.env.STORAGE_KEY;
if (!url || !key) {
  console.error(
    "STORAGE_URL et STORAGE_KEY doivent être renseignées dans .env",
  );
  process.exit(1);
}

const storage = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
}).storage;

// Photos des ressources : bucket public (affichées sur le catalogue).
// Les contrats et reçus PDF (étape 9) iront dans un bucket privé distinct.
const options = {
  public: true,
  fileSizeLimit: MAX_IMAGE_BYTES,
  allowedMimeTypes: Object.keys(ALLOWED_IMAGE_TYPES),
};

async function main() {
  const { data: existing } = await storage.getBucket(RESOURCE_BUCKET);
  const { error } = existing
    ? await storage.updateBucket(RESOURCE_BUCKET, options)
    : await storage.createBucket(RESOURCE_BUCKET, options);
  if (error) throw error;
  console.log(
    `✓ Bucket « ${RESOURCE_BUCKET} » ${existing ? "mis à jour" : "créé"} (public, 4 Mo max, JPEG/PNG/WebP)`,
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
