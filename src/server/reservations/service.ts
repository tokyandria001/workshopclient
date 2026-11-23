import "server-only";

import { randomBytes, randomInt } from "node:crypto";

import { Prisma } from "@/generated/prisma/client";
import type { PriceUnit, ResourceType } from "@/generated/prisma/enums";
import { fromDbDate, toDbDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import {
  availableQuantity,
  findUnavailable,
  type ExistingBooking,
  type Period,
} from "@/server/availability/availability";

import { computeQuote } from "./pricing";
import type { ReservationRequest } from "./schema";
import { BLOCKING_STATUSES } from "./status";

type Db = Prisma.TransactionClient | typeof prisma;

/** Réservations bloquantes qui chevauchent la période, pour ces ressources. */
export async function findBlockingBookings(
  db: Db,
  period: Period,
  resourceIds?: string[],
  /** Réservation à ignorer (celle qu'on revérifie lors de l'acceptation). */
  excludeReservationId?: string,
): Promise<ExistingBooking[]> {
  const items = await db.reservationItem.findMany({
    where: {
      ...(resourceIds ? { resourceId: { in: resourceIds } } : {}),
      reservation: {
        ...(excludeReservationId ? { id: { not: excludeReservationId } } : {}),
        status: { in: [...BLOCKING_STATUSES] },
        startDate: { lte: toDbDate(period.end) },
        endDate: { gte: toDbDate(period.start) },
      },
    },
    select: {
      resourceId: true,
      quantity: true,
      reservation: { select: { startDate: true, endDate: true, status: true } },
    },
  });
  return items.map(({ resourceId, quantity, reservation }) => ({
    resourceId,
    quantity,
    status: reservation.status,
    start: fromDbDate(reservation.startDate),
    end: fromDbDate(reservation.endDate),
  }));
}

/** Quantité disponible de chaque ressource active sur la période. */
export async function getAvailability(
  period: Period,
): Promise<Record<string, number>> {
  const [resources, bookings] = await Promise.all([
    prisma.resource.findMany({
      where: { active: true },
      select: { id: true, type: true, quantityTotal: true },
    }),
    findBlockingBookings(prisma, period),
  ]);
  return Object.fromEntries(
    resources.map((r) => [r.id, availableQuantity(r, period, bookings)]),
  );
}

export type CreateResult =
  | { ok: true; accessToken: string; reference: string }
  | {
      ok: false;
      unavailable: { name: string; requested: number; available: number }[];
    };

type LockedResource = {
  id: string;
  type: ResourceType;
  name: string;
  quantityTotal: number;
  active: boolean;
  priceCents: number;
  priceUnit: PriceUnit;
  depositCents: number;
};

/**
 * Crée une demande de réservation (statut EN_ATTENTE) si le stock le permet.
 *
 * Concurrence (section 7.1) : les lignes Resource concernées sont verrouillées
 * (SELECT … FOR UPDATE, triées par id pour éviter les interblocages) avant de
 * vérifier le stock. Deux demandes simultanées sur une même ressource sont donc
 * traitées l'une après l'autre : la seconde voit la première.
 */
export async function createReservationRequest(
  request: ReservationRequest,
): Promise<CreateResult> {
  const period = { start: request.startDate, end: request.endDate };
  const ids = [...new Set(request.items.map((i) => i.resourceId))].sort();

  return prisma.$transaction(
    async (tx) => {
      const locked = await tx.$queryRaw<LockedResource[]>`
        SELECT "id", "type", "name", "quantityTotal", "active",
               "priceCents", "priceUnit", "depositCents"
        FROM "Resource"
        WHERE "id" IN (${Prisma.join(ids)})
        ORDER BY "id"
        FOR UPDATE`;
      const resources = locked.filter((r) => r.active);

      const bookings = await findBlockingBookings(tx, period, ids);
      const problems = findUnavailable(
        request.items,
        resources,
        period,
        bookings,
      );
      if (problems.length > 0) {
        return {
          ok: false,
          unavailable: problems.map((p) => ({
            name:
              locked.find((r) => r.id === p.resourceId)?.name ??
              "Ressource inconnue",
            requested: p.requested,
            available: p.available,
          })),
        };
      }

      // Tarifs relus sous verrou : ceux envoyés par le navigateur sont ignorés.
      const quote = computeQuote(
        period,
        request.items.map(({ resourceId, quantity }) => ({
          resource: resources.find((r) => r.id === resourceId)!,
          quantity,
        })),
      );
      const accessToken = randomBytes(32).toString("base64url");
      const reference = generateReference(request.startDate);

      await tx.reservation.create({
        data: {
          reference,
          accessToken,
          startDate: toDbDate(request.startDate),
          endDate: toDbDate(request.endDate),
          status: "EN_ATTENTE",
          totalCents: quote.totalCents,
          depositCents: quote.depositCents,
          message: request.message,
          termsAcceptedAt: new Date(),
          customer: {
            create: {
              firstName: request.firstName,
              lastName: request.lastName,
              email: request.email,
              phone: request.phone,
              organization: request.organization,
            },
          },
          items: {
            create: quote.lines.map((line) => ({
              resourceId: line.resourceId,
              quantity: line.quantity,
              unitPriceCents: line.unitPriceCents,
              subtotalCents: line.subtotalCents,
            })),
          },
          history: {
            create: {
              fromStatus: null,
              toStatus: "EN_ATTENTE",
              author: "client",
            },
          },
        },
      });
      return { ok: true, accessToken, reference };
    },
    // Base distante (Irlande) via le pooler : marge au-delà des 5 s par défaut,
    // notamment quand une demande attend le verrou d'une autre.
    { maxWait: 10_000, timeout: 20_000 },
  );
}

// Sans caractères ambigus (0/O, 1/I/L) : la référence se lit au téléphone.
const REFERENCE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Référence lisible, ex. « R27-K7MX4P » (année de début + 6 caractères). */
export function generateReference(startDate: string): string {
  const suffix = Array.from(
    { length: 6 },
    () => REFERENCE_ALPHABET[randomInt(REFERENCE_ALPHABET.length)],
  ).join("");
  return `R${startDate.slice(2, 4)}-${suffix}`;
}

const TOKEN_FORMAT = /^[A-Za-z0-9_-]{43}$/;

/** Réservation consultée par le client via son lien de suivi. */
export async function getReservationByToken(token: string) {
  if (!TOKEN_FORMAT.test(token)) return null;
  const reservation = await prisma.reservation.findUnique({
    where: { accessToken: token },
    select: {
      reference: true,
      status: true,
      startDate: true,
      endDate: true,
      totalCents: true,
      depositCents: true,
      createdAt: true,
      customer: { select: { firstName: true } },
      items: {
        select: {
          quantity: true,
          unitPriceCents: true,
          subtotalCents: true,
          resource: { select: { name: true, priceUnit: true } },
        },
      },
    },
  });
  if (!reservation) return null;
  return {
    ...reservation,
    startDate: fromDbDate(reservation.startDate),
    endDate: fromDbDate(reservation.endDate),
  };
}
