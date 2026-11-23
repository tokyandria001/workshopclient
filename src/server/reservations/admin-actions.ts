"use server";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/server/auth/session";
import {
  sendReservationAccepted,
  sendReservationRefused,
} from "@/server/notifications/reservation-notifications";

import { applyTransition } from "./transition-service";
import { STATUS_LABELS } from "./status";

// Seules les actions de l'administrateur sont acceptées ici ; le paiement et
// l'expiration sont déclenchés par le système (étape 8).
const adminAction = z.enum([
  "accepter",
  "refuser",
  "annuler",
  "sortir",
  "restituer",
]);

export type ReservationActionState = { error?: string; success?: string };

export async function runReservationAction(
  reservationId: string,
  action: string,
  _previous: ReservationActionState,
  formData: FormData,
): Promise<ReservationActionState> {
  const admin = await requireAdmin();

  const parsedAction = adminAction.safeParse(action);
  if (!parsedAction.success) return { error: "Action inconnue." };

  const comment = String(formData.get("comment") ?? "").slice(0, 2000);
  const result = await applyTransition(reservationId, parsedAction.data, {
    actor: "admin",
    author: admin.email,
    comment,
  });
  if (!result.ok) return { error: result.error };

  // Tableau de bord, liste, fiche et planning dépendent du statut.
  // E-mails au client, envoyés après la réponse (section 6.4).
  if (parsedAction.data === "accepter") {
    after(() => sendReservationAccepted(reservationId));
  } else if (parsedAction.data === "refuser") {
    after(() => sendReservationRefused(reservationId, comment.trim()));
  }

  revalidatePath("/admin", "layout");
  return { success: `Statut mis à jour : ${STATUS_LABELS[result.to]}.` };
}
