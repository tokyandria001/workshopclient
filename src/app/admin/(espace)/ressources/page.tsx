import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { requireAdmin } from "@/server/auth/session";
import {
  PRICE_UNIT_LABELS,
  RESOURCE_TYPE_LABELS,
} from "@/server/resources/schema";
import { listResources } from "@/server/resources/service";

export const metadata: Metadata = { title: "Ressources" };

export default function ResourcesPage({
  searchParams,
}: PageProps<"/admin/ressources">) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-heading text-2xl font-bold">Ressources</h1>
        <Button asChild>
          <Link href="/admin/ressources/nouvelle">Nouvelle ressource</Link>
        </Button>
      </div>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ResourceList searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ResourceList({
  searchParams,
}: Pick<PageProps<"/admin/ressources">, "searchParams">) {
  await requireAdmin();
  const [resources, params] = await Promise.all([
    listResources(),
    searchParams,
  ]);

  return (
    <>
      {params.supprimee === "1" && (
        <Alert>
          <AlertDescription>La ressource a été supprimée.</AlertDescription>
        </Alert>
      )}

      {resources.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune ressource pour le moment.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-background">
          {resources.map((resource) => (
            <li key={resource.id}>
              <Link
                href={`/admin/ressources/${resource.id}`}
                className="flex flex-col gap-2 p-4 outline-none hover:bg-muted/50 focus-visible:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-1">
                  <span className="truncate font-medium">{resource.name}</span>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="secondary">
                      {RESOURCE_TYPE_LABELS[resource.type]}
                    </Badge>
                    {!resource.active && (
                      <Badge variant="outline">Inactive</Badge>
                    )}
                  </div>
                </div>
                <dl className="grid grid-cols-3 gap-3 text-sm text-muted-foreground sm:flex sm:gap-6 sm:text-right">
                  <div>
                    <dt className="sr-only sm:not-sr-only sm:text-xs">Tarif</dt>
                    <dd className="text-foreground">
                      {formatCents(resource.priceCents)}{" "}
                      <span className="text-muted-foreground">
                        {PRICE_UNIT_LABELS[resource.priceUnit]}
                      </span>
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only sm:not-sr-only sm:text-xs">
                      Caution
                    </dt>
                    <dd>{formatCents(resource.depositCents)}</dd>
                  </div>
                  <div>
                    <dt className="sr-only sm:not-sr-only sm:text-xs">
                      Quantité
                    </dt>
                    <dd>× {resource.quantityTotal}</dd>
                  </div>
                </dl>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
