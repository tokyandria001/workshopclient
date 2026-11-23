"use client";

import { useActionState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  deleteResourceAction,
  toggleResourceActive,
} from "@/server/resources/actions";

export function ResourceStatus({
  resourceId,
  active,
}: {
  resourceId: string;
  active: boolean;
}) {
  const [deleteState, deleteAction, deleting] = useActionState(
    deleteResourceAction.bind(null, resourceId),
    {},
  );

  return (
    <div className="flex flex-col gap-6">
      <form
        action={toggleResourceActive.bind(null, resourceId, !active)}
        className="flex flex-col gap-2"
      >
        <p className="text-sm text-muted-foreground">
          {active
            ? "La ressource est visible dans le catalogue et peut être réservée."
            : "La ressource est masquée du catalogue et ne peut plus être réservée."}
        </p>
        <div>
          <Button type="submit" variant="outline" className="w-full sm:w-auto">
            {active ? "Désactiver" : "Réactiver"}
          </Button>
        </div>
      </form>

      <form
        action={deleteAction}
        className="flex flex-col gap-2"
        onSubmit={(event) => {
          if (
            !window.confirm(
              "Supprimer définitivement cette ressource et ses photos ?",
            )
          ) {
            event.preventDefault();
          }
        }}
      >
        {deleteState.error && (
          <Alert variant="destructive">
            <AlertDescription>{deleteState.error}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          Suppression définitive, possible uniquement si la ressource n&apos;a
          jamais été réservée.
        </p>
        <div>
          <Button
            type="submit"
            variant="destructive"
            disabled={deleting}
            className="w-full sm:w-auto"
          >
            {deleting ? "Suppression…" : "Supprimer"}
          </Button>
        </div>
      </form>
    </div>
  );
}
