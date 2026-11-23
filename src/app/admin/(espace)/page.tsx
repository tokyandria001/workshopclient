import type { Metadata } from "next";
import { Suspense } from "react";

import { requireAdmin } from "@/server/auth/session";

export const metadata: Metadata = { title: "Tableau de bord" };

export default function DashboardPage() {
  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-2xl font-bold">Tableau de bord</h1>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <Dashboard />
      </Suspense>
    </div>
  );
}

async function Dashboard() {
  const admin = await requireAdmin();
  return (
    <p className="text-muted-foreground">
      Bienvenue, {admin.name}. Les indicateurs (demandes en attente,
      réservations à venir, matériel sorti, retours en retard) arriveront à
      l&apos;étape 6.
    </p>
  );
}
