import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";

import { StatusBadge } from "@/components/reservations/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { daysInclusive, formatPeriodFr, todayInParis } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireAdmin } from "@/server/auth/session";
import {
  getReservationDetail,
  type ReservationDetail,
} from "@/server/reservations/admin-queries";
import {
  STATUS_LABELS,
  STATUS_SHORT_LABELS,
} from "@/server/reservations/status";
import { adminActionsFor } from "@/server/reservations/transitions";
import { PRICE_UNIT_LABELS } from "@/server/resources/schema";

import { ReservationActions } from "./reservation-actions";

export const metadata: Metadata = { title: "Fiche réservation" };

const dateTime = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

export default function ReservationPage({
  params,
}: PageProps<"/admin/reservations/[id]">) {
  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <Link
        href="/admin/reservations"
        className="w-fit text-sm text-muted-foreground hover:underline"
      >
        ← Réservations
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ReservationDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ReservationDetails({
  params,
}: Pick<PageProps<"/admin/reservations/[id]">, "params">) {
  await requireAdmin();
  const { id } = await params;
  const reservation = await getReservationDetail(id);
  if (!reservation) notFound();

  // Date du jour calculée à la requête (badge « en retard »).
  await connection();
  const today = todayInParis();
  const late = reservation.status === "EN_COURS" && reservation.endDate < today;
  const days = daysInclusive(reservation.startDate, reservation.endDate);

  return (
    <>
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-heading text-2xl font-bold">
            Réservation {reservation.reference}
          </h1>
          <StatusBadge status={reservation.status} />
          {late && (
            <span className="rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white">
              Retour en retard
            </span>
          )}
        </div>
        <p className="text-muted-foreground">
          {STATUS_LABELS[reservation.status]} · Demande reçue le{" "}
          {dateTime.format(reservation.createdAt)}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Location</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p>
                {formatPeriodFr(reservation.startDate, reservation.endDate)} (
                {days} jour{days > 1 ? "s" : ""})
              </p>
              <ul className="flex flex-col gap-2 text-sm">
                {reservation.items.map((item) => (
                  <li key={item.id} className="flex justify-between gap-4">
                    <span>
                      <Link
                        href={`/admin/ressources/${item.resource.id}`}
                        className="hover:underline"
                      >
                        {item.resource.name}
                      </Link>{" "}
                      × {item.quantity}
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
              <Dates reservation={reservation} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Client</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <Info label="Nom">
                  {reservation.customer.firstName}{" "}
                  {reservation.customer.lastName}
                </Info>
                {reservation.customer.organization && (
                  <Info label="Organisation">
                    {reservation.customer.organization}
                  </Info>
                )}
                <Info label="E-mail">
                  <a
                    href={`mailto:${reservation.customer.email}`}
                    className="break-all underline"
                  >
                    {reservation.customer.email}
                  </a>
                </Info>
                <Info label="Téléphone">
                  <a
                    href={`tel:${reservation.customer.phone.replace(/[^\d+]/g, "")}`}
                    className="underline"
                  >
                    {reservation.customer.phone}
                  </a>
                </Info>
              </dl>
              {reservation.message && (
                <div className="mt-4 flex flex-col gap-1 text-sm">
                  <span className="text-muted-foreground">
                    Message du client
                  </span>
                  <p className="rounded-md bg-muted p-3 whitespace-pre-line">
                    {reservation.message}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Historique</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ol className="flex flex-col gap-3 text-sm">
                {reservation.history.map((change) => (
                  <li key={change.id} className="flex flex-col gap-0.5">
                    <span>
                      {change.fromStatus
                        ? `${STATUS_SHORT_LABELS[change.fromStatus]} → `
                        : ""}
                      <strong>{STATUS_SHORT_LABELS[change.toStatus]}</strong>
                    </span>
                    <span className="text-muted-foreground">
                      {dateTime.format(change.createdAt)} ·{" "}
                      {authorLabel(change.author)}
                    </span>
                    {change.comment && (
                      <span className="whitespace-pre-line">
                        « {change.comment} »
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Paiement et documents</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
              {reservation.payments.length === 0 ? (
                <p>Aucun paiement enregistré.</p>
              ) : (
                reservation.payments.map((payment) => (
                  <p key={payment.id}>
                    {formatCents(payment.amountCents)} · {payment.status}
                    {payment.needsRefund && " · À rembourser manuellement"}
                  </p>
                ))
              )}
              {reservation.documents.length === 0 ? (
                <p>Aucun document (contrat et reçu générés après paiement).</p>
              ) : (
                reservation.documents.map((doc) => (
                  <p key={doc.id}>
                    {doc.type} {doc.number}
                  </p>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>Actions</h2>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ReservationActions
                reservationId={reservation.id}
                actions={adminActionsFor(reservation.status)}
              />
            </CardContent>
          </Card>
        </aside>
      </div>
    </>
  );
}

function Dates({ reservation }: { reservation: ReservationDetail }) {
  const entries = [
    ["Paiement attendu avant le", reservation.paymentDueAt],
    ["Sorti le", reservation.checkedOutAt],
    ["Restitué le", reservation.returnedAt],
  ] as const;
  const visible = entries.filter(([, date]) => date);
  if (visible.length === 0) return null;
  return (
    <dl className="grid gap-1 border-t pt-3 text-sm">
      {visible.map(([label, date]) => (
        <div key={label} className="flex justify-between gap-4">
          <dt className="text-muted-foreground">{label}</dt>
          <dd>{dateTime.format(date!)}</dd>
        </div>
      ))}
    </dl>
  );
}

function Info({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </div>
  );
}

function authorLabel(author: string) {
  if (author === "client") return "Demande du client";
  if (author === "systeme") return "Automatique";
  return author;
}
