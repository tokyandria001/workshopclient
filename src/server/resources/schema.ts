import { z } from "zod";

import type { PriceUnit, ResourceType } from "@/generated/prisma/enums";
import { parseEurosToCents } from "@/lib/money";
import {
  ALLOWED_IMAGE_TYPES,
  isAllowedImageType,
  MAX_IMAGE_BYTES,
  type AllowedImageType,
} from "@/lib/resource-images";

export const RESOURCE_TYPE_LABELS: Record<ResourceType, string> = {
  SALLE: "Salle",
  MATERIEL: "Matériel",
};

export const PRICE_UNIT_LABELS: Record<PriceUnit, string> = {
  JOUR: "par jour",
  FORFAIT: "forfait",
};

function eurosField(label: string) {
  return z
    .string(`${label} est obligatoire.`)
    .trim()
    .min(1, `${label} est obligatoire.`)
    .transform((value, ctx) => {
      const cents = parseEurosToCents(value);
      if (cents === null) {
        ctx.addIssue({
          code: "custom",
          message: `${label} : montant invalide (exemples : 120 ou 49,90).`,
        });
        return z.NEVER;
      }
      return cents;
    });
}

export const resourceFormSchema = z
  .object({
    type: z.enum(["SALLE", "MATERIEL"], "Choisissez un type."),
    name: z
      .string("Le nom est obligatoire.")
      .trim()
      .min(2, "Le nom doit contenir au moins 2 caractères.")
      .max(100, "Le nom ne doit pas dépasser 100 caractères."),
    description: z
      .string("La description est obligatoire.")
      .trim()
      .min(1, "La description est obligatoire.")
      .max(5000, "La description ne doit pas dépasser 5 000 caractères."),
    priceCents: eurosField("Le tarif"),
    priceUnit: z.enum(["JOUR", "FORFAIT"], "Choisissez une unité de tarif."),
    depositCents: eurosField("La caution"),
    quantityTotal: z.coerce
      .number("La quantité doit être un nombre.")
      .int("La quantité doit être un nombre entier.")
      .min(1, "La quantité doit être d'au moins 1.")
      .max(10_000, "La quantité ne doit pas dépasser 10 000."),
    active: z.boolean(),
  })
  .refine((data) => data.type !== "SALLE" || data.quantityTotal === 1, {
    path: ["quantityTotal"],
    message: "La salle se réserve toujours en quantité 1.",
  });

export type ResourceFormData = z.infer<typeof resourceFormSchema>;
export type ResourceFormField = keyof z.input<typeof resourceFormSchema>;

/** Valeurs brutes du formulaire, renvoyées pour pré-remplir en cas d'erreur. */
export type ResourceFormValues = {
  type: string;
  name: string;
  description: string;
  price: string;
  priceUnit: string;
  deposit: string;
  quantityTotal: string;
  active: boolean;
};

export function readResourceForm(formData: FormData): ResourceFormValues {
  const text = (key: string) => String(formData.get(key) ?? "");
  return {
    type: text("type"),
    name: text("name"),
    description: text("description"),
    price: text("price"),
    priceUnit: text("priceUnit"),
    deposit: text("deposit"),
    quantityTotal: text("quantityTotal"),
    active: formData.get("active") === "on",
  };
}

export function parseResourceForm(values: ResourceFormValues) {
  return resourceFormSchema.safeParse({
    ...values,
    priceCents: values.price,
    depositCents: values.deposit,
  });
}

/** Vérifie un fichier envoyé comme photo. Retourne un message d'erreur ou le fichier. */
export function validateImageFile(
  file: FormDataEntryValue | null,
):
  | { ok: true; file: File & { type: AllowedImageType } }
  | { ok: false; error: string } {
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choisissez une photo à envoyer." };
  }
  if (!isAllowedImageType(file.type)) {
    const formats = Object.values(ALLOWED_IMAGE_TYPES)
      .map((ext) => ext.toUpperCase())
      .join(", ");
    return {
      ok: false,
      error: `Format non accepté. Formats possibles : ${formats}.`,
    };
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return { ok: false, error: "La photo dépasse la taille maximale de 4 Mo." };
  }
  return { ok: true, file: file as File & { type: AllowedImageType } };
}
