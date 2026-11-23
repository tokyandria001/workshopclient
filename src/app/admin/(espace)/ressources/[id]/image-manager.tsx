"use client";

import Image from "next/image";
import { useActionState, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MAX_IMAGE_BYTES } from "@/lib/resource-images";
import {
  removeResourceImageAction,
  uploadResourceImageAction,
} from "@/server/resources/actions";

type Props = {
  resourceId: string;
  resourceName: string;
  images: { path: string; url: string }[];
  canAddMore: boolean;
};

export function ImageManager({
  resourceId,
  resourceName,
  images,
  canAddMore,
}: Props) {
  const [state, uploadAction, uploading] = useActionState(
    uploadResourceImageAction.bind(null, resourceId),
    {},
  );
  const [clientError, setClientError] = useState<string>();
  const inputRef = useRef<HTMLInputElement>(null);
  const error = clientError ?? state.error;

  return (
    <div className="flex flex-col gap-5">
      {images.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucune photo.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {images.map((image, index) => (
            <li key={image.path} className="flex flex-col gap-2">
              <div className="relative aspect-4/3 overflow-hidden rounded-md border bg-muted">
                <Image
                  src={image.url}
                  alt={`${resourceName} – photo ${index + 1}`}
                  fill
                  sizes="(min-width: 640px) 200px, 45vw"
                  className="object-cover"
                />
              </div>
              <form
                action={removeResourceImageAction.bind(
                  null,
                  resourceId,
                  image.path,
                )}
              >
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  aria-label={`Supprimer la photo ${index + 1}`}
                >
                  Supprimer
                </Button>
              </form>
            </li>
          ))}
        </ul>
      )}

      {canAddMore ? (
        <form action={uploadAction} className="flex flex-col gap-3">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {!error && state.success && (
            <Alert>
              <AlertDescription>{state.success}</AlertDescription>
            </Alert>
          )}
          <div className="flex flex-col gap-2">
            <Label htmlFor="image">Ajouter une photo</Label>
            <Input
              ref={inputRef}
              id="image"
              name="image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(event) => {
                // Vérification immédiate : un fichier trop lourd serait de
                // toute façon refusé par le serveur, avec un message moins clair.
                const file = event.target.files?.[0];
                if (file && file.size > MAX_IMAGE_BYTES) {
                  setClientError(
                    "La photo dépasse la taille maximale de 4 Mo.",
                  );
                  event.target.value = "";
                } else {
                  setClientError(undefined);
                }
              }}
            />
          </div>
          <div>
            <Button
              type="submit"
              disabled={uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? "Envoi…" : "Envoyer la photo"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-sm text-muted-foreground">
          Nombre maximal de photos atteint.
        </p>
      )}
    </div>
  );
}
