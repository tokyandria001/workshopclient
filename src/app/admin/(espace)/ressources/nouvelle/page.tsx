import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { requireAdmin } from "@/server/auth/session";
import { saveResource } from "@/server/resources/actions";

import { ResourceForm } from "../resource-form";

export const metadata: Metadata = { title: "Nouvelle ressource" };

export default function NewResourcePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Link
          href="/admin/ressources"
          className="text-sm text-muted-foreground hover:underline"
        >
          ← Ressources
        </Link>
        <h1 className="font-heading text-2xl font-bold">Nouvelle ressource</h1>
      </div>
      <Suspense>
        <NewResourceForm />
      </Suspense>
    </div>
  );
}

async function NewResourceForm() {
  await requireAdmin();
  return (
    <ResourceForm
      action={saveResource.bind(null, null)}
      submitLabel="Créer la ressource"
      initialValues={{
        type: "MATERIEL",
        name: "",
        description: "",
        price: "",
        priceUnit: "JOUR",
        deposit: "0",
        quantityTotal: "1",
        active: true,
      }}
    />
  );
}
