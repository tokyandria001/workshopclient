"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceType } from "@/generated/prisma/enums";
import { addDays, formatPeriodFr, isDateOnly } from "@/lib/dates";
import { formatCents } from "@/lib/money";
import {
  checkAvailability,
  submitReservation,
} from "@/server/reservations/actions";
import {
  computeQuote,
  type PricedResource,
} from "@/server/reservations/pricing";
import {
  BOOKING_HORIZON_DAYS,
  validatePeriod,
} from "@/server/reservations/rules";
import {
  HONEYPOT_FIELD,
  quantityFieldName,
} from "@/server/reservations/schema";
import { PRICE_UNIT_LABELS } from "@/server/resources/schema";

type FormResource = PricedResource & { type: ResourceType };

type Props = {
  resources: FormResource[];
  today: string;
  preselectedId?: string;
};

export function ReservationForm({ resources, today, preselectedId }: Props) {
  const [state, formAction, submitting] = useActionState(submitReservation, {});
  const errors = state.fieldErrors ?? {};

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    preselectedId ? { [preselectedId]: 1 } : {},
  );
  const [availability, setAvailability] = useState<Record<string, number>>();
  const [availabilityError, setAvailabilityError] = useState<string>();
  const [checking, setChecking] = useState(false);
  const requestId = useRef(0);

  const periodError =
    isDateOnly(startDate) && isDateOnly(endDate)
      ? validatePeriod(startDate, endDate, today)
      : null;
  const periodReady =
    isDateOnly(startDate) && isDateOnly(endDate) && !periodError;

  /**
   * Change la période et demande au serveur les disponibilités, en réaction
   * directe à la saisie. Seule la réponse à la dernière demande est retenue.
   */
  function changePeriod(nextStart: string, nextEnd: string) {
    setStartDate(nextStart);
    setEndDate(nextEnd);
    const id = ++requestId.current;
    const ready =
      isDateOnly(nextStart) &&
      isDateOnly(nextEnd) &&
      !validatePeriod(nextStart, nextEnd, today);
    if (!ready) {
      setChecking(false);
      return;
    }
    setChecking(true);
    checkAvailability(nextStart, nextEnd)
      .then((result) => {
        if (id !== requestId.current) return; // réponse obsolète
        if (result.ok) {
          setAvailability(result.availability);
          setAvailabilityError(undefined);
        } else {
          setAvailabilityError(result.error);
        }
      })
      .catch(() => {
        if (id === requestId.current) {
          setAvailabilityError(
            "Impossible de vérifier les disponibilités. Réessayez.",
          );
        }
      })
      .finally(() => {
        if (id === requestId.current) setChecking(false);
      });
  }

  // Disponibilités renvoyées par le serveur après un refus (stock modifié).
  const [lastServerAvailability, setLastServerAvailability] = useState(
    state.availability,
  );
  if (state.availability !== lastServerAvailability) {
    setLastServerAvailability(state.availability);
    if (state.availability) setAvailability(state.availability);
  }

  const knownAvailability = periodReady && !checking ? availability : undefined;

  // Quantités retenues : jamais au-delà du disponible.
  const selected = resources
    .map((resource) => {
      const max = knownAvailability?.[resource.id] ?? 0;
      return {
        resource,
        quantity: Math.min(quantities[resource.id] ?? 0, max),
      };
    })
    .filter((item) => item.quantity > 0);

  // Même calcul que le serveur (qui recalcule tout à partir de ses tarifs).
  const quote = periodReady
    ? computeQuote({ start: startDate, end: endDate }, selected)
    : null;

  function setQuantity(id: string, value: number) {
    setQuantities((current) => ({ ...current, [id]: value }));
  }

  return (
    <form
      className="flex flex-col gap-8"
      noValidate
      onSubmit={(event) => {
        // Envoi manuel : React ne réinitialise pas le formulaire, les
        // saisies restent en place si le serveur renvoie une erreur.
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
    >
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      {/* 1. Dates */}
      <Section number={1} title="Vos dates">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="startDate" label="Date de début" error={errors.startDate}>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              min={today}
              max={addDays(today, BOOKING_HORIZON_DAYS)}
              value={startDate}
              onChange={(event) => {
                const value = event.target.value;
                // Pratique : fin = début si la fin n'est pas encore choisie
                // ou se retrouve avant le début.
                const end =
                  !endDate || (value && endDate < value) ? value : endDate;
                changePeriod(value, end);
              }}
              aria-invalid={Boolean(errors.startDate)}
            />
          </Field>
          <Field
            id="endDate"
            label="Date de fin (incluse)"
            error={errors.endDate ?? (periodError ? [periodError] : undefined)}
          >
            <Input
              id="endDate"
              name="endDate"
              type="date"
              min={startDate || today}
              value={endDate}
              onChange={(event) => changePeriod(startDate, event.target.value)}
              aria-invalid={Boolean(errors.endDate || periodError)}
            />
          </Field>
        </div>
        {periodReady && (
          <p className="text-sm text-muted-foreground">
            Location {formatPeriodFr(startDate, endDate)}
            {quote && ` (${quote.days} jour${quote.days > 1 ? "s" : ""})`}.
          </p>
        )}
      </Section>

      {/* 2. Ressources */}
      <Section number={2} title="Ressources">
        {!periodReady ? (
          <p className="text-sm text-muted-foreground">
            Choisissez d&apos;abord vos dates pour voir les disponibilités.
          </p>
        ) : checking ? (
          <p className="text-sm text-muted-foreground" role="status">
            Vérification des disponibilités…
          </p>
        ) : availabilityError ? (
          <Alert variant="destructive">
            <AlertDescription>{availabilityError}</AlertDescription>
          </Alert>
        ) : null}

        {errors.items && (
          <p className="text-sm text-destructive">{errors.items[0]}</p>
        )}

        <ul className="divide-y rounded-lg border">
          {resources.map((resource) => {
            const available = knownAvailability?.[resource.id];
            const quantity = Math.min(
              quantities[resource.id] ?? 0,
              available ?? 0,
            );
            const disabled = available === undefined || available === 0;
            const fieldId = `quantite-${resource.id}`;

            return (
              <li
                key={resource.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <Label htmlFor={fieldId} className="font-medium">
                    {resource.name}
                  </Label>
                  <span className="text-sm text-muted-foreground">
                    {formatCents(resource.priceCents)}{" "}
                    {PRICE_UNIT_LABELS[resource.priceUnit]}
                    {available !== undefined &&
                      (available === 0
                        ? " · Indisponible sur ces dates"
                        : resource.type === "SALLE"
                          ? " · Disponible"
                          : ` · ${available} disponible${available > 1 ? "s" : ""}`)}
                  </span>
                </div>

                {resource.type === "SALLE" ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      id={fieldId}
                      type="checkbox"
                      className="size-4 accent-primary"
                      checked={quantity === 1}
                      disabled={disabled}
                      onChange={(event) =>
                        setQuantity(resource.id, event.target.checked ? 1 : 0)
                      }
                    />
                    Réserver la salle
                  </label>
                ) : (
                  <Input
                    id={fieldId}
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={available ?? 0}
                    step={1}
                    className="w-24"
                    value={quantity}
                    disabled={disabled}
                    aria-label={`Quantité – ${resource.name}`}
                    onChange={(event) => {
                      const value = Math.max(
                        0,
                        Math.floor(Number(event.target.value) || 0),
                      );
                      setQuantity(resource.id, value);
                    }}
                  />
                )}
                {/* Valeur envoyée au serveur (qui revérifie tout). */}
                {quantity > 0 && (
                  <input
                    type="hidden"
                    name={quantityFieldName(resource.id)}
                    value={quantity}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </Section>

      {/* 3. Coordonnées */}
      <Section number={3} title="Vos coordonnées">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="firstName" label="Prénom" error={errors.firstName}>
            <Input
              id="firstName"
              name="firstName"
              autoComplete="given-name"
              maxLength={100}
              aria-invalid={Boolean(errors.firstName)}
            />
          </Field>
          <Field id="lastName" label="Nom" error={errors.lastName}>
            <Input
              id="lastName"
              name="lastName"
              autoComplete="family-name"
              maxLength={100}
              aria-invalid={Boolean(errors.lastName)}
            />
          </Field>
          <Field id="email" label="E-mail" error={errors.email}>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              aria-invalid={Boolean(errors.email)}
            />
          </Field>
          <Field id="phone" label="Téléphone" error={errors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              autoComplete="tel"
              aria-invalid={Boolean(errors.phone)}
            />
          </Field>
          <Field
            id="organization"
            label="Organisation (facultatif)"
            error={errors.organization}
            className="sm:col-span-2"
          >
            <Input
              id="organization"
              name="organization"
              autoComplete="organization"
              maxLength={150}
            />
          </Field>
          <Field
            id="message"
            label="Message (facultatif)"
            error={errors.message}
            className="sm:col-span-2"
          >
            <Textarea id="message" name="message" rows={4} maxLength={2000} />
          </Field>
        </div>
        {/* Piège à robots : invisible et ignoré par les humains. Masqué par
            un style en ligne (prioritaire sur toute règle CSS), sans
            display:none que certains robots savent repérer. */}
        <div
          aria-hidden="true"
          data-testid="honeypot"
          style={{
            position: "absolute",
            left: "-9999px",
            top: 0,
            width: 1,
            height: 1,
            overflow: "hidden",
            opacity: 0,
            pointerEvents: "none",
          }}
        >
          <label htmlFor={HONEYPOT_FIELD}>Ne pas remplir</label>
          <input
            id={HONEYPOT_FIELD}
            name={HONEYPOT_FIELD}
            tabIndex={-1}
            autoComplete="off"
          />
        </div>
      </Section>

      {/* 4. Récapitulatif */}
      <Section number={4} title="Récapitulatif">
        {quote && quote.lines.length > 0 ? (
          <div className="flex flex-col gap-3 rounded-lg border p-4">
            <ul className="flex flex-col gap-2 text-sm">
              {quote.lines.map((line) => (
                <li
                  key={line.resourceId}
                  className="flex justify-between gap-4"
                >
                  <span>
                    {line.name} × {line.quantity}
                    <span className="text-muted-foreground">
                      {line.priceUnit === "JOUR"
                        ? ` · ${quote.days} jour${quote.days > 1 ? "s" : ""}`
                        : " · forfait"}
                    </span>
                  </span>
                  <span className="whitespace-nowrap">
                    {formatCents(line.subtotalCents)}
                  </span>
                </li>
              ))}
            </ul>
            <div className="flex justify-between border-t pt-3 font-semibold">
              <span>Total</span>
              <span data-testid="total">{formatCents(quote.totalCents)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Caution (non prélevée en ligne)</span>
              <span>{formatCents(quote.depositCents)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Aucune ressource sélectionnée.
          </p>
        )}

        <div className="flex flex-col gap-1">
          <div className="flex items-start gap-3">
            <input
              id="termsAccepted"
              name="termsAccepted"
              type="checkbox"
              className="mt-0.5 size-4 accent-primary"
              aria-invalid={Boolean(errors.termsAccepted)}
            />
            <Label htmlFor="termsAccepted" className="leading-snug font-normal">
              J&apos;ai lu et j&apos;accepte les conditions générales de
              location
            </Label>
          </div>
          <Link
            href="/conditions-generales"
            target="_blank"
            className="ml-7 w-fit text-sm underline"
          >
            Lire les conditions générales (nouvel onglet)
          </Link>
          {errors.termsAccepted && (
            <p className="text-sm text-destructive">
              {errors.termsAccepted[0]}
            </p>
          )}
        </div>

        <div>
          <Button
            type="submit"
            size="lg"
            disabled={submitting || checking}
            className="w-full sm:w-auto"
          >
            {submitting ? "Envoi…" : "Envoyer ma demande"}
          </Button>
          <p className="mt-2 text-sm text-muted-foreground">
            Aucun paiement à cette étape : vous paierez en ligne une fois la
            demande acceptée.
          </p>
        </div>
      </Section>
    </form>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-4">
      <legend className="mb-4 font-heading text-xl font-semibold">
        {number}. {title}
      </legend>
      {children}
    </fieldset>
  );
}

function Field({
  id,
  label,
  error,
  className,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className ?? ""}`}>
      <Label htmlFor={id}>{label}</Label>
      {children}
      {error && <p className="text-sm text-destructive">{error[0]}</p>}
    </div>
  );
}
