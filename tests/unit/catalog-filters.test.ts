import { describe, expect, it } from "vitest";

import { parseTypeFilter } from "@/server/catalog/filters";

describe("parseTypeFilter", () => {
  it.each([
    ["salle", "SALLE"],
    ["materiel", "MATERIEL"],
    ["SALLE", "SALLE"],
    [["materiel", "salle"], "MATERIEL"],
  ] as const)("%j → %s", (value, expected) => {
    expect(parseTypeFilter(value as string | string[])).toBe(expected);
  });

  it.each([undefined, "", "tout", "pizzeria", "matériel", []])(
    "%j → aucun filtre",
    (value) => {
      expect(
        parseTypeFilter(value as string | string[] | undefined),
      ).toBeNull();
    },
  );
});
