import "server-only";

import { Prisma } from "@/generated/prisma/client";
import type { ReservationStatus, ResourceType } from "@/generated/prisma/enums";
import { fromDbDate } from "@/lib/dates";
import { prisma } from "@/lib/prisma";
import { findUnavailable } from "@/server/availability/availability";
import {
  DEFAULT_PAYMENT_DELAY_HOURS,
  getNumberSetting,
  PAYMENT_DELAY_KEY,
} from "@/server/settings/service";

import { findBlockingBookings } from "./service";
import {
  checkTransition,
  type Actor,
  type ReservationAction,
} from "./transitions";

export type TransitionResult =
  | { ok: true; from: ReservationStatus; to: ReservationStatus }
  | { ok: false; error: string };

/**
 * Point d'entrée UNIQUE pour changer le statut d'une réservation (section 9) :
 * vérifie que la transition est autorisée (transitions.ts), applique ses
 * effets et écrit l'historique, dans une seule transaction.
 *
 * La ligne de la réservation est verrouillée (FOR UPDATE) : deux actions
 * simultanées (deux administrateurs, ou un administrateur et le webhook de
 * paiement) sont traitées l'une après l'autre, la seconde voyant le nouveau
 * statut.
 */
export async function applyTransition(
  reservationId: string,
  action: ReservationAction,
  options: { actor: Actor; author: string; comment?: string | null },
): Promise<TransitionResult> {
  const comment = options.comment?.trim() || null;
  const paymentDelayHours =
    action === "accepter"
      ? await getNumberSetting(PAYMENT_DELAY_KEY, DEFAULT_PAYMENT_DELAY_HOURS)
      : 0;

  return prisma.$transaction(
    async (tx) => {
      const [current] = await tx.$queryRaw<
        { status: ReservationStatus; startDate: Date; endDate: Date }[]
      >`
        SELECT "status", "startDate", "endDate" FROM "Reservation"
        WHERE "id" = ${reservationId}
        FOR UPDATE`;
      if (!current) return { ok: false, error: "Réservation introuvable." };

      const check = checkTransition(
        current.status,
        action,
        options.actor,
        comment,
      );
      if (!check.ok) return check;

      const now = new Date();
      const data: Prisma.ReservationUpdateInput = { status: check.to };

      if (action === "accepter") {
        // Revérification du stock (section 7.1) : les ressources ont pu être
        // désactivées ou leur quantité réduite depuis la demande.
        const problem = await recheckAvailability(tx, reservationId, {
          start: fromDbDate(current.startDate),
          end: fromDbDate(current.endDate),
        });
        if (problem) return { ok: false, error: problem };
        data.paymentDueAt = new Date(
          now.getTime() + paymentDelayHours * 60 * 60 * 1000,
        );
      }
      if (action === "sortir") data.checkedOutAt = now;
      if (action === "restituer") data.returnedAt = now;

      await tx.reservation.update({
        where: { id: reservationId },
        data: {
          ...data,
          history: {
            create: {
              fromStatus: current.status,
              toStatus: check.to,
              author: options.author,
              comment,
            },
          },
        },
      });
      return { ok: true, from: current.status, to: check.to };
    },
    { maxWait: 10_000, timeout: 20_000 },
  );
}

/** Retourne un message si le stock ne suffit plus, sinon `null`. */
async function recheckAvailability(
  tx: Prisma.TransactionClient,
  reservationId: string,
  period: { start: string; end: string },
): Promise<string | null> {
  const items = await tx.reservationItem.findMany({
    where: { reservationId },
    select: { resourceId: true, quantity: true },
  });
  const ids = [...new Set(items.map((i) => i.resourceId))].sort();

  // Même verrou que lors de la création d'une demande (triées par id).
  const locked = await tx.$queryRaw<
    {
      id: string;
      type: ResourceType;
      name: string;
      quantityTotal: number;
      active: boolean;
    }[]
  >`
    SELECT "id", "type", "name", "quantityTotal", "active" FROM "Resource"
    WHERE "id" IN (${Prisma.join(ids)})
    ORDER BY "id"
    FOR UPDATE`;

  const bookings = await findBlockingBookings(tx, period, ids, reservationId);
  const problems = findUnavailable(
    items,
    locked.filter((r) => r.active),
    period,
    bookings,
  );
  if (problems.length === 0) return null;

  const details = problems
    .map((p) => {
      const resource = locked.find((r) => r.id === p.resourceId);
      if (!resource?.active)
        return `${resource?.name ?? "Ressource"} est désactivée`;
      return `${resource.name} : ${p.available} disponible(s), ${p.requested} demandé(s)`;
    })
    .join(" ; ");
  return `Stock insuffisant pour accepter cette demande (${details}).`;
}
