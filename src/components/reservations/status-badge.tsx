import type { ReservationStatus } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";
import { STATUS_SHORT_LABELS } from "@/server/reservations/status";

/** Code couleur des statuts, commun aux listes, fiches et au planning. */
export const STATUS_COLORS: Record<ReservationStatus, string> = {
  EN_ATTENTE: "bg-amber-100 text-amber-900 border-amber-300",
  A_PAYER: "bg-sky-100 text-sky-900 border-sky-300",
  CONFIRMEE: "bg-emerald-100 text-emerald-900 border-emerald-300",
  EN_COURS: "bg-violet-100 text-violet-900 border-violet-300",
  TERMINEE: "bg-slate-100 text-slate-700 border-slate-300",
  EXPIREE: "bg-stone-100 text-stone-700 border-stone-300",
  REFUSEE: "bg-rose-100 text-rose-900 border-rose-300",
  ANNULEE: "bg-rose-100 text-rose-900 border-rose-300",
};

export function StatusBadge({
  status,
  className,
}: {
  status: ReservationStatus;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        STATUS_COLORS[status],
        className,
      )}
    >
      {STATUS_SHORT_LABELS[status]}
    </span>
  );
}
