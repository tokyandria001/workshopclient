import {
  addDays,
  compareDates,
  daysInclusive,
  type DateOnly,
} from "@/lib/dates";

// Limites des demandes de réservation (à valider avec la cliente).
/** Durée maximale d'une réservation, en jours. */
export const MAX_RESERVATION_DAYS = 31;
/** Délai maximal entre aujourd'hui et le début de la réservation (≈ 18 mois). */
export const BOOKING_HORIZON_DAYS = 548;
/** Quantité maximale par ligne (garde-fou contre les saisies aberrantes). */
export const MAX_QUANTITY_PER_LINE = 1000;

/**
 * Vérifie une période demandée. Retourne un message d'erreur en français,
 * ou `null` si la période est valide.
 */
export function validatePeriod(
  start: DateOnly,
  end: DateOnly,
  today: DateOnly,
): string | null {
  if (compareDates(start, today) < 0) {
    return "La date de début ne peut pas être dans le passé.";
  }
  if (compareDates(end, start) < 0) {
    return "La date de fin doit être postérieure ou égale à la date de début.";
  }
  if (daysInclusive(start, end) > MAX_RESERVATION_DAYS) {
    return `Une réservation ne peut pas dépasser ${MAX_RESERVATION_DAYS} jours.`;
  }
  if (compareDates(start, addDays(today, BOOKING_HORIZON_DAYS)) > 0) {
    return "Les réservations sont ouvertes jusqu'à 18 mois à l'avance.";
  }
  return null;
}
