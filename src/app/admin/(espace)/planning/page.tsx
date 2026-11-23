import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import {
  STATUS_COLORS,
  StatusBadge,
} from "@/components/reservations/status-badge";
import { Button } from "@/components/ui/button";
import {
  periodTitle,
  shiftAnchor,
  visibleDays,
  type CalendarView,
} from "@/lib/calendar";
import {
  formatDateFr,
  formatPeriodFr,
  isDateOnly,
  todayInParis,
  toDbDate,
} from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import {
  getCheckedOut,
  getPlanning,
  PLANNING_STATUSES,
} from "@/server/reservations/admin-queries";

export const metadata: Metadata = { title: "Planning" };

type View = CalendarView | "sorti";
type Booking = Awaited<ReturnType<typeof getPlanning>>[number];

const VIEWS: { value: View; label: string }[] = [
  { value: "mois", label: "Mois" },
  { value: "semaine", label: "Semaine" },
  { value: "sorti", label: "Matériel sorti" },
];

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const dayNumber = (date: string) => Number(date.slice(8, 10));
const dayLabel = new Intl.DateTimeFormat("fr-FR", {
  weekday: "short",
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

export default function PlanningPage({
  searchParams,
}: PageProps<"/admin/planning">) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Planning</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Planning searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function Planning({
  searchParams,
}: Pick<PageProps<"/admin/planning">, "searchParams">) {
  await requireAdmin();
  await connection();
  const params = await searchParams;
  const today = todayInParis();
  const view: View = VIEWS.some((v) => v.value === params.vue)
    ? (params.vue as View)
    : "mois";
  const anchor =
    typeof params.date === "string" && isDateOnly(params.date)
      ? params.date
      : today;

  return (
    <>
      <nav aria-label="Vues du planning">
        <ul className="flex flex-wrap gap-2">
          {VIEWS.map((v) => (
            <li key={v.value}>
              <Link
                href={`/admin/planning?vue=${v.value}&date=${anchor}`}
                aria-current={view === v.value ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center rounded-full border px-4 text-sm",
                  view === v.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-background hover:bg-muted",
                )}
              >
                {v.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {view === "sorti" ? (
        <CheckedOut today={today} />
      ) : (
        <Calendar view={view} anchor={anchor} today={today} />
      )}
    </>
  );
}

async function Calendar({
  view,
  anchor,
  today,
}: {
  view: CalendarView;
  anchor: string;
  today: string;
}) {
  const days = visibleDays(view, anchor);
  const bookings = await getPlanning(days[0], days.at(-1)!);
  const byDay = (day: string) =>
    bookings.filter((b) => b.startDate <= day && day <= b.endDate);
  const inMonth = (day: string) =>
    view === "semaine" || day.slice(0, 7) === anchor.slice(0, 7);
  const link = (date: string) => `/admin/planning?vue=${view}&date=${date}`;

  return (
    <section className="flex flex-col gap-4" aria-labelledby="period-title">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="period-title"
          className="font-heading text-lg font-semibold first-letter:uppercase"
        >
          {periodTitle(view, anchor)}
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link href={link(shiftAnchor(view, anchor, -1))}>← Précédent</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={link(today)}>Aujourd&apos;hui</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link href={link(shiftAnchor(view, anchor, 1))}>Suivant →</Link>
          </Button>
        </div>
      </div>

      <Legend />

      {/* Grille du mois sur grand écran. */}
      {view === "mois" && (
        <div className="hidden overflow-hidden rounded-lg border bg-background md:block">
          <div className="grid grid-cols-7 border-b bg-muted/50 text-center text-xs font-medium text-muted-foreground">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7">
            {days.map((day) => {
              const dayBookings = byDay(day);
              return (
                <div
                  key={day}
                  className={cn(
                    "flex min-h-28 flex-col gap-1 border-r border-b p-1.5 text-xs [&:nth-child(7n)]:border-r-0",
                    !inMonth(day) && "bg-muted/30 text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "self-end px-1",
                      day === today &&
                        "rounded-full bg-primary font-semibold text-primary-foreground",
                    )}
                    aria-label={formatDateFr(day)}
                  >
                    {dayNumber(day)}
                  </span>
                  {dayBookings.slice(0, 3).map((b) => (
                    <BookingChip key={b.id} booking={b} />
                  ))}
                  {dayBookings.length > 3 && (
                    <span className="px-1 text-muted-foreground">
                      + {dayBookings.length - 3} autre(s)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Liste par jour : vue semaine, et vue mois sur mobile. */}
      <ol
        className={cn(
          "flex flex-col divide-y rounded-lg border bg-background",
          view === "mois" && "md:hidden",
        )}
      >
        {days
          .filter((day) => inMonth(day))
          .filter((day) => view === "semaine" || byDay(day).length > 0)
          .map((day) => (
            <li key={day} className="flex flex-col gap-2 p-3">
              <span
                className={cn(
                  "text-sm font-medium first-letter:uppercase",
                  day === today && "text-primary",
                )}
              >
                {dayLabel.format(toDbDate(day))}
                {day === today && " · aujourd'hui"}
              </span>
              {byDay(day).length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Aucune réservation
                </span>
              ) : (
                byDay(day).map((b) => <BookingChip key={b.id} booking={b} />)
              )}
            </li>
          ))}
        {view === "mois" && bookings.length === 0 && (
          <li className="p-3 text-sm text-muted-foreground">
            Aucune réservation ce mois-ci.
          </li>
        )}
      </ol>
    </section>
  );
}

function BookingChip({ booking }: { booking: Booking }) {
  const who = booking.customer.organization || booking.customer.lastName;
  return (
    <Link
      href={`/admin/reservations/${booking.id}`}
      title={`${booking.reference} · ${who} · ${formatPeriodFr(
        booking.startDate,
        booking.endDate,
      )}`}
      className={cn(
        "truncate rounded border px-1.5 py-0.5 text-xs hover:underline",
        STATUS_COLORS[booking.status],
      )}
    >
      {who} · {booking.reference}
    </Link>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-2" aria-label="Légende des statuts">
      {PLANNING_STATUSES.map((status) => (
        <li key={status}>
          <StatusBadge status={status} />
        </li>
      ))}
    </ul>
  );
}

async function CheckedOut({ today }: { today: string }) {
  const rows = await getCheckedOut(today);

  if (rows.length === 0) {
    return (
      <p className="text-muted-foreground">
        Aucun matériel n&apos;est actuellement sorti.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-lg border bg-background">
      {rows.map((r) => (
        <li key={r.id}>
          <Link
            href={`/admin/reservations/${r.id}`}
            className="flex flex-col gap-2 p-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 sm:flex-row sm:justify-between"
          >
            <div className="flex flex-col gap-1">
              <span className="font-medium">
                {r.customer.firstName} {r.customer.lastName}
                {r.customer.organization && ` · ${r.customer.organization}`}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.items
                  .map((i) => `${i.resource.name} × ${i.quantity}`)
                  .join(", ")}
              </span>
              <span className="text-sm text-muted-foreground">
                {r.reference} · {r.customer.phone}
              </span>
            </div>
            <div className="flex flex-col gap-1 sm:items-end">
              <span className="text-sm">
                Retour prévu : {formatDateFr(r.endDate)}
              </span>
              {r.late && (
                <span className="w-fit rounded-full bg-destructive px-2 py-0.5 text-xs font-medium text-white">
                  En retard
                </span>
              )}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}
