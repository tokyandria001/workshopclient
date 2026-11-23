import type { ResourceType } from "@/generated/prisma/enums";

/** Filtres du catalogue, tels qu'ils apparaissent dans l'URL (?type=…). */
export const CATALOG_FILTERS = [
  { param: null, label: "Tout" },
  { param: "salle", label: "Salle", type: "SALLE" },
  { param: "materiel", label: "Matériel", type: "MATERIEL" },
] as const satisfies readonly {
  param: string | null;
  label: string;
  type?: ResourceType;
}[];

/** "salle" → SALLE, "materiel" → MATERIEL ; toute autre valeur → pas de filtre. */
export function parseTypeFilter(
  value: string | string[] | undefined,
): ResourceType | null {
  const param = Array.isArray(value) ? value[0] : value;
  const filter = CATALOG_FILTERS.find(
    (f) => f.param !== null && f.param === param?.toLowerCase(),
  );
  return filter && "type" in filter ? filter.type : null;
}
