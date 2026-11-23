"use client";

import { useActionState, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceFormState } from "@/server/resources/actions";
import type { ResourceFormValues } from "@/server/resources/schema";

type Props = {
  action: (
    previous: ResourceFormState,
    formData: FormData,
  ) => Promise<ResourceFormState>;
  initialValues: ResourceFormValues;
  submitLabel: string;
};

export function ResourceForm({ action, initialValues, submitLabel }: Props) {
  const [state, formAction, pending] = useActionState(action, {});
  const values = state.values ?? initialValues;
  const errors = state.fieldErrors ?? {};
  // Type choisi, suivi pour adapter le champ quantité (salle = 1).
  // Après chaque envoi, React réinitialise le formulaire sur les valeurs
  // renvoyées par le serveur : on recale alors ce suivi sur ces valeurs.
  const [type, setType] = useState(values.type);
  const [syncedValues, setSyncedValues] = useState(state.values);
  if (state.values !== syncedValues) {
    setSyncedValues(state.values);
    setType(values.type);
  }
  const isRoom = type === "SALLE";

  return (
    <form action={formAction} className="flex flex-col gap-5" noValidate>
      {state.error && (
        <Alert variant="destructive">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <Field id="type" label="Type" error={errors.type}>
        <NativeSelect
          id="type"
          name="type"
          className="w-full"
          // Non contrôlé : un champ contrôlé serait remis sur la première
          // option par la réinitialisation du formulaire après l'envoi.
          defaultValue={values.type}
          onChange={(event) => setType(event.target.value)}
          aria-invalid={Boolean(errors.type)}
          aria-describedby={errors.type ? "type-error" : undefined}
        >
          <NativeSelectOption value="" disabled>
            Choisir…
          </NativeSelectOption>
          <NativeSelectOption value="SALLE">Salle</NativeSelectOption>
          <NativeSelectOption value="MATERIEL">Matériel</NativeSelectOption>
        </NativeSelect>
      </Field>

      <Field id="name" label="Nom" error={errors.name}>
        <Input
          id="name"
          name="name"
          defaultValue={values.name}
          maxLength={100}
          aria-invalid={Boolean(errors.name)}
          aria-describedby={errors.name ? "name-error" : undefined}
        />
      </Field>

      <Field id="description" label="Description" error={errors.description}>
        <Textarea
          id="description"
          name="description"
          rows={5}
          defaultValue={values.description}
          maxLength={5000}
          aria-invalid={Boolean(errors.description)}
          aria-describedby={
            errors.description ? "description-error" : undefined
          }
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="price" label="Tarif (€)" error={errors.price}>
          <Input
            id="price"
            name="price"
            inputMode="decimal"
            placeholder="ex. 49,90"
            defaultValue={values.price}
            aria-invalid={Boolean(errors.price)}
            aria-describedby={errors.price ? "price-error" : undefined}
          />
        </Field>

        <Field id="priceUnit" label="Unité de tarif" error={errors.priceUnit}>
          <NativeSelect
            id="priceUnit"
            name="priceUnit"
            className="w-full"
            defaultValue={values.priceUnit}
            aria-invalid={Boolean(errors.priceUnit)}
            aria-describedby={errors.priceUnit ? "priceUnit-error" : undefined}
          >
            <NativeSelectOption value="JOUR">Par jour</NativeSelectOption>
            <NativeSelectOption value="FORFAIT">Forfait</NativeSelectOption>
          </NativeSelect>
        </Field>

        <Field id="deposit" label="Caution (€)" error={errors.deposit}>
          <Input
            id="deposit"
            name="deposit"
            inputMode="decimal"
            placeholder="0"
            defaultValue={values.deposit}
            aria-invalid={Boolean(errors.deposit)}
            aria-describedby={errors.deposit ? "deposit-error" : undefined}
          />
        </Field>

        <Field
          id="quantityTotal"
          label="Quantité totale"
          error={errors.quantityTotal}
          hint={
            isRoom ? "La salle se réserve toujours en quantité 1." : undefined
          }
        >
          <Input
            id="quantityTotal"
            name="quantityTotal"
            type="number"
            inputMode="numeric"
            min={1}
            step={1}
            // La salle : quantité imposée à 1.
            key={isRoom ? "salle" : "materiel"}
            defaultValue={isRoom ? "1" : values.quantityTotal}
            readOnly={isRoom}
            aria-invalid={Boolean(errors.quantityTotal)}
            aria-describedby={
              errors.quantityTotal
                ? "quantityTotal-error"
                : "quantityTotal-hint"
            }
          />
        </Field>
      </div>

      <div className="flex items-start gap-3">
        <input
          id="active"
          name="active"
          type="checkbox"
          defaultChecked={values.active}
          className="mt-0.5 size-4 accent-primary"
        />
        <div className="flex flex-col gap-1">
          <Label htmlFor="active">Active</Label>
          <p className="text-sm text-muted-foreground">
            Une ressource inactive n&apos;apparaît pas dans le catalogue public.
          </p>
        </div>
      </div>

      <div>
        <Button type="submit" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Enregistrement…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string[];
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && (
        <p id={`${id}-hint`} className="text-sm text-muted-foreground">
          {hint}
        </p>
      )}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error[0]}
        </p>
      )}
    </div>
  );
}
