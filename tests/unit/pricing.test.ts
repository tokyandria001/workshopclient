import { describe, expect, it } from "vitest";

import {
  computeQuote,
  lineSubtotal,
  type PricedResource,
} from "@/server/reservations/pricing";

const salle: PricedResource = {
  id: "salle",
  name: "Salle",
  priceCents: 80000,
  priceUnit: "JOUR",
  depositCents: 150000,
};
const video: PricedResource = {
  id: "video",
  name: "Vidéoprojecteur",
  priceCents: 5000,
  priceUnit: "FORFAIT",
  depositCents: 40000,
};
const micro: PricedResource = {
  id: "micro",
  name: "Micro",
  priceCents: 1550,
  priceUnit: "JOUR",
  depositCents: 10000,
};

describe("lineSubtotal", () => {
  it("multiplie tarif × quantité × jours pour un tarif à la journée", () => {
    expect(lineSubtotal(1550, "JOUR", 3, 2)).toBe(9300);
  });

  it("ignore le nombre de jours pour un forfait", () => {
    expect(lineSubtotal(5000, "FORFAIT", 2, 10)).toBe(10000);
  });

  it("reste en centimes entiers", () => {
    expect(Number.isInteger(lineSubtotal(1999, "JOUR", 7, 13))).toBe(true);
  });
});

describe("computeQuote", () => {
  it("calcule les lignes, le total et la caution (bornes incluses)", () => {
    // Du 1er au 3 mars = 3 jours.
    const quote = computeQuote({ start: "2027-03-01", end: "2027-03-03" }, [
      { resource: salle, quantity: 1 },
      { resource: video, quantity: 1 },
      { resource: micro, quantity: 2 },
    ]);
    expect(quote.days).toBe(3);
    expect(quote.lines.map((l) => l.subtotalCents)).toEqual([
      240000, // 800 € × 1 × 3 j
      5000, // forfait 50 €
      9300, // 15,50 € × 2 × 3 j
    ]);
    expect(quote.totalCents).toBe(254300);
    // Caution par unité : 1 500 € + 400 € + 2 × 100 € = 2 100 €.
    expect(quote.depositCents).toBe(210000);
  });

  it("compte une location d'un seul jour comme 1 jour", () => {
    const quote = computeQuote({ start: "2027-03-01", end: "2027-03-01" }, [
      { resource: micro, quantity: 1 },
    ]);
    expect(quote.days).toBe(1);
    expect(quote.totalCents).toBe(1550);
  });

  it("gère un changement de mois", () => {
    const quote = computeQuote({ start: "2027-02-27", end: "2027-03-02" }, [
      { resource: micro, quantity: 1 },
    ]);
    expect(quote.days).toBe(4); // 27, 28 février, 1er, 2 mars
  });

  it("renvoie zéro sans ressource", () => {
    const quote = computeQuote({ start: "2027-03-01", end: "2027-03-02" }, []);
    expect(quote).toMatchObject({ totalCents: 0, depositCents: 0, lines: [] });
  });
});
