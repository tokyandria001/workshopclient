import { describe, expect, it } from "vitest";

import { validatePeriod } from "@/server/reservations/rules";
import {
  HONEYPOT_FIELD,
  quantityFieldName,
  readReservationForm,
  reservationRequestSchema,
} from "@/server/reservations/schema";

const today = "2027-03-01";
const schema = reservationRequestSchema(today);

const valid = {
  startDate: "2027-03-10",
  endDate: "2027-03-12",
  items: [{ resourceId: "micro", quantity: 2 }],
  firstName: "Camille",
  lastName: "Martin",
  email: "Camille.Martin@Example.fr ",
  phone: "06 12 34 56 78",
  organization: "",
  message: "",
  termsAccepted: true,
};

function errorFields(input: object) {
  const result = schema.safeParse(input);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((i) => i.path[0]);
}

describe("validatePeriod", () => {
  it.each([
    ["2027-03-01", "2027-03-01", null],
    ["2027-03-01", "2027-03-31", null], // 31 jours : limite incluse
  ])("accepte %s → %s", (start, end, expected) => {
    expect(validatePeriod(start, end, today)).toBe(expected);
  });

  it.each([
    ["2027-02-28", "2027-03-02", "passé"],
    ["2027-03-10", "2027-03-09", "postérieure"],
    ["2027-03-01", "2027-04-01", "31 jours"], // 32 jours
    ["2028-09-01", "2028-09-02", "18 mois"],
  ])("refuse %s → %s (%s)", (start, end, message) => {
    expect(validatePeriod(start, end, today)).toContain(message);
  });
});

describe("reservationRequestSchema", () => {
  it("accepte une demande valide et normalise les champs", () => {
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      email: "camille.martin@example.fr",
      organization: undefined,
      message: undefined,
    });
  });

  it.each<[object, string]>([
    [{ startDate: "" }, "startDate"],
    [{ startDate: "2027-02-30" }, "startDate"],
    [{ endDate: "2027-03-09" }, "endDate"],
    [{ startDate: "2027-02-01", endDate: "2027-02-02" }, "endDate"],
    [{ items: [] }, "items"],
    [{ items: [{ resourceId: "micro", quantity: 0 }] }, "items"],
    [{ items: [{ resourceId: "micro", quantity: 1.5 }] }, "items"],
    [
      {
        items: [
          { resourceId: "micro", quantity: 1 },
          { resourceId: "micro", quantity: 1 },
        ],
      },
      "items",
    ],
    [{ firstName: "  " }, "firstName"],
    [{ lastName: "" }, "lastName"],
    [{ email: "pas-un-email" }, "email"],
    [{ phone: "123" }, "phone"],
    [{ phone: "06 12 34 56 7a" }, "phone"],
    [{ message: "x".repeat(2001) }, "message"],
    [{ termsAccepted: false }, "termsAccepted"],
  ])("refuse %j (champ %s)", (override, field) => {
    expect(errorFields({ ...valid, ...override })).toContain(field);
  });

  it("accepte un numéro international", () => {
    expect(
      schema.safeParse({ ...valid, phone: "+33 6 12 34 56 78" }).success,
    ).toBe(true);
  });
});

describe("readReservationForm", () => {
  function form(entries: Record<string, string>) {
    const data = new FormData();
    for (const [key, value] of Object.entries(entries)) data.set(key, value);
    return data;
  }

  it("lit les quantités et ignore les lignes à zéro", () => {
    const raw = readReservationForm(
      form({
        [quantityFieldName("salle")]: "1",
        [quantityFieldName("micro")]: "0",
        [quantityFieldName("enceinte")]: "3",
        termsAccepted: "on",
      }),
    );
    expect(raw.items).toEqual([
      { resourceId: "salle", quantity: 1 },
      { resourceId: "enceinte", quantity: 3 },
    ]);
    expect(raw.termsAccepted).toBe(true);
    expect(raw.isBot).toBe(false);
  });

  it("transmet une quantité invalide pour qu'elle soit refusée", () => {
    const raw = readReservationForm(
      form({ [quantityFieldName("micro")]: "abc" }),
    );
    expect(Number.isNaN(raw.items[0].quantity)).toBe(true);
    expect(errorFields({ ...valid, items: raw.items })).toContain("items");
  });

  it("détecte le champ piège rempli par un robot", () => {
    expect(
      readReservationForm(form({ [HONEYPOT_FIELD]: "http://spam" })).isBot,
    ).toBe(true);
  });
});
