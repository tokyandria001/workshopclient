import { afterEach, describe, expect, it, vi } from "vitest";

import { MAX_IMAGE_BYTES, resourceImageUrl } from "@/lib/resource-images";
import {
  parseResourceForm,
  readResourceForm,
  validateImageFile,
  type ResourceFormValues,
} from "@/server/resources/schema";

const valid: ResourceFormValues = {
  type: "MATERIEL",
  name: "Enceinte",
  description: "Enceinte amplifiée 1000 W.",
  price: "40",
  priceUnit: "JOUR",
  deposit: "300,00",
  quantityTotal: "4",
  active: true,
};

function errorsOf(values: ResourceFormValues) {
  const result = parseResourceForm(values);
  expect(result.success).toBe(false);
  return result.success ? [] : result.error.issues.map((i) => i.path[0]);
}

describe("parseResourceForm", () => {
  it("convertit une saisie valide (montants en centimes)", () => {
    const result = parseResourceForm(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      type: "MATERIEL",
      name: "Enceinte",
      description: "Enceinte amplifiée 1000 W.",
      priceCents: 4000,
      priceUnit: "JOUR",
      depositCents: 30000,
      quantityTotal: 4,
      active: true,
    });
  });

  it("supprime les espaces autour du nom et de la description", () => {
    const result = parseResourceForm({
      ...valid,
      name: "  Enceinte  ",
      description: " Texte ",
    });
    expect(result.data?.name).toBe("Enceinte");
    expect(result.data?.description).toBe("Texte");
  });

  it("impose la quantité 1 pour la salle", () => {
    expect(errorsOf({ ...valid, type: "SALLE", quantityTotal: "2" })).toEqual([
      "quantityTotal",
    ]);
    expect(
      parseResourceForm({ ...valid, type: "SALLE", quantityTotal: "1" })
        .success,
    ).toBe(true);
  });

  it.each<[Partial<ResourceFormValues>, string]>([
    [{ type: "" }, "type"],
    [{ type: "PIZZA" }, "type"],
    [{ name: "A" }, "name"],
    [{ name: "x".repeat(101) }, "name"],
    [{ description: "   " }, "description"],
    [{ price: "" }, "priceCents"],
    [{ price: "gratuit" }, "priceCents"],
    [{ price: "-10" }, "priceCents"],
    [{ deposit: "12,345" }, "depositCents"],
    [{ priceUnit: "HEURE" }, "priceUnit"],
    [{ quantityTotal: "0" }, "quantityTotal"],
    [{ quantityTotal: "1,5" }, "quantityTotal"],
    [{ quantityTotal: "abc" }, "quantityTotal"],
  ])("refuse %j (champ %s)", (override, field) => {
    expect(errorsOf({ ...valid, ...override })).toContain(field);
  });
});

describe("readResourceForm", () => {
  it("lit les champs et la case à cocher", () => {
    const formData = new FormData();
    formData.set("name", "Micro");
    formData.set("active", "on");
    const values = readResourceForm(formData);
    expect(values.name).toBe("Micro");
    expect(values.active).toBe(true);
    expect(values.price).toBe("");
  });

  it("considère une case non cochée comme inactive", () => {
    expect(readResourceForm(new FormData()).active).toBe(false);
  });
});

describe("validateImageFile", () => {
  const file = (type: string, size: number) =>
    new File([new Uint8Array(size)], "photo", { type });

  it("accepte JPEG, PNG et WebP sous 4 Mo", () => {
    for (const type of ["image/jpeg", "image/png", "image/webp"]) {
      expect(validateImageFile(file(type, 1000)).ok).toBe(true);
    }
  });

  it.each([
    [null, "Choisissez"],
    ["texte", "Choisissez"],
  ])("refuse une valeur qui n'est pas un fichier (%s)", (value, message) => {
    const result = validateImageFile(value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain(message);
  });

  it("refuse un fichier vide", () => {
    expect(validateImageFile(file("image/png", 0)).ok).toBe(false);
  });

  it("refuse un format non autorisé", () => {
    const result = validateImageFile(file("image/gif", 1000));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("Format non accepté");
  });

  it("refuse un fichier de plus de 4 Mo", () => {
    const result = validateImageFile(file("image/jpeg", MAX_IMAGE_BYTES + 1));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain("4 Mo");
  });
});

describe("resourceImageUrl", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("construit l'URL publique à partir du chemin stocké", () => {
    vi.stubEnv("STORAGE_URL", "https://abc.supabase.co/");
    expect(resourceImageUrl("res-1/photo.jpg")).toBe(
      "https://abc.supabase.co/storage/v1/object/public/ressources/res-1/photo.jpg",
    );
  });
});
