// Test d'intégration (vraie base) : transitions de statut appliquées et
// contrôlées côté serveur par applyTransition (étape 6).

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ReservationStatus } from "@/generated/prisma/enums";
import { addDays, toDbDate, todayInParis } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { applyTransition } from "@/server/reservations/transition-service";

const runId = Date.now();
const email = `test-e2e-transitions-${runId}@example.com`;
const author = "admin-test@example.com";
let resourceId: string;
let customerId: string;
let counter = 0;

const start = addDays(todayInParis(), 420);
const end = addDays(start, 1);

/** Crée directement en base une réservation dans le statut voulu. */
async function createReservation(
  status: ReservationStatus,
  quantity = 1,
  period = { start, end },
) {
  counter += 1;
  return prisma.reservation.create({
    data: {
      reference: `T${runId}-${counter}`.slice(0, 20),
      accessToken: `tok-${runId}-${counter}`,
      customerId,
      startDate: toDbDate(period.start),
      endDate: toDbDate(period.end),
      status,
      totalCents: 1000,
      depositCents: 0,
      termsAcceptedAt: new Date(),
      items: {
        create: {
          resourceId,
          quantity,
          unitPriceCents: 500,
          subtotalCents: 1000,
        },
      },
    },
  });
}

const admin = { actor: "admin" as const, author };

beforeAll(async () => {
  const resource = await prisma.resource.create({
    data: {
      type: "MATERIEL",
      name: `Test e2e transitions ${runId}`,
      description: "Ressource de test (transitions).",
      priceCents: 500,
      priceUnit: "JOUR",
      quantityTotal: 2,
    },
  });
  resourceId = resource.id;
  const customer = await prisma.customer.create({
    data: {
      firstName: "Test",
      lastName: "Transitions",
      email,
      phone: "0600000000",
    },
  });
  customerId = customer.id;
});

afterAll(async () => {
  await prisma.reservation.deleteMany({ where: { customerId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.resource.deleteMany({ where: { id: resourceId } });
  await prisma.$disconnect();
});

describe("applyTransition", () => {
  it("accepte une demande : A_PAYER, délai de paiement et historique", async () => {
    const reservation = await createReservation("EN_ATTENTE");
    const before = Date.now();

    const result = await applyTransition(reservation.id, "accepter", admin);
    expect(result).toEqual({ ok: true, from: "EN_ATTENTE", to: "A_PAYER" });

    const saved = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
      include: { history: true },
    });
    expect(saved.status).toBe("A_PAYER");
    // Délai par défaut (paramètre du seed) : 72 h.
    const delayHours = (saved.paymentDueAt!.getTime() - before) / 3_600_000;
    expect(delayHours).toBeGreaterThan(71.9);
    expect(delayHours).toBeLessThan(72.1);
    expect(saved.history).toMatchObject([
      { fromStatus: "EN_ATTENTE", toStatus: "A_PAYER", author, comment: null },
    ]);
  });

  it("refuse une transition interdite sans rien modifier", async () => {
    const reservation = await createReservation("EN_ATTENTE");
    const result = await applyTransition(reservation.id, "sortir", admin);
    expect(result.ok).toBe(false);

    const saved = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
      include: { history: true },
    });
    expect(saved.status).toBe("EN_ATTENTE");
    expect(saved.history).toHaveLength(0);
  });

  it("refuse une action système demandée par un administrateur", async () => {
    const reservation = await createReservation("A_PAYER");
    const result = await applyTransition(
      reservation.id,
      "confirmerPaiement",
      admin,
    );
    expect(result.ok).toBe(false);
  });

  it("exige un motif pour refuser, puis l'enregistre", async () => {
    const reservation = await createReservation("EN_ATTENTE");
    expect(
      (
        await applyTransition(reservation.id, "refuser", {
          ...admin,
          comment: " ",
        })
      ).ok,
    ).toBe(false);

    const result = await applyTransition(reservation.id, "refuser", {
      ...admin,
      comment: "  Dates indisponibles  ",
    });
    expect(result.ok).toBe(true);
    const history = await prisma.statusChange.findMany({
      where: { reservationId: reservation.id },
    });
    expect(history).toMatchObject([
      { toStatus: "REFUSEE", comment: "Dates indisponibles" },
    ]);
  });

  it("enregistre la sortie puis la restitution du matériel", async () => {
    const reservation = await createReservation("CONFIRMEE");
    expect((await applyTransition(reservation.id, "sortir", admin)).ok).toBe(
      true,
    );
    expect(
      (
        await applyTransition(reservation.id, "restituer", {
          ...admin,
          comment: "Rendu en bon état",
        })
      ).ok,
    ).toBe(true);

    const saved = await prisma.reservation.findUniqueOrThrow({
      where: { id: reservation.id },
      include: { history: { orderBy: { createdAt: "asc" } } },
    });
    expect(saved.status).toBe("TERMINEE");
    expect(saved.checkedOutAt).not.toBeNull();
    expect(saved.returnedAt).not.toBeNull();
    expect(saved.history.map((h) => h.toStatus)).toEqual([
      "EN_COURS",
      "TERMINEE",
    ]);
  });

  it("revérifie le stock à l'acceptation", async () => {
    // Autre période : 2 unités déjà confirmées, puis une demande de 1 unité
    // créée « en trop » (stock réduit entre-temps, par exemple).
    const period = { start: addDays(end, 10), end: addDays(end, 11) };
    await createReservation("CONFIRMEE", 2, period);
    const extra = await createReservation("EN_ATTENTE", 1, period);

    const result = await applyTransition(extra.id, "accepter", admin);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Stock insuffisant");
    expect(
      (await prisma.reservation.findUniqueOrThrow({ where: { id: extra.id } }))
        .status,
    ).toBe("EN_ATTENTE");
  });

  it("ne compte pas la demande elle-même lors de la revérification", async () => {
    // 2 unités demandées sur 2 : la demande ne doit pas se bloquer elle-même.
    const period = { start: addDays(end, 20), end: addDays(end, 20) };
    const reservation = await createReservation("EN_ATTENTE", 2, period);
    expect((await applyTransition(reservation.id, "accepter", admin)).ok).toBe(
      true,
    );
  });

  it("refuse d'accepter si la ressource a été désactivée", async () => {
    const period = { start: addDays(end, 30), end: addDays(end, 30) };
    const reservation = await createReservation("EN_ATTENTE", 1, period);
    await prisma.resource.update({
      where: { id: resourceId },
      data: { active: false },
    });
    try {
      const result = await applyTransition(reservation.id, "accepter", admin);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("désactivée");
    } finally {
      await prisma.resource.update({
        where: { id: resourceId },
        data: { active: true },
      });
    }
  });

  it("traite deux actions simultanées l'une après l'autre", async () => {
    // Un administrateur accepte pendant qu'un autre refuse : une seule gagne.
    const reservation = await createReservation("EN_ATTENTE", 1, {
      start: addDays(end, 40),
      end: addDays(end, 40),
    });
    const results = await Promise.all([
      applyTransition(reservation.id, "accepter", admin),
      applyTransition(reservation.id, "refuser", { ...admin, comment: "Non" }),
    ]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const history = await prisma.statusChange.count({
      where: { reservationId: reservation.id },
    });
    expect(history).toBe(1);
  });

  it("indique une réservation introuvable", async () => {
    expect(await applyTransition("inexistante", "accepter", admin)).toEqual({
      ok: false,
      error: "Réservation introuvable.",
    });
  });
});
