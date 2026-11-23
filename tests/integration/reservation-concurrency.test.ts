// Test d'intégration (vraie base de données) : impossible de réserver au-delà
// du stock, même avec plusieurs demandes envoyées au même instant (étape 5).

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { addDays, todayInParis } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import type { ReservationRequest } from "@/server/reservations/schema";
import {
  createReservationRequest,
  getAvailability,
} from "@/server/reservations/service";

const runId = Date.now();
const email = `test-e2e-${runId}@example.com`;
let resourceId: string;

// Dates lointaines : aucune réservation réelle ne peut interférer.
const start = addDays(todayInParis(), 400);
const end = addDays(start, 2);

function request(
  quantity: number,
  period = { startDate: start, endDate: end },
): ReservationRequest {
  return {
    ...period,
    items: [{ resourceId, quantity }],
    firstName: "Test",
    lastName: "Intégration",
    email,
    phone: "0600000000",
    termsAccepted: true,
  };
}

beforeAll(async () => {
  const resource = await prisma.resource.create({
    data: {
      type: "MATERIEL",
      name: `Test e2e intégration ${runId}`,
      description: "Ressource de test (concurrence).",
      priceCents: 1000,
      priceUnit: "JOUR",
      quantityTotal: 2,
    },
  });
  resourceId = resource.id;
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { customer: { email } } });
  await prisma.customer.deleteMany({ where: { email } });
  await prisma.resource.deleteMany({ where: { id: resourceId } });
  await prisma.$disconnect();
});

describe("création d'une demande de réservation", () => {
  it("enregistre la demande, ses lignes, ses montants et son historique", async () => {
    const result = await createReservationRequest(request(1));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const saved = await prisma.reservation.findUniqueOrThrow({
      where: { accessToken: result.accessToken },
      include: { items: true, history: true, customer: true },
    });
    expect(saved.status).toBe("EN_ATTENTE");
    expect(saved.reference).toMatch(/^R\d{2}-[A-Z2-9]{6}$/);
    expect(saved.totalCents).toBe(3000); // 10 € × 1 × 3 jours
    expect(saved.items).toHaveLength(1);
    expect(saved.history).toMatchObject([
      { fromStatus: null, toStatus: "EN_ATTENTE", author: "client" },
    ]);
    expect(saved.customer.email).toBe(email);

    // Il reste 1 unité sur 2.
    expect((await getAvailability({ start, end }))[resourceId]).toBe(1);
  });

  it("refuse une demande au-delà du stock restant", async () => {
    const result = await createReservationRequest(request(2));
    expect(result).toEqual({
      ok: false,
      unavailable: [
        { name: `Test e2e intégration ${runId}`, requested: 2, available: 1 },
      ],
    });
  });

  it("n'accepte qu'une seule demande parmi 5 envoyées simultanément", async () => {
    // Il reste 1 unité : 5 demandes de 1 unité partent en même temps.
    const results = await Promise.all(
      Array.from({ length: 5 }, () => createReservationRequest(request(1))),
    );
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok)).toHaveLength(4);

    // Le stock n'est jamais dépassé.
    expect((await getAvailability({ start, end }))[resourceId]).toBe(0);
    const reserved = await prisma.reservationItem.aggregate({
      where: { resourceId },
      _sum: { quantity: true },
    });
    expect(reserved._sum.quantity).toBe(2);
  });

  it("accepte une période qui ne chevauche pas", async () => {
    const later = { startDate: addDays(end, 1), endDate: addDays(end, 1) };
    const result = await createReservationRequest(request(2, later));
    expect(result.ok).toBe(true);
  });

  it("refuse une ressource inactive", async () => {
    await prisma.resource.update({
      where: { id: resourceId },
      data: { active: false },
    });
    const far = { startDate: addDays(end, 10), endDate: addDays(end, 10) };
    const result = await createReservationRequest(request(1, far));
    expect(result.ok).toBe(false);
  });
});
