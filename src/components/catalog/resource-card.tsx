import Image from "next/image";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/money";
import type { CatalogResource } from "@/server/catalog/queries";
import {
  PRICE_UNIT_LABELS,
  RESOURCE_TYPE_LABELS,
} from "@/server/resources/schema";

import { ImagePlaceholder } from "./image-placeholder";

export function ResourceCard({ resource }: { resource: CatalogResource }) {
  const [cover] = resource.images;

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-lg border bg-card focus-within:ring-3 focus-within:ring-ring/50">
      <div className="relative aspect-4/3 bg-muted">
        {cover ? (
          <Image
            src={cover}
            alt=""
            fill
            sizes="(min-width: 1024px) 320px, (min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <Badge variant="secondary" className="w-fit">
          {RESOURCE_TYPE_LABELS[resource.type]}
        </Badge>
        <h2 className="font-heading text-lg font-semibold">
          {/* Le lien couvre toute la carte (pseudo-élément). */}
          <Link
            href={`/catalogue/${resource.id}`}
            className="group-focus-within:underline after:absolute after:inset-0 focus-visible:outline-none"
          >
            {resource.name}
          </Link>
        </h2>
        <p className="line-clamp-2 text-sm text-muted-foreground">
          {resource.description}
        </p>
        <p className="mt-auto pt-2 font-medium">
          {formatCents(resource.priceCents)}{" "}
          <span className="text-sm font-normal text-muted-foreground">
            {PRICE_UNIT_LABELS[resource.priceUnit]}
          </span>
        </p>
      </div>
    </article>
  );
}
