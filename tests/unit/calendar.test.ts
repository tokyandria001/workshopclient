import { describe, expect, it } from "vitest";

import {
  addMonths,
  endOfMonth,
  periodTitle,
  shiftAnchor,
  startOfWeek,
  visibleDays,
  weekdayIndex,
} from "@/lib/calendar";

describe("semaines (lundi en premier)", () => {
  it("numérote lundi 0 et dimanche 6", () => {
    expect(weekdayIndex("2027-03-01")).toBe(0); // lundi
    expect(weekdayIndex("2027-03-07")).toBe(6); // dimanche
  });

  it("trouve le lundi de la semaine", () => {
    expect(startOfWeek("2027-03-04")).toBe("2027-03-01");
    expect(startOfWeek("2027-03-07")).toBe("2027-03-01");
    expect(startOfWeek("2027-01-01")).toBe("2026-12-28");
  });
});

describe("mois", () => {
  it("ajoute des mois sans déborder", () => {
    expect(addMonths("2027-01-31", 1)).toBe("2027-02-01");
    expect(addMonths("2027-12-15", 1)).toBe("2028-01-01");
    expect(addMonths("2027-01-10", -1)).toBe("2026-12-01");
  });

  it("trouve le dernier jour du mois", () => {
    expect(endOfMonth("2027-02-10")).toBe("2027-02-28");
    expect(endOfMonth("2028-02-10")).toBe("2028-02-29");
  });
});

describe("visibleDays", () => {
  it("affiche 7 jours en vue semaine, du lundi au dimanche", () => {
    const days = visibleDays("semaine", "2027-03-04");
    expect(days).toHaveLength(7);
    expect(days[0]).toBe("2027-03-01");
    expect(days[6]).toBe("2027-03-07");
  });

  it("complète le mois en semaines entières", () => {
    // Mars 2027 : du lundi 1er au mercredi 31 → jusqu'au dimanche 4 avril.
    const days = visibleDays("mois", "2027-03-15");
    expect(days[0]).toBe("2027-03-01");
    expect(days.at(-1)).toBe("2027-04-04");
    expect(days.length % 7).toBe(0);
  });

  it("commence avant le 1er si le mois ne débute pas un lundi", () => {
    // Avril 2027 commence un jeudi.
    expect(visibleDays("mois", "2027-04-20")[0]).toBe("2027-03-29");
  });
});

describe("navigation et titres", () => {
  it("passe à la période suivante ou précédente", () => {
    expect(shiftAnchor("semaine", "2027-03-04", 1)).toBe("2027-03-08");
    expect(shiftAnchor("mois", "2027-03-04", -1)).toBe("2027-02-01");
  });

  it("affiche un titre lisible", () => {
    expect(periodTitle("mois", "2027-03-04")).toBe("mars 2027");
    expect(periodTitle("semaine", "2027-03-04")).toBe("1 mars – 7 mars 2027");
  });
});
