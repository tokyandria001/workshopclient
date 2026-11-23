// Machine à états des réservations (section 7.2). Fonctions pures : c'est la
// seule source de vérité sur les transitions autorisées, utilisée à la fois
// par le serveur (contrôle) et par le back-office (boutons affichés).

import type { ReservationStatus } from "@/generated/prisma/enums";

export type Actor = "admin" | "systeme";

/** Actions déclenchables sur une réservation. */
export type ReservationAction =
  | "accepter"
  | "refuser"
  | "annuler"
  | "sortir"
  | "restituer"
  | "confirmerPaiement"
  | "expirer";

type TransitionRule = {
  from: readonly ReservationStatus[];
  to: ReservationStatus;
  actor: Actor;
  /** Commentaire obligatoire (motif, remarque sur l'état du matériel). */
  requiresComment: boolean;
};

export const TRANSITIONS: Record<ReservationAction, TransitionRule> = {
  accepter: {
    from: ["EN_ATTENTE"],
    to: "A_PAYER",
    actor: "admin",
    requiresComment: false,
  },
  refuser: {
    from: ["EN_ATTENTE"],
    to: "REFUSEE",
    actor: "admin",
    requiresComment: true,
  },
  annuler: {
    from: ["EN_ATTENTE", "A_PAYER", "CONFIRMEE"],
    to: "ANNULEE",
    actor: "admin",
    requiresComment: true,
  },
  sortir: {
    from: ["CONFIRMEE"],
    to: "EN_COURS",
    actor: "admin",
    requiresComment: false,
  },
  restituer: {
    from: ["EN_COURS"],
    to: "TERMINEE",
    actor: "admin",
    requiresComment: true,
  },
  confirmerPaiement: {
    from: ["A_PAYER"],
    to: "CONFIRMEE",
    actor: "systeme",
    requiresComment: false,
  },
  expirer: {
    from: ["A_PAYER"],
    to: "EXPIREE",
    actor: "systeme",
    requiresComment: false,
  },
};

export const ACTION_LABELS: Record<ReservationAction, string> = {
  accepter: "Accepter",
  refuser: "Refuser",
  annuler: "Annuler",
  sortir: "Marquer comme sorti",
  restituer: "Marquer comme restitué",
  confirmerPaiement: "Confirmer le paiement",
  expirer: "Expirer",
};

/** Libellé du commentaire demandé pour une action. */
export const COMMENT_LABELS: Partial<Record<ReservationAction, string>> = {
  refuser: "Motif du refus",
  annuler: "Motif de l'annulation",
  restituer: "Remarque sur l'état du matériel",
};

export type TransitionCheck =
  { ok: true; to: ReservationStatus } | { ok: false; error: string };

/**
 * Vérifie qu'une action est permise depuis un statut, pour un acteur donné,
 * avec le commentaire fourni.
 */
export function checkTransition(
  current: ReservationStatus,
  action: ReservationAction,
  actor: Actor,
  comment?: string | null,
): TransitionCheck {
  const rule = TRANSITIONS[action];
  if (rule.actor !== actor) {
    return { ok: false, error: "Cette action est réservée au système." };
  }
  if (!rule.from.includes(current)) {
    return {
      ok: false,
      error: `Action « ${ACTION_LABELS[action]} » impossible pour une réservation dans ce statut.`,
    };
  }
  if (rule.requiresComment && !comment?.trim()) {
    return {
      ok: false,
      error: `${COMMENT_LABELS[action] ?? "Le commentaire"} est obligatoire.`,
    };
  }
  return { ok: true, to: rule.to };
}

/** Actions de l'administrateur proposées pour un statut. */
export function adminActionsFor(
  status: ReservationStatus,
): ReservationAction[] {
  return (Object.keys(TRANSITIONS) as ReservationAction[]).filter(
    (action) =>
      TRANSITIONS[action].actor === "admin" &&
      TRANSITIONS[action].from.includes(status),
  );
}
