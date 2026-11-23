import { describe, expect, it } from "vitest";

import {
  addDays,
  daysInclusive,
  formatDateFr,
  formatPeriodFr,
  fromDbDate,
  isDateOnly,
  toDbDate,
  todayInParis,
} from "@/lib/dates";

describe("isDateOnly", () => {
  it.each(["2027-03-01", "2028-02-29", "2027-12-31"])("accepte %s", (v) => {
    expect(isDateOnly(v)).toBe(true);
  });

  it.each([
    "2027-02-29", // 2027 n'est pas bissextile
    "2027-02-30",
    "2027-13-01",
    "2027-3-1",
    "01/03/2027",
    "",
    null,
    20270301,
  ])("refuse %j", (v) => {
    expect(isDateOnly(v)).toBe(false);
  });
});

describe("conversions base de données", () => {
  it("stocke à minuit UTC et relit la même date", () => {
    const db = toDbDate("2027-03-01");
    expect(db.toISOString()).toBe("2027-03-01T00:00:00.000Z");
    expect(fromDbDate(db)).toBe("2027-03-01");
  });

  it("refuse une date invalide", () => {
    expect(() => toDbDate("2027-02-30")).toThrow();
  });
});

describe("todayInParis", () => {
  it("utilise le jour à Paris, pas le jour UTC", () => {
    // 23 h 30 UTC le 31 décembre = 0 h 30 le 1er janvier à Paris (UTC+1).
    expect(todayInParis(new Date("2026-12-31T23:30:00Z"))).toBe("2027-01-01");
    // 22 h 30 UTC le 30 juin = 0 h 30 le 1er juillet à Paris (UTC+2, été).
    expect(todayInParis(new Date("2027-06-30T22:30:00Z"))).toBe("2027-07-01");
  });
});

describe("calculs de jours", () => {
  it("compte les jours bornes incluses", () => {
    expect(daysInclusive("2027-03-01", "2027-03-01")).toBe(1);
    expect(daysInclusive("2027-03-01", "2027-03-03")).toBe(3);
    expect(daysInclusive("2027-02-28", "2027-03-01")).toBe(2);
  });

  it("n'est pas faussé par le passage à l'heure d'été", () => {
    // Changement d'heure en France le 28 mars 2027.
    expect(daysInclusive("2027-03-27", "2027-03-29")).toBe(3);
    expect(addDays("2027-03-27", 2)).toBe("2027-03-29");
  });

  it("ajoute des jours en changeant de mois et d'année", () => {
    expect(addDays("2027-12-31", 1)).toBe("2028-01-01");
    expect(addDays("2027-03-01", -1)).toBe("2027-02-28");
  });
});

describe("formatage en français", () => {
  it("affiche une date longue", () => {
    expect(formatDateFr("2027-03-01")).toBe("lundi 1 mars 2027");
  });

  it("affiche une période ou un jour unique", () => {
    expect(formatPeriodFr("2027-03-01", "2027-03-03")).toBe(
      "du lundi 1 mars 2027 au mercredi 3 mars 2027",
    );
    expect(formatPeriodFr("2027-03-01", "2027-03-01")).toBe(
      "le lundi 1 mars 2027",
    );
  });
});
