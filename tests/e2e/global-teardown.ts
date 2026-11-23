// Nettoyage après les tests e2e, même si un test a échoué en cours de route :
// - demandes de réservation des clients de test (test-e2e-…@example.com) ;
// - ressources créées par les tests (nom « Test e2e … ») et leurs photos.
// Ne touche ni aux données du seed ni aux réservations réelles.

import "dotenv/config";

import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

import { RESOURCE_BUCKET } from "../../src/lib/resource-images";

const TEST_EMAILS = "test-e2e-%@example.com";

export default async function globalTeardown() {
  if (!process.env.DIRECT_URL) return;

  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  let images: string[] = [];
  try {
    // Les lignes et l'historique sont supprimés en cascade.
    await db.query(
      `DELETE FROM "Reservation" WHERE "customerId" IN (
         SELECT "id" FROM "Customer" WHERE "email" LIKE $1)`,
      [TEST_EMAILS],
    );
    await db.query(`DELETE FROM "Customer" WHERE "email" LIKE $1`, [
      TEST_EMAILS,
    ]);
    const { rows } = await db.query<{ images: string[] }>(
      `DELETE FROM "Resource"
       WHERE "name" LIKE 'Test e2e %' AND "id" NOT LIKE 'seed-%'
         AND NOT EXISTS (
           SELECT 1 FROM "ReservationItem" i WHERE i."resourceId" = "Resource"."id"
         )
       RETURNING "images"`,
    );
    images = rows.flatMap((row) => row.images);
  } finally {
    await db.end();
  }

  const { STORAGE_URL, STORAGE_KEY } = process.env;
  if (images.length > 0 && STORAGE_URL && STORAGE_KEY) {
    await createClient(STORAGE_URL, STORAGE_KEY, {
      auth: { persistSession: false },
    })
      .storage.from(RESOURCE_BUCKET)
      .remove(images);
  }
}
