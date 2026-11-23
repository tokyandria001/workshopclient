// Tous les montants sont stockés en centimes (entiers) : voir section 7.3.

const euroFormatter = new Intl.NumberFormat("fr-FR", {
  style: "currency",
  currency: "EUR",
});

/** 125050 → "1 250,50 €" */
export function formatCents(cents: number): string {
  return euroFormatter.format(cents / 100);
}

/** 125050 → "1250,50" (valeur d'un champ de formulaire). */
export function centsToEurosInput(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

/**
 * Convertit une saisie en euros vers des centimes.
 * Accepte "12", "12,5", "12.50", "1 250,50" ; refuse plus de 2 décimales,
 * les nombres négatifs et les valeurs non numériques (retourne `null`).
 */
export function parseEurosToCents(input: string): number | null {
  const normalized = input
    .trim()
    .replace(/[\s  ]/g, "")
    .replace("€", "")
    .replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(normalized)) return null;

  const [euros, decimals = ""] = normalized.split(".");
  const cents = Number(euros) * 100 + Number(decimals.padEnd(2, "0"));
  return Number.isSafeInteger(cents) ? cents : null;
}
