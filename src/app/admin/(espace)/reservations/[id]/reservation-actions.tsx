"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { runReservationAction } from "@/server/reservations/admin-actions";
import {
  ACTION_LABELS,
  COMMENT_LABELS,
  TRANSITIONS,
  type ReservationAction,
} from "@/server/reservations/transitions";

const HELP: Partial<Record<ReservationAction, string>> = {
  accepter:
    "Revérifie la disponibilité et passe la demande en attente de paiement.",
  refuser: "La demande est refusée ; le stock est libéré.",
  annuler:
    "Le stock est libéré. Un éventuel remboursement se fait dans Stripe.",
  sortir: "Le matériel est remis au client (ou la salle occupée).",
  restituer: "Le matériel est rendu ; le stock redevient disponible.",
};

export function ReservationActions({
  reservationId,
  actions,
}: {
  reservationId: string;
  actions: ReservationAction[];
}) {
  const [state, setState] = useState<{ error?: string; success?: string }>({});

  if (actions.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {state.success && <Feedback state={state} />}
        <p className="text-sm text-muted-foreground">
          Aucune action possible : la réservation est terminée ou close.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Feedback state={state} />
      {actions.map((action) => (
        <ActionForm
          key={action}
          reservationId={reservationId}
          action={action}
          onResult={setState}
        />
      ))}
    </div>
  );
}

function ActionForm({
  reservationId,
  action,
  onResult,
}: {
  reservationId: string;
  action: ReservationAction;
  onResult: (state: { error?: string; success?: string }) => void;
}) {
  const needsComment = TRANSITIONS[action].requiresComment;
  const destructive = action === "refuser" || action === "annuler";
  const [, formAction, pending] = useActionState(
    async (
      previous: { error?: string; success?: string },
      formData: FormData,
    ) => {
      const result = await runReservationAction(
        reservationId,
        action,
        previous,
        formData,
      );
      onResult(result);
      return result;
    },
    {},
  );
  const fieldId = `comment-${action}`;

  return (
    <form
      action={formAction}
      className="flex flex-col gap-2 border-t pt-4 first:border-t-0 first:pt-0"
      onSubmit={(event) => {
        if (
          destructive &&
          !window.confirm(`${ACTION_LABELS[action]} cette réservation ?`)
        ) {
          event.preventDefault();
        }
      }}
    >
      {needsComment && (
        <div className="flex flex-col gap-2">
          <Label htmlFor={fieldId}>{COMMENT_LABELS[action]}</Label>
          <Textarea
            id={fieldId}
            name="comment"
            rows={2}
            maxLength={2000}
            required
          />
        </div>
      )}
      <Button
        type="submit"
        variant={destructive ? "destructive" : "default"}
        disabled={pending}
        className="w-full"
      >
        {pending ? "…" : ACTION_LABELS[action]}
      </Button>
      {HELP[action] && (
        <p className="text-xs text-muted-foreground">{HELP[action]}</p>
      )}
    </form>
  );
}

function Feedback({ state }: { state: { error?: string; success?: string } }) {
  if (state.error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{state.error}</AlertDescription>
      </Alert>
    );
  }
  if (state.success) {
    return (
      <Alert>
        <AlertDescription>{state.success}</AlertDescription>
      </Alert>
    );
  }
  return null;
}
