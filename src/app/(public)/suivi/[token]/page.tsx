import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { formatPeriodFr } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { getReservationByToken } from "@/server/reservations/service";
import { STATUS_LABELS } from "@/server/reservations/status";
import { PRICE_UNIT_LABELS } from "@/server/resources/schema";

export const metadata: Metadata = {
  title: "Suivi de réservation",
  // Page privée accessible par lien : jamais indexée, et le jeton présent
  // dans l'URL n'est pas transmis aux sites externes (en-tête Referer).
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function TrackingPage({
  params,
  searchParams,
}: PageProps<"/suivi/[token]">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Tracking params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Tracking({
  params,
  searchParams,
}: Pick<PageProps<"/suivi/[token]">, "params" | "searchParams">) {
  const [{ token }, query] = await Promise.all([params, searchParams]);
  const reservation = await getReservationByToken(token);
  if (!reservation) notFound();

  return (
    <>
      {query.nouvelle === "1" && (
        <Alert>
          <AlertTitle>Demande envoyée</AlertTitle>
          <AlertDescription>
            Merci {reservation.customer.firstName} ! Votre demande a bien été
            enregistrée. Notre équipe va l&apos;étudier ; vous recevrez un
            e-mail avec un lien de paiement si elle est acceptée.{" "}
            <strong>
              Conservez cette page dans vos favoris : son adresse vous permet de
              suivre votre demande.
            </strong>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Réservation {reservation.reference}
        </h1>
        <Badge variant="secondary" className="w-fit">
          {STATUS_LABELS[reservation.status]}
        </Badge>
      </div>

      <section className="flex flex-col gap-3 rounded-lg border p-4">
        <h2 className="font-heading text-lg font-semibold">Récapitulatif</h2>
        <p className="text-sm">
          Location {formatPeriodFr(reservation.startDate, reservation.endDate)}
        </p>
        <ul className="flex flex-col gap-2 text-sm">
          {reservation.items.map((item, index) => (
            <li key={index} className="flex justify-between gap-4">
              <span>
                {item.resource.name} × {item.quantity}
                <span className="text-muted-foreground">
                  {" "}
                  · {formatCents(item.unitPriceCents)}{" "}
                  {PRICE_UNIT_LABELS[item.resource.priceUnit]}
                </span>
              </span>
              <span className="whitespace-nowrap">
                {formatCents(item.subtotalCents)}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t pt-3 font-semibold">
          <span>Total</span>
          <span>{formatCents(reservation.totalCents)}</span>
        </div>
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>Caution (non prélevée en ligne)</span>
          <span>{formatCents(reservation.depositCents)}</span>
        </div>
      </section>
    </>
  );
}
