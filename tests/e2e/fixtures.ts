// Création directe en base de réservations de test, dans un statut donné.
// Les clients ont un e-mail test-e2e-…@example.com : tout est supprimé par
// global-teardown.ts.

import "dotenv/config";

import { randomBytes, randomUUID } from "node:crypto";

import { Client } from "pg";

import type { ReservationStatus } from "../../src/generated/prisma/enums";

export type TestReservation = {
  id: string;
  email: string;
  reference: string;
  lastName: string;
};

export async function createTestReservation(options: {
  status: ReservationStatus;
  start: string;
  end: string;
  resourceId?: string;
  quantity?: number;
  /** Ajouté au nom du client pour le retrouver par la recherche. */
  label: string;
}): Promise<TestReservation> {
  const db = new Client({ connectionString: process.env.DIRECT_URL });
  await db.connect();
  try {
    const suffix = randomBytes(4).toString("hex");
    const customerId = `e2e-${randomUUID()}`;
    const id = `e2e-${randomUUID()}`;
    const reference = `E2E-${suffix.toUpperCase()}`;
    const lastName = `${options.label} ${suffix}`;
    const email = `test-e2e-${suffix}@example.com`;
    const resourceId = options.resourceId ?? "seed-micro";
    const quantity = options.quantity ?? 1;

    await db.query("BEGIN");
    await db.query(
      `INSERT INTO "Customer" ("id", "firstName", "lastName", "email", "phone")
       VALUES ($1, 'Test', $2, $3, '0600000000')`,
      [customerId, lastName, email],
    );
    await db.query(
      `INSERT INTO "Reservation" ("id", "reference", "accessToken", "customerId",
         "startDate", "endDate", "status", "totalCents", "depositCents",
         "termsAcceptedAt", "updatedAt")
       VALUES ($1, $2, $3, $4, $5, $6, $7, 1500, 10000, now(), now())`,
      [
        id,
        reference,
        randomBytes(32).toString("base64url"),
        customerId,
        options.start,
        options.end,
        options.status,
      ],
    );
    await db.query(
      `INSERT INTO "ReservationItem" ("id", "reservationId", "resourceId",
         "quantity", "unitPriceCents", "subtotalCents")
       VALUES ($1, $2, $3, $4, 1500, 1500)`,
      [`e2e-${randomUUID()}`, id, resourceId, quantity],
    );
    await db.query(
      `INSERT INTO "StatusChange" ("id", "reservationId", "fromStatus",
         "toStatus", "author")
       VALUES ($1, $2, NULL, $3, 'client')`,
      [`e2e-${randomUUID()}`, id, options.status],
    );
    await db.query("COMMIT");
    return { id, email, reference, lastName };
  } catch (error) {
    await db.query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}
