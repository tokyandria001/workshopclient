"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { isDateOnly, todayInParis } from "@/lib/dates";

import { validatePeriod } from "./rules";
import { readReservationForm, reservationRequestSchema } from "./schema";
import { createReservationRequest, getAvailability } from "./service";

// Actions publiques (sans connexion) : toute donnée reçue est revalidée ici.

export type AvailabilityResult =
  | { ok: true; availability: Record<string, number> }
  | { ok: false; error: string };

/** Disponibilités de toutes les ressources actives sur une période. */
export async function checkAvailability(
  startDate: string,
  endDate: string,
): Promise<AvailabilityResult> {
  if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
    return { ok: false, error: "Dates invalides." };
  }
  const error = validatePeriod(startDate, endDate, todayInParis());
  if (error) return { ok: false, error };
  return {
    ok: true,
    availability: await getAvailability({ start: startDate, end: endDate }),
  };
}

export type ReservationFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  /** Disponibilités à jour, renvoyées si le stock a changé entre-temps. */
  availability?: Record<string, number>;
};

export async function submitReservation(
  _previous: ReservationFormState,
  formData: FormData,
): Promise<ReservationFormState> {
  const { isBot, ...raw } = readReservationForm(formData);
  // Robot détecté : réponse neutre, rien n'est enregistré.
  if (isBot) return { error: "La demande n'a pas pu être envoyée." };

  const parsed = reservationRequestSchema(todayInParis()).safeParse(raw);
  if (!parsed.success) {
    return {
      error: "Certaines informations sont manquantes ou incorrectes.",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const result = await createReservationRequest(parsed.data);
  if (!result.ok) {
    const details = result.unavailable
      .map((u) =>
        u.available === 0
          ? `${u.name} n'est plus disponible sur ces dates`
          : `${u.name} : ${u.available} disponible(s) sur ces dates, ${u.requested} demandé(s)`,
      )
      .join(" ; ");
    return {
      error: `Le stock a changé : ${details}. Ajustez votre demande.`,
      availability: await getAvailability({
        start: parsed.data.startDate,
        end: parsed.data.endDate,
      }),
    };
  }

  redirect(`/suivi/${result.accessToken}?nouvelle=1`);
}
