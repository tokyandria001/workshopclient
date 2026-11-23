import { describe, expect, it } from "vitest";

import { safeAdminRedirect } from "@/server/auth/redirect";

describe("safeAdminRedirect", () => {
  it.each([
    "/admin",
    "/admin/reservations",
    "/admin/reservations?statut=EN_ATTENTE",
    "/admin#planning",
  ])("accepte le chemin interne %s", (target) => {
    expect(safeAdminRedirect(target)).toBe(target);
  });

  it.each<[string | null, string]>([
    ["https://site-malveillant.fr", "URL externe"],
    ["//site-malveillant.fr/admin", "URL sans protocole"],
    ["/admin\\..\\site-malveillant.fr", "antislash"],
    ["/", "hors back-office"],
    ["/administration", "faux préfixe"],
    ["/admin/connexion", "page de connexion (boucle)"],
    ["/admin/connexion?callbackUrl=/admin", "page de connexion avec paramètre"],
    ["", "vide"],
    [null, "absent"],
  ])("renvoie vers /admin pour %s (%s)", (target) => {
    expect(safeAdminRedirect(target)).toBe("/admin");
  });
});
