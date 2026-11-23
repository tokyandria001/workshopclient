import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { centsToEurosInput } from "@/lib/money";
import {
  MAX_IMAGES_PER_RESOURCE,
  resourceImageUrl,
} from "@/lib/resource-images";
import { requireAdmin } from "@/server/auth/session";
import { saveResource } from "@/server/resources/actions";
import { RESOURCE_TYPE_LABELS } from "@/server/resources/schema";
import { getResource } from "@/server/resources/service";

import { ResourceForm } from "../resource-form";
import { ImageManager } from "./image-manager";
import { ResourceStatus } from "./resource-status";

export const metadata: Metadata = { title: "Modifier la ressource" };

export default function EditResourcePage({
  params,
  searchParams,
}: PageProps<"/admin/ressources/[id]">) {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Link
        href="/admin/ressources"
        className="text-sm text-muted-foreground hover:underline"
      >
        ← Ressources
      </Link>
      <Suspense fallback={<p className="text-muted-foreground">Chargement…</p>}>
        <EditResource params={params} searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function EditResource({
  params,
  searchParams,
}: Pick<PageProps<"/admin/ressources/[id]">, "params" | "searchParams">) {
  await requireAdmin();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const resource = await getResource(id);
  if (!resource) notFound();

  return (
    <>
      <div className="flex flex-col gap-2">
        <h1 className="font-heading text-2xl font-bold wrap-break-word">
          {resource.name}
        </h1>
        <div className="flex gap-1.5">
          <Badge variant="secondary">
            {RESOURCE_TYPE_LABELS[resource.type]}
          </Badge>
          {resource.active ? (
            <Badge>Active</Badge>
          ) : (
            <Badge variant="outline">Inactive</Badge>
          )}
        </div>
      </div>

      {query.creee === "1" && (
        <Alert>
          <AlertDescription>
            Ressource créée. Vous pouvez maintenant ajouter des photos.
          </AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Informations</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceForm
            action={saveResource.bind(null, resource.id)}
            submitLabel="Enregistrer"
            initialValues={{
              type: resource.type,
              name: resource.name,
              description: resource.description,
              price: centsToEurosInput(resource.priceCents),
              priceUnit: resource.priceUnit,
              deposit: centsToEurosInput(resource.depositCents),
              quantityTotal: String(resource.quantityTotal),
              active: resource.active,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Photos</h2>
          </CardTitle>
          <CardDescription>
            JPEG, PNG ou WebP, 4 Mo maximum, {MAX_IMAGES_PER_RESOURCE} photos au
            plus. La première photo est utilisée comme image principale.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ImageManager
            resourceId={resource.id}
            resourceName={resource.name}
            images={resource.images.map((path) => ({
              path,
              url: resourceImageUrl(path),
            }))}
            canAddMore={resource.images.length < MAX_IMAGES_PER_RESOURCE}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <h2>Disponibilité et suppression</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResourceStatus resourceId={resource.id} active={resource.active} />
        </CardContent>
      </Card>
    </>
  );
}
