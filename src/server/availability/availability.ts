// Calcul des disponibilités (section 7.1). Fonctions pures, sans accès à la
// base : le service leur fournit les réservations existantes.

import type { ReservationStatus, ResourceType } from "@/generated/prisma/enums";
import { daysInclusive, type DateOnly } from "@/lib/dates";
import { isBlockingStatus } from "@/server/reservations/status";

export type Period = { start: DateOnly; end: DateOnly };

export type StockResource = {
  id: string;
  type: ResourceType;
  quantityTotal: number;
};

export type ExistingBooking = Period & {
  resourceId: string;
  quantity: number;
  status: ReservationStatus;
};

/** Chevauchement de deux périodes, bornes incluses (section 7.1). */
export function periodsOverlap(a: Period, b: Period): boolean {
  return a.start <= b.end && b.start <= a.end;
}

/**
 * Plus forte quantité réservée un même jour de la période : pour chaque jour,
 * on additionne les réservations bloquantes qui couvrent ce jour, et on garde
 * le maximum (le « pic journalier »).
 */
export function peakReservedQuantity(
  period: Period,
  bookings: readonly ExistingBooking[],
): number {
  const length = daysInclusive(period.start, period.end);
  const perDay = new Array<number>(length).fill(0);

  for (const booking of bookings) {
    if (!isBlockingStatus(booking.status)) continue;
    if (!periodsOverlap(period, booking)) continue;
    // Partie de la réservation comprise dans la période demandée.
    const from = booking.start > period.start ? booking.start : period.start;
    const to = booking.end < period.end ? booking.end : period.end;
    const first = daysInclusive(period.start, from) - 1;
    const last = daysInclusive(period.start, to) - 1;
    for (let day = first; day <= last; day++) perDay[day] += booking.quantity;
  }
  return Math.max(0, ...perDay);
}

/**
 * Quantité encore disponible d'une ressource sur la période.
 * Salle : 1 si aucune réservation bloquante ne chevauche la période, sinon 0.
 */
export function availableQuantity(
  resource: StockResource,
  period: Period,
  bookings: readonly ExistingBooking[],
): number {
  const own = bookings.filter((b) => b.resourceId === resource.id);
  const peak = peakReservedQuantity(period, own);
  if (resource.type === "SALLE") return peak > 0 ? 0 : 1;
  return Math.max(0, resource.quantityTotal - peak);
}

export type AvailabilityProblem = {
  resourceId: string;
  requested: number;
  available: number;
};

/**
 * Vérifie qu'une demande tient dans le stock. Retourne la liste des
 * ressources en défaut (vide si tout est disponible).
 */
export function findUnavailable(
  requested: readonly { resourceId: string; quantity: number }[],
  resources: readonly StockResource[],
  period: Period,
  bookings: readonly ExistingBooking[],
): AvailabilityProblem[] {
  return requested.flatMap(({ resourceId, quantity }) => {
    const resource = resources.find((r) => r.id === resourceId);
    const available = resource
      ? availableQuantity(resource, period, bookings)
      : 0;
    return quantity > available
      ? [{ resourceId, requested: quantity, available }]
      : [];
  });
}
