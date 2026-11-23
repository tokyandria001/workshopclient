import { describe, expect, it } from "vitest";

import type { ReservationStatus } from "@/generated/prisma/enums";
import {
  adminActionsFor,
  checkTransition,
  type Actor,
  type ReservationAction,
} from "@/server/reservations/transitions";

const STATUSES: ReservationStatus[] = [
  "EN_ATTENTE",
  "A_PAYER",
  "EXPIREE",
  "CONFIRMEE",
  "EN_COURS",
  "TERMINEE",
  "REFUSEE",
  "ANNULEE",
];

// Table de la section 7.2 : [depuis, action, acteur] → vers.
const ALLOWED: [
  ReservationStatus,
  ReservationAction,
  Actor,
  ReservationStatus,
][] = [
  ["EN_ATTENTE", "accepter", "admin", "A_PAYER"],
  ["EN_ATTENTE", "refuser", "admin", "REFUSEE"],
  ["EN_ATTENTE", "annuler", "admin", "ANNULEE"],
  ["A_PAYER", "confirmerPaiement", "systeme", "CONFIRMEE"],
  ["A_PAYER", "expirer", "systeme", "EXPIREE"],
  ["A_PAYER", "annuler", "admin", "ANNULEE"],
  ["CONFIRMEE", "sortir", "admin", "EN_COURS"],
  ["CONFIRMEE", "annuler", "admin", "ANNULEE"],
  ["EN_COURS", "restituer", "admin", "TERMINEE"],
];

const ACTIONS: ReservationAction[] = [
  "accepter",
  "refuser",
  "annuler",
  "sortir",
  "restituer",
  "confirmerPaiement",
  "expirer",
];

describe("machine à états (section 7.2)", () => {
  it.each(ALLOWED)("%s --%s (%s)--> %s", (from, action, actor, to) => {
    expect(checkTransition(from, action, actor, "motif")).toEqual({
      ok: true,
      to,
    });
  });

  // Toutes les autres combinaisons statut × action sont refusées.
  const forbidden = STATUSES.flatMap((from) =>
    ACTIONS.filter(
      (action) => !ALLOWED.some(([f, a]) => f === from && a === action),
    ).map((action) => [from, action] as const),
  );

  it("refuse toutes les autres combinaisons", () => {
    expect(forbidden.length).toBe(
      STATUSES.length * ACTIONS.length - ALLOWED.length,
    );
    for (const [from, action] of forbidden) {
      for (const actor of ["admin", "systeme"] as const) {
        expect(checkTransition(from, action, actor, "motif").ok).toBe(false);
      }
    }
  });

  it.each(["TERMINEE", "REFUSEE", "ANNULEE", "EXPIREE"] as const)(
    "%s est un statut final",
    (status) => {
      for (const action of ACTIONS) {
        expect(checkTransition(status, action, "admin", "x").ok).toBe(false);
        expect(checkTransition(status, action, "systeme", "x").ok).toBe(false);
      }
    },
  );

  it("réserve le paiement et l'expiration au système", () => {
    expect(checkTransition("A_PAYER", "confirmerPaiement", "admin").ok).toBe(
      false,
    );
    expect(checkTransition("A_PAYER", "expirer", "admin").ok).toBe(false);
  });

  it("interdit au système les actions de l'administrateur", () => {
    expect(checkTransition("EN_ATTENTE", "accepter", "systeme").ok).toBe(false);
  });

  it.each<[ReservationStatus, ReservationAction]>([
    ["EN_ATTENTE", "refuser"],
    ["CONFIRMEE", "annuler"],
    ["EN_COURS", "restituer"],
  ])("exige un commentaire pour %s → %s", (from, action) => {
    for (const comment of [undefined, null, "", "   "]) {
      const result = checkTransition(from, action, "admin", comment);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error).toContain("obligatoire");
    }
    expect(checkTransition(from, action, "admin", "Motif").ok).toBe(true);
  });

  it("n'exige pas de commentaire pour accepter ou sortir", () => {
    expect(checkTransition("EN_ATTENTE", "accepter", "admin").ok).toBe(true);
    expect(checkTransition("CONFIRMEE", "sortir", "admin").ok).toBe(true);
  });
});

describe("adminActionsFor", () => {
  it.each<[ReservationStatus, ReservationAction[]]>([
    ["EN_ATTENTE", ["accepter", "refuser", "annuler"]],
    ["A_PAYER", ["annuler"]],
    ["CONFIRMEE", ["annuler", "sortir"]],
    ["EN_COURS", ["restituer"]],
    ["TERMINEE", []],
    ["REFUSEE", []],
    ["ANNULEE", []],
    ["EXPIREE", []],
  ])("%s → %j", (status, actions) => {
    expect(adminActionsFor(status).sort()).toEqual([...actions].sort());
  });
});
