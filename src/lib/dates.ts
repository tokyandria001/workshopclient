// Dates calendaires (sans heure), au format ISO "AAAA-MM-JJ".
//
// Dans l'application, une date de réservation est une simple chaîne
// "AAAA-MM-JJ". En base (@db.Date), elle est stockée comme un DateTime à
// minuit UTC : les conversions passent toutes par ce fichier.

export type DateOnly = string;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MS = 24 * 60 * 60 * 1000;
export const TIME_ZONE = "Europe/Paris";

/** Vérifie le format ET l'existence de la date (refuse "2027-02-30"). */
export function isDateOnly(value: unknown): value is DateOnly {
  if (typeof value !== "string") return false;
  const match = DATE_ONLY.exec(value);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return (
    date.getUTCFullYear() === y &&
    date.getUTCMonth() === m - 1 &&
    date.getUTCDate() === d
  );
}

/** "2027-03-01" → Date à minuit UTC (format attendu par Prisma pour @db.Date). */
export function toDbDate(value: DateOnly): Date {
  if (!isDateOnly(value)) throw new Error(`Date invalide : ${value}`);
  return new Date(`${value}T00:00:00.000Z`);
}

/** Date lue en base (minuit UTC) → "2027-03-01". */
export function fromDbDate(date: Date): DateOnly {
  return date.toISOString().slice(0, 10);
}

/** Date du jour à Paris, quel que soit le fuseau du serveur. */
export function todayInParis(now: Date = new Date()): DateOnly {
  // Le format suédois produit directement "AAAA-MM-JJ".
  return new Intl.DateTimeFormat("sv-SE", { timeZone: TIME_ZONE }).format(now);
}

export function addDays(value: DateOnly, days: number): DateOnly {
  return fromDbDate(new Date(toDbDate(value).getTime() + days * DAY_MS));
}

/** Nombre de jours entre deux dates, bornes incluses : 1er → 3 = 3 jours. */
export function daysInclusive(start: DateOnly, end: DateOnly): number {
  return (toDbDate(end).getTime() - toDbDate(start).getTime()) / DAY_MS + 1;
}

/** Les dates étant au format ISO, l'ordre alphabétique est l'ordre chronologique. */
export function compareDates(a: DateOnly, b: DateOnly): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

const longFormatter = new Intl.DateTimeFormat("fr-FR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

/** "2027-03-01" → "lundi 1 mars 2027" */
export function formatDateFr(value: DateOnly): string {
  return longFormatter.format(toDbDate(value));
}

/** Période lisible : "du lundi 1 mars 2027 au mercredi 3 mars 2027", ou "le …". */
export function formatPeriodFr(start: DateOnly, end: DateOnly): string {
  return start === end
    ? `le ${formatDateFr(start)}`
    : `du ${formatDateFr(start)} au ${formatDateFr(end)}`;
}
