// Calcul des montants (section 7.3). Fonctions pures, partagées par le
// formulaire (récapitulatif affiché) et par le serveur (montants enregistrés).

import type { PriceUnit } from "@/generated/prisma/enums";
import { daysInclusive, type DateOnly } from "@/lib/dates";

export type PricedResource = {
  id: string;
  name: string;
  priceCents: number;
  priceUnit: PriceUnit;
  depositCents: number;
};

export type QuoteLine = {
  resourceId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  priceUnit: PriceUnit;
  subtotalCents: number;
  depositCents: number;
};

export type Quote = {
  days: number;
  lines: QuoteLine[];
  totalCents: number;
  depositCents: number;
};

/** Tarif × quantité × nombre de jours, ou tarif × quantité pour un forfait. */
export function lineSubtotal(
  priceCents: number,
  unit: PriceUnit,
  quantity: number,
  days: number,
): number {
  return unit === "JOUR" ? priceCents * quantity * days : priceCents * quantity;
}

export function computeQuote(
  period: { start: DateOnly; end: DateOnly },
  items: readonly { resource: PricedResource; quantity: number }[],
): Quote {
  const days = daysInclusive(period.start, period.end);
  const lines = items.map(({ resource, quantity }) => ({
    resourceId: resource.id,
    name: resource.name,
    quantity,
    unitPriceCents: resource.priceCents,
    priceUnit: resource.priceUnit,
    subtotalCents: lineSubtotal(
      resource.priceCents,
      resource.priceUnit,
      quantity,
      days,
    ),
    // Caution par unité louée.
    depositCents: resource.depositCents * quantity,
  }));
  return {
    days,
    lines,
    totalCents: lines.reduce((sum, line) => sum + line.subtotalCents, 0),
    depositCents: lines.reduce((sum, line) => sum + line.depositCents, 0),
  };
}
