// Nettoyage après les tests e2e : supprime les ressources créées par les tests
// (nom « Test e2e … ») et leurs photos, même si un test a échoué en cours de
// route. Ne touche ni aux ressources du seed ni aux ressources réservées.

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

import { RESOURCE_BUCKET } from "../../src/lib/resource-images";

export default async function globalTeardown() {
  if (!process.env.DIRECT_URL) return;

  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  const { rows } = await db
    .query<{ images: string[] }>(
      `DELETE FROM "Resource"
       WHERE "name" LIKE 'Test e2e %' AND "id" NOT LIKE 'seed-%'
         AND NOT EXISTS (
           SELECT 1 FROM "ReservationItem" i WHERE i."resourceId" = "Resource"."id"
         )
       RETURNING "images"`,
    )
    .finally(() => db.end());

  const paths = rows.flatMap((row) => row.images);
  const { STORAGE_URL, STORAGE_KEY } = process.env;
  if (paths.length > 0 && STORAGE_URL && STORAGE_KEY) {
    await createClient(STORAGE_URL, STORAGE_KEY, {
      auth: { persistSession: false },
    })
      .storage.from(RESOURCE_BUCKET)
      .remove(paths);
  }
}
