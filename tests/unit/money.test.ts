import { describe, expect, it } from "vitest";

import { centsToEurosInput, formatCents, parseEurosToCents } from "@/lib/money";

// Intl utilise des espaces insécables : on les normalise pour comparer.
const plain = (value: string) => value.replace(/[  ]/g, " ");

describe("formatCents", () => {
  it.each([
    [0, "0,00 €"],
    [5, "0,05 €"],
    [4990, "49,90 €"],
    [125050, "1 250,50 €"],
  ])("%i centimes → %s", (cents, expected) => {
    expect(plain(formatCents(cents))).toBe(expected);
  });
});

describe("centsToEurosInput", () => {
  it.each([
    [0, "0,00"],
    [4990, "49,90"],
    [125050, "1250,50"],
  ])("%i centimes → %s", (cents, expected) => {
    expect(centsToEurosInput(cents)).toBe(expected);
  });
});

describe("parseEurosToCents", () => {
  it.each([
    ["0", 0],
    ["12", 1200],
    ["12,5", 1250],
    ["12,50", 1250],
    ["12.50", 1250],
    ["0,05", 5],
    ["1 250,50", 125050],
    ["1 250,50", 125050],
    [" 49,90 € ", 4990],
    ["800", 80000],
  ])("« %s » → %i centimes", (input, expected) => {
    expect(parseEurosToCents(input)).toBe(expected);
  });

  it.each(["", "abc", "-5", "12,505", "12,", ",50", "1,2,3", "1e3"])(
    "refuse « %s »",
    (input) => {
      expect(parseEurosToCents(input)).toBeNull();
    },
  );

  it("fait l'aller-retour avec centsToEurosInput", () => {
    for (const cents of [0, 1, 99, 4990, 80000, 123456]) {
      expect(parseEurosToCents(centsToEurosInput(cents))).toBe(cents);
    }
  });
});
