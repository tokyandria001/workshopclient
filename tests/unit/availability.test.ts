import { describe, expect, it } from "vitest";

import type { ReservationStatus } from "@/generated/prisma/enums";
import {
  availableQuantity,
  findUnavailable,
  peakReservedQuantity,
  periodsOverlap,
  type ExistingBooking,
  type StockResource,
} from "@/server/availability/availability";

const salle: StockResource = { id: "salle", type: "SALLE", quantityTotal: 1 };
const micros: StockResource = {
  id: "micros",
  type: "MATERIEL",
  quantityTotal: 4,
};

function booking(
  start: string,
  end: string,
  quantity = 1,
  status: ReservationStatus = "CONFIRMEE",
  resourceId = "micros",
): ExistingBooking {
  return { resourceId, start, end, quantity, status };
}

const period = { start: "2027-03-10", end: "2027-03-12" };

describe("periodsOverlap (bornes incluses)", () => {
  it.each([
    ["identiques", "2027-03-10", "2027-03-12", true],
    ["contenue", "2027-03-11", "2027-03-11", true],
    ["englobante", "2027-03-01", "2027-03-31", true],
    ["chevauche le début", "2027-03-08", "2027-03-10", true],
    ["chevauche la fin", "2027-03-12", "2027-03-15", true],
    ["finit la veille", "2027-03-05", "2027-03-09", false],
    ["commence le lendemain", "2027-03-13", "2027-03-20", false],
  ])("%s → %s", (_label, start, end, expected) => {
    expect(periodsOverlap(period, { start, end })).toBe(expected);
    // Relation symétrique.
    expect(periodsOverlap({ start, end }, period)).toBe(expected);
  });

  it("gère un changement de mois et d'année", () => {
    expect(
      periodsOverlap(
        { start: "2027-12-30", end: "2028-01-02" },
        { start: "2028-01-01", end: "2028-01-01" },
      ),
    ).toBe(true);
  });
});

describe("statuts bloquants", () => {
  it.each<[ReservationStatus, boolean]>([
    ["EN_ATTENTE", true],
    ["A_PAYER", true],
    ["CONFIRMEE", true],
    ["EN_COURS", true],
    ["EXPIREE", false],
    ["TERMINEE", false],
    ["REFUSEE", false],
    ["ANNULEE", false],
  ])("%s bloque le stock : %s", (status, blocks) => {
    const bookings = [booking("2027-03-10", "2027-03-12", 4, status)];
    expect(availableQuantity(micros, period, bookings)).toBe(blocks ? 0 : 4);
  });
});

describe("salle", () => {
  it("est disponible sans réservation", () => {
    expect(availableQuantity(salle, period, [])).toBe(1);
  });

  it("est indisponible si une réservation chevauche, même d'un seul jour", () => {
    const bookings = [
      booking("2027-03-12", "2027-03-14", 1, "EN_ATTENTE", "salle"),
    ];
    expect(availableQuantity(salle, period, bookings)).toBe(0);
  });

  it("est disponible si la réservation précédente finit la veille", () => {
    const bookings = [
      booking("2027-03-01", "2027-03-09", 1, "CONFIRMEE", "salle"),
    ];
    expect(availableQuantity(salle, period, bookings)).toBe(1);
  });

  it("ignore les réservations d'autres ressources", () => {
    const bookings = [booking("2027-03-10", "2027-03-12", 4)];
    expect(availableQuantity(salle, period, bookings)).toBe(1);
  });
});

describe("matériel : pic journalier", () => {
  it("retire la quantité d'une réservation qui chevauche", () => {
    expect(
      availableQuantity(micros, period, [
        booking("2027-03-11", "2027-03-11", 3),
      ]),
    ).toBe(1);
  });

  it("additionne les réservations présentes le même jour", () => {
    const bookings = [
      booking("2027-03-10", "2027-03-12", 1),
      booking("2027-03-11", "2027-03-15", 2),
    ];
    expect(peakReservedQuantity(period, bookings)).toBe(3);
    expect(availableQuantity(micros, period, bookings)).toBe(1);
  });

  it("n'additionne pas des réservations qui se suivent sans se chevaucher", () => {
    // 2 micros du 10 au 10, puis 2 micros du 12 au 12 : jamais plus de 2 sortis.
    const bookings = [
      booking("2027-03-10", "2027-03-10", 2),
      booking("2027-03-12", "2027-03-12", 2),
    ];
    expect(availableQuantity(micros, period, bookings)).toBe(2);
  });

  it("ne compte que la partie de la réservation comprise dans la période", () => {
    const bookings = [
      booking("2027-03-01", "2027-03-10", 2), // touche le 1er jour
      booking("2027-03-12", "2027-03-30", 2), // touche le dernier jour
    ];
    expect(peakReservedQuantity(period, bookings)).toBe(2);
  });

  it("ignore les réservations hors période", () => {
    const bookings = [
      booking("2027-03-01", "2027-03-09", 4),
      booking("2027-03-13", "2027-03-20", 4),
    ];
    expect(availableQuantity(micros, period, bookings)).toBe(4);
  });

  it("ne descend jamais sous zéro (stock réduit après coup)", () => {
    const bookings = [booking("2027-03-10", "2027-03-12", 6)];
    expect(availableQuantity(micros, period, bookings)).toBe(0);
  });

  it("fonctionne sur une période d'un seul jour", () => {
    const oneDay = { start: "2027-03-11", end: "2027-03-11" };
    expect(
      availableQuantity(micros, oneDay, [
        booking("2027-03-10", "2027-03-12", 1),
      ]),
    ).toBe(3);
  });
});

describe("findUnavailable", () => {
  const resources = [salle, micros];

  it("accepte une demande qui tient dans le stock", () => {
    expect(
      findUnavailable(
        [
          { resourceId: "salle", quantity: 1 },
          { resourceId: "micros", quantity: 4 },
        ],
        resources,
        period,
        [],
      ),
    ).toEqual([]);
  });

  it("signale chaque ressource en défaut avec la quantité disponible", () => {
    const bookings = [
      booking("2027-03-10", "2027-03-10", 1, "A_PAYER", "salle"),
      booking("2027-03-11", "2027-03-11", 3),
    ];
    expect(
      findUnavailable(
        [
          { resourceId: "salle", quantity: 1 },
          { resourceId: "micros", quantity: 2 },
        ],
        resources,
        period,
        bookings,
      ),
    ).toEqual([
      { resourceId: "salle", requested: 1, available: 0 },
      { resourceId: "micros", requested: 2, available: 1 },
    ]);
  });

  it("accepte exactement la quantité restante (borne)", () => {
    const bookings = [booking("2027-03-11", "2027-03-11", 3)];
    expect(
      findUnavailable(
        [{ resourceId: "micros", quantity: 1 }],
        resources,
        period,
        bookings,
      ),
    ).toEqual([]);
  });

  it("refuse une ressource inconnue ou inactive (absente de la liste)", () => {
    expect(
      findUnavailable(
        [{ resourceId: "inconnue", quantity: 1 }],
        resources,
        period,
        [],
      ),
    ).toEqual([{ resourceId: "inconnue", requested: 1, available: 0 }]);
  });
});
