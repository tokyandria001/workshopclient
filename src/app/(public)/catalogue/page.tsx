import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { ResourceCard } from "@/components/catalog/resource-card";
import { cn } from "@/lib/utils";
import { CATALOG_FILTERS, parseTypeFilter } from "@/server/catalog/filters";
import { getCatalog } from "@/server/catalog/queries";

export const metadata: Metadata = {
  title: "Catalogue",
  description:
    "La salle de spectacle et le matériel du Zénith de Bel Air disponibles à la location.",
};

export default function CatalogPage({ searchParams }: PageProps<"/catalogue">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">
          Catalogue
        </h1>
        <p className="text-muted-foreground">
          La salle et le matériel disponibles à la location.
        </p>
      </div>
      {/* Le filtre dépend de l'URL (?type=…) : lu au moment de la requête,
          derrière une frontière Suspense. Les données, elles, sont en cache. */}
      <Suspense fallback={<CatalogSkeleton />}>
        <FilteredCatalog searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function FilteredCatalog({
  searchParams,
}: Pick<PageProps<"/catalogue">, "searchParams">) {
  const params = await searchParams;
  const type = parseTypeFilter(params.type);
  const resources = await getCatalog(type);

  return (
    <>
      <nav aria-label="Filtrer par type">
        <ul className="flex flex-wrap gap-2">
          {CATALOG_FILTERS.map((filter) => {
            const active =
              (filter.param === null && type === null) ||
              ("type" in filter && filter.type === type);
            return (
              <li key={filter.label}>
                <Link
                  href={
                    filter.param
                      ? `/catalogue?type=${filter.param}`
                      : "/catalogue"
                  }
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex h-9 items-center rounded-full border px-4 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "hover:bg-muted",
                  )}
                >
                  {filter.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {resources.length === 0 ? (
        <p className="text-muted-foreground">
          Aucune ressource disponible pour le moment.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function CatalogSkeleton() {
  return (
    <div
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-hidden="true"
    >
      {Array.from({ length: 3 }, (_, i) => (
        <div key={i} className="aspect-4/5 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
