import { describe, expect, it } from "vitest";

import { seedPages, seedResources, seedSettings } from "../../prisma/seed-data";

describe("Données de seed", () => {
  it("contient une salle et 5 matériels", () => {
    expect(seedResources.filter((r) => r.type === "SALLE")).toHaveLength(1);
    expect(seedResources.filter((r) => r.type === "MATERIEL")).toHaveLength(5);
  });

  it("utilise des identifiants uniques", () => {
    const ids = seedResources.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("exprime les montants en centimes entiers positifs", () => {
    for (const r of seedResources) {
      expect(Number.isInteger(r.priceCents)).toBe(true);
      expect(Number.isInteger(r.depositCents)).toBe(true);
      expect(r.priceCents).toBeGreaterThan(0);
      expect(r.depositCents).toBeGreaterThanOrEqual(0);
    }
  });

  it("propose la salle en quantité 1", () => {
    const salle = seedResources.find((r) => r.type === "SALLE");
    expect(salle?.quantityTotal).toBe(1);
  });

  it("crée toutes les pages de la vitrine", () => {
    expect(seedPages.map((p) => p.slug).sort()).toEqual([
      "accueil",
      "association",
      "conditions-generales",
      "confidentialite",
      "mentions-legales",
    ]);
  });

  it("fixe le délai de paiement par défaut à 72 h", () => {
    expect(seedSettings["paiement.delaiHeures"]).toBe("72");
  });
});
