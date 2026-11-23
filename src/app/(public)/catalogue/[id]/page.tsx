import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { ImagePlaceholder } from "@/components/catalog/image-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { getCatalogResource } from "@/server/catalog/queries";
import {
  PRICE_UNIT_LABELS,
  RESOURCE_TYPE_LABELS,
} from "@/server/resources/schema";

export async function generateMetadata({
  params,
}: PageProps<"/catalogue/[id]">): Promise<Metadata> {
  const { id } = await params;
  const resource = await getCatalogResource(id);
  if (!resource) return { title: "Ressource introuvable" };
  return {
    title: resource.name,
    description: resource.description.slice(0, 160),
  };
}

export default function ResourcePage({ params }: PageProps<"/catalogue/[id]">) {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:py-12">
      <Link
        href="/catalogue"
        className="w-fit text-sm text-muted-foreground hover:underline"
      >
        ← Catalogue
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <ResourceDetails params={params} />
      </Suspense>
    </div>
  );
}

async function ResourceDetails({
  params,
}: Pick<PageProps<"/catalogue/[id]">, "params">) {
  const { id } = await params;
  const resource = await getCatalogResource(id);
  if (!resource) notFound();

  const [cover, ...others] = resource.images;
  const isRoom = resource.type === "SALLE";

  return (
    <article className="grid gap-8 lg:grid-cols-2">
      <div className="flex flex-col gap-3">
        <div className="relative aspect-4/3 overflow-hidden rounded-lg border bg-muted">
          {cover ? (
            <Image
              src={cover}
              alt={`${resource.name} – photo principale`}
              fill
              priority
              sizes="(min-width: 1024px) 480px, 100vw"
              className="object-cover"
            />
          ) : (
            <ImagePlaceholder />
          )}
        </div>
        {others.length > 0 && (
          <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4">
            {others.map((url, index) => (
              <li
                key={url}
                className="relative aspect-square overflow-hidden rounded-md border bg-muted"
              >
                <Image
                  src={url}
                  alt={`${resource.name} – photo ${index + 2}`}
                  fill
                  sizes="(min-width: 640px) 120px, 30vw"
                  className="object-cover"
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary" className="w-fit">
            {RESOURCE_TYPE_LABELS[resource.type]}
          </Badge>
          <h1 className="font-heading text-3xl font-bold tracking-tight break-words">
            {resource.name}
          </h1>
        </div>

        <dl className="grid grid-cols-2 gap-4 rounded-lg border p-4">
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Tarif</dt>
            <dd className="font-medium">
              {formatCents(resource.priceCents)}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                {PRICE_UNIT_LABELS[resource.priceUnit]}
              </span>
            </dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-sm text-muted-foreground">Caution</dt>
            <dd className="font-medium">
              {resource.depositCents > 0
                ? formatCents(resource.depositCents)
                : "Aucune"}
            </dd>
          </div>
          {!isRoom && (
            <div className="flex flex-col gap-1">
              <dt className="text-sm text-muted-foreground">
                Quantité disponible
              </dt>
              <dd className="font-medium">{resource.quantityTotal}</dd>
            </div>
          )}
        </dl>

        <p className="text-sm text-muted-foreground">
          La caution est indiquée sur le contrat de location ; elle n&apos;est
          pas prélevée en ligne. La disponibilité exacte dépend des dates
          choisies lors de la réservation.
        </p>

        <div className="whitespace-pre-line">{resource.description}</div>

        <div>
          <Button size="lg" disabled className="w-full sm:w-auto">
            Réserver (bientôt disponible)
          </Button>
        </div>
      </div>
    </article>
  );
}
