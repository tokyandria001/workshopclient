import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { StatusBadge } from "@/components/reservations/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import type { ReservationStatus } from "@/generated/prisma/enums";
import { formatPeriodFr, isDateOnly } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import { requireAdmin } from "@/server/auth/session";
import {
  LIST_LIMIT,
  listReservations,
  type ReservationFilters,
} from "@/server/reservations/admin-queries";
import {
  ALL_STATUSES,
  STATUS_SHORT_LABELS,
} from "@/server/reservations/status";

export const metadata: Metadata = { title: "Réservations" };

type SearchParams = Awaited<PageProps<"/admin/reservations">["searchParams"]>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? "";
}

/** Filtres lus dans l'URL ; les valeurs invalides sont ignorées. */
function parseFilters(params: SearchParams): ReservationFilters {
  const status = first(params.statut);
  const from = first(params.du);
  const to = first(params.au);
  return {
    status: ALL_STATUSES.includes(status as ReservationStatus)
      ? (status as ReservationStatus)
      : undefined,
    from: isDateOnly(from) ? from : undefined,
    to: isDateOnly(to) ? to : undefined,
    query: first(params.q).slice(0, 100) || undefined,
  };
}

export default function ReservationsPage({
  searchParams,
}: PageProps<"/admin/reservations">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Réservations</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ReservationList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ReservationList({
  searchParams,
}: Pick<PageProps<"/admin/reservations">, "searchParams">) {
  await requireAdmin();
  const filters = parseFilters(await searchParams);
  const { rows, total } = await listReservations(filters);
  const hasFilters = Object.values(filters).some(Boolean);

  return (
    <>
      {/* Formulaire GET : les filtres sont dans l'URL (lien partageable). */}
      <form
        className="grid gap-3 rounded-lg border bg-background p-4 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        role="search"
      >
        <div className="flex flex-col gap-2">
          <Label htmlFor="statut">Statut</Label>
          <NativeSelect
            id="statut"
            name="statut"
            className="w-full"
            defaultValue={filters.status ?? ""}
          >
            <NativeSelectOption value="">Tous</NativeSelectOption>
            {ALL_STATUSES.map((status) => (
              <NativeSelectOption key={status} value={status}>
                {STATUS_SHORT_LABELS[status]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="du">Du</Label>
          <Input id="du" name="du" type="date" defaultValue={filters.from} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="au">Au</Label>
          <Input id="au" name="au" type="date" defaultValue={filters.to} />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="q">Client ou référence</Label>
          <Input
            id="q"
            name="q"
            type="search"
            placeholder="Nom, e-mail, R27-…"
            defaultValue={filters.query}
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" className="flex-1">
            Filtrer
          </Button>
          {hasFilters && (
            <Button variant="outline" asChild>
              <Link href="/admin/reservations">Effacer</Link>
            </Button>
          )}
        </div>
      </form>

      <p className="text-sm text-muted-foreground" role="status">
        {total === 0
          ? "Aucune réservation ne correspond."
          : `${total} réservation${total > 1 ? "s" : ""}${
              total > LIST_LIMIT
                ? ` (les ${LIST_LIMIT} premières affichées)`
                : ""
            }`}
      </p>

      {rows.length > 0 && (
        <ul className="divide-y rounded-lg border bg-background">
          {rows.map((r) => (
            <li key={r.id}>
              <Link
                href={`/admin/reservations/${r.id}`}
                className="flex flex-col gap-2 p-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {r.customer.firstName} {r.customer.lastName}
                    </span>
                    <StatusBadge status={r.status} />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {r.reference}
                    {r.customer.organization && ` · ${r.customer.organization}`}
                  </span>
                  <span className="text-sm">
                    {formatPeriodFr(r.startDate, r.endDate)}
                  </span>
                </div>
                <span className="font-medium whitespace-nowrap">
                  {formatCents(r.totalCents)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
