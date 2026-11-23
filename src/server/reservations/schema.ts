import { z } from "zod";

import { isDateOnly, type DateOnly } from "@/lib/dates";

import { MAX_QUANTITY_PER_LINE, validatePeriod } from "./rules";

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} ne doit pas dépasser ${max} caractères.`)
    .transform((value) => (value === "" ? undefined : value))
    .optional();

const dateField = (label: string) =>
  z
    .string(`${label} est obligatoire.`)
    .refine((value) => value !== "", `${label} est obligatoire.`)
    .refine(isDateOnly, `${label} n'est pas valide.`);

/** Schéma d'une demande de réservation. `today` : date du jour à Paris. */
export function reservationRequestSchema(today: DateOnly) {
  return z
    .object({
      startDate: dateField("La date de début"),
      endDate: dateField("La date de fin"),
      items: z
        .array(
          z.object({
            resourceId: z.string().min(1),
            quantity: z
              .number()
              .int("La quantité doit être un nombre entier.")
              .min(1)
              .max(MAX_QUANTITY_PER_LINE),
          }),
        )
        .min(1, "Choisissez au moins une ressource.")
        .refine(
          (items) =>
            new Set(items.map((i) => i.resourceId)).size === items.length,
          "Une ressource ne peut apparaître qu'une fois.",
        ),
      firstName: z
        .string("Le prénom est obligatoire.")
        .trim()
        .min(1, "Le prénom est obligatoire.")
        .max(100, "Le prénom ne doit pas dépasser 100 caractères."),
      lastName: z
        .string("Le nom est obligatoire.")
        .trim()
        .min(1, "Le nom est obligatoire.")
        .max(100, "Le nom ne doit pas dépasser 100 caractères."),
      email: z
        .string("L'adresse e-mail est obligatoire.")
        .trim()
        .toLowerCase()
        .pipe(z.email("Adresse e-mail invalide.")),
      phone: z
        .string("Le téléphone est obligatoire.")
        .trim()
        .regex(
          /^\+?[0-9 .()-]+$/,
          "Numéro de téléphone invalide (chiffres, espaces, +, points et tirets).",
        )
        .refine((phone) => {
          const digits = phone.replace(/\D/g, "").length;
          return digits >= 10 && digits <= 15;
        }, "Le numéro doit contenir entre 10 et 15 chiffres."),
      organization: optionalText(150, "L'organisation"),
      message: optionalText(2000, "Le message"),
      termsAccepted: z.literal(true, {
        error: "Vous devez accepter les conditions générales de location.",
      }),
    })
    .superRefine((data, ctx) => {
      // Contrôles de période, une fois les deux dates valides.
      if (!isDateOnly(data.startDate) || !isDateOnly(data.endDate)) return;
      const error = validatePeriod(data.startDate, data.endDate, today);
      if (error)
        ctx.addIssue({ code: "custom", path: ["endDate"], message: error });
    });
}

export type ReservationRequest = z.infer<
  ReturnType<typeof reservationRequestSchema>
>;

/** Champ du formulaire pour la quantité d'une ressource : quantite[<id>]. */
export const quantityFieldName = (resourceId: string) =>
  `quantite[${resourceId}]`;
const QUANTITY_FIELD = /^quantite\[(.+)\]$/;

/** Champ piège invisible : rempli uniquement par les robots. */
export const HONEYPOT_FIELD = "site_web";

/** Lit le formulaire brut (sans valider). Les quantités nulles sont ignorées. */
export function readReservationForm(formData: FormData) {
  const text = (key: string) => String(formData.get(key) ?? "");
  const items: { resourceId: string; quantity: number }[] = [];
  for (const [key, value] of formData.entries()) {
    const match = QUANTITY_FIELD.exec(key);
    if (!match || typeof value !== "string" || value.trim() === "") continue;
    const quantity = Number(value);
    if (quantity !== 0) items.push({ resourceId: match[1], quantity });
  }
  return {
    startDate: text("startDate"),
    endDate: text("endDate"),
    items,
    firstName: text("firstName"),
    lastName: text("lastName"),
    email: text("email"),
    phone: text("phone"),
    organization: text("organization"),
    message: text("message"),
    termsAccepted: formData.get("termsAccepted") === "on",
    isBot: text(HONEYPOT_FIELD) !== "",
  };
}
