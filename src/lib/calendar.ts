// Calculs de calendrier pour le planning (semaines commençant le lundi).
// Fonctions pures sur des dates "AAAA-MM-JJ".

import { addDays, toDbDate, type DateOnly } from "@/lib/dates";

export type CalendarView = "mois" | "semaine";

/** Jour de la semaine, lundi = 0 … dimanche = 6. */
export function weekdayIndex(date: DateOnly): number {
  return (toDbDate(date).getUTCDay() + 6) % 7;
}

export function startOfWeek(date: DateOnly): DateOnly {
  return addDays(date, -weekdayIndex(date));
}

export function startOfMonth(date: DateOnly): DateOnly {
  return `${date.slice(0, 7)}-01`;
}

export function addMonths(date: DateOnly, months: number): DateOnly {
  const d = toDbDate(startOfMonth(date));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function endOfMonth(date: DateOnly): DateOnly {
  return addDays(addMonths(date, 1), -1);
}

/** Jours affichés : la semaine, ou le mois complété en semaines entières. */
export function visibleDays(view: CalendarView, anchor: DateOnly): DateOnly[] {
  const first =
    view === "semaine"
      ? startOfWeek(anchor)
      : startOfWeek(startOfMonth(anchor));
  const last =
    view === "semaine"
      ? addDays(first, 6)
      : addDays(startOfWeek(endOfMonth(anchor)), 6);
  const days: DateOnly[] = [];
  for (let day = first; day <= last; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Période précédente / suivante pour la navigation. */
export function shiftAnchor(
  view: CalendarView,
  anchor: DateOnly,
  direction: -1 | 1,
): DateOnly {
  return view === "semaine"
    ? addDays(startOfWeek(anchor), 7 * direction)
    : addMonths(anchor, direction);
}

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const shortFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "UTC",
});

/** Titre de la période : « mars 2027 » ou « 1 mars – 7 mars 2027 ». */
export function periodTitle(view: CalendarView, anchor: DateOnly): string {
  if (view === "mois") return monthFormatter.format(toDbDate(anchor));
  const start = startOfWeek(anchor);
  const end = addDays(start, 6);
  return `${shortFormatter.format(toDbDate(start))} – ${shortFormatter.format(
    toDbDate(end),
  )} ${end.slice(0, 4)}`;
}
