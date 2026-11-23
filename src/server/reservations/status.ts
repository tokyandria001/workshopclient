import type { ReservationStatus } from "@/generated/prisma/enums";

/** Statuts qui immobilisent du stock (section 7.1). */
export const BLOCKING_STATUSES = [
  "EN_ATTENTE",
  "A_PAYER",
  "CONFIRMEE",
  "EN_COURS",
] as const satisfies readonly ReservationStatus[];

export function isBlockingStatus(status: ReservationStatus): boolean {
  return (BLOCKING_STATUSES as readonly ReservationStatus[]).includes(status);
}

/** Libellés courts (listes, badges du back-office). */
export const STATUS_SHORT_LABELS: Record<ReservationStatus, string> = {
  EN_ATTENTE: "En attente",
  A_PAYER: "À payer",
  EXPIREE: "Expirée",
  CONFIRMEE: "Confirmée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};

export const ALL_STATUSES = Object.keys(
  STATUS_SHORT_LABELS,
) as ReservationStatus[];

export const STATUS_LABELS: Record<ReservationStatus, string> = {
  EN_ATTENTE: "Demande en attente de validation",
  A_PAYER: "Acceptée – en attente de paiement",
  EXPIREE: "Expirée (paiement non reçu dans le délai)",
  CONFIRMEE: "Confirmée",
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  REFUSEE: "Refusée",
  ANNULEE: "Annulée",
};
