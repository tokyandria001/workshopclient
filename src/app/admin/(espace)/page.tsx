import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { StatusBadge } from "@/components/reservations/status-badge";
import { formatPeriodFr, todayInParis } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { requireAdmin } from "@/server/auth/session";
import { getDashboard } from "@/server/reservations/admin-queries";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-heading text-2xl font-bold">Tableau de bord</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const admin = await requireAdmin();
  // La date du jour doit être celle de la requête, pas celle du pré-rendu.
  await connection();
  const data = await getDashboard(todayInParis());

  const stats = [
    {
      label: "Demandes en attente",
      value: data.pending,
      href: "/admin/reservations?statut=EN_ATTENTE",
      highlight: data.pending > 0,
    },
    {
      label: "Réservations à venir",
      value: data.upcoming,
      href: "/admin/planning",
    },
    {
      label: "Matériel sorti",
      value: data.out,
      href: "/admin/planning?vue=sorti",
    },
    {
      label: "Retours en retard",
      value: data.late,
      href: "/admin/planning?vue=sorti",
      alert: data.late > 0,
    },
  ];

  return (
    <>
      <p className="text-muted-foreground">Bonjour {admin.name}.</p>

      <ul className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((stat) => (
          <li key={stat.label}>
            <Link
              href={stat.href}
              className={cn(
                "flex h-full flex-col gap-1 rounded-lg border bg-background p-4 outline-none hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50",
                stat.highlight && "border-amber-400",
                stat.alert && "border-destructive",
              )}
            >
              <span
                className={cn(
                  "font-heading text-3xl font-bold",
                  stat.alert && "text-destructive",
                )}
              >
                {stat.value}
              </span>
              <span className="text-sm text-muted-foreground">
                {stat.label}
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-semibold">
          Prochaines réservations
        </h2>
        {data.next.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucune réservation à venir.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border bg-background">
            {data.next.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/admin/reservations/${r.id}`}
                  className="flex flex-col gap-1 p-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">
                      {r.customer.firstName} {r.customer.lastName}
                    </span>
                    <StatusBadge status={r.status} />
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {formatPeriodFr(r.startDate, r.endDate)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
