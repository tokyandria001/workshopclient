import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { todayInParis } from "@/lib/dates";
import { getCatalog } from "@/server/catalog/queries";

import { ReservationForm } from "./reservation-form";

export const metadata: Metadata = {
  title: "Réserver",
  description:
    "Demande de réservation de la salle et du matériel du Zénith de Bel Air.",
};

export default function ReservePage({ searchParams }: PageProps<"/reserver">) {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Demande de réservation
        </h1>
        <p className="text-muted-foreground">
          Choisissez vos dates et vos ressources. Votre demande sera étudiée par
          notre équipe ; vous recevrez ensuite un lien de paiement.
        </p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ReservationFormLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReservationFormLoader({
  searchParams,
}: Pick<PageProps<"/reserver">, "searchParams">) {
  const [params, resources] = await Promise.all([
    searchParams,
    getCatalog(null),
    // La date du jour (todayInParis) doit être calculée à chaque requête,
    // jamais figée lors du pré-rendu.
    connection(),
  ]);
  const preselected =
    typeof params.ressource === "string" ? params.ressource : undefined;

  return (
    <ReservationForm
      today={todayInParis()}
      preselectedId={
        resources.some((r) => r.id === preselected) ? preselected : undefined
      }
      resources={resources.map((r) => ({
        id: r.id,
        type: r.type,
        name: r.name,
        priceCents: r.priceCents,
        priceUnit: r.priceUnit,
        depositCents: r.depositCents,
      }))}
    />
  );
}
