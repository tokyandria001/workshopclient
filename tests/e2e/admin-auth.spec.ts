import { expect, test } from "@playwright/test";

import {
  adminEmail as email,
  adminPassword as password,
  fillLogin,
  SERVER_TIMEOUT as LOGIN_TIMEOUT,
} from "./helpers";

test.describe("Authentification du back-office", () => {
  test.beforeAll(() => {
    test.skip(
      !email || !password,
      "SEED_ADMIN_EMAIL et SEED_ADMIN_PASSWORD doivent être définis dans .env",
    );
  });

  test("redirige vers la connexion sans session", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/connexion\?callbackUrl=%2Fadmin$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Connexion" }),
    ).toBeVisible();
  });

  test("refuse un mauvais mot de passe", async ({ page }) => {
    await page.goto("/admin/connexion");
    await fillLogin(page, email, "mauvais-mot-de-passe");
    await expect(
      page.getByText("E-mail ou mot de passe incorrect."),
    ).toBeVisible(LOGIN_TIMEOUT);
    await expect(page).toHaveURL(/\/admin\/connexion/);
  });

  test("signale un e-mail invalide", async ({ page }) => {
    await page.goto("/admin/connexion");
    await fillLogin(page, "pas-un-email", "x");
    await expect(page.getByText("Adresse e-mail invalide.")).toBeVisible();
  });

  test("ne renvoie jamais le cookie de session hors connexion", async ({
    page,
  }) => {
    // Si une page renvoyait le cookie de session (prolongation), une requête
    // en arrière-plan terminée après la déconnexion pourrait recréer la
    // session. Seules la connexion et la déconnexion écrivent ce cookie.
    await page.goto("/admin");
    await fillLogin(page, email, password);
    await expect(page).toHaveURL(/\/admin$/, LOGIN_TIMEOUT);

    for (const path of ["/admin", "/admin/ressources", "/admin/connexion"]) {
      const response = await page.request.get(path, { maxRedirects: 0 });
      const setCookie = response
        .headersArray()
        .filter((h) => h.name.toLowerCase() === "set-cookie")
        .map((h) => h.value)
        .join("\n");
      expect(setCookie, `en-tête Set-Cookie sur ${path}`).not.toContain(
        "session-token",
      );
    }
  });

  test("connecte puis déconnecte l'administrateur", async ({ page }) => {
    await page.goto("/admin");
    await fillLogin(page, email, password);

    // Retour sur la page demandée au départ.
    await expect(page).toHaveURL(/\/admin$/, LOGIN_TIMEOUT);
    await expect(
      page.getByRole("heading", { level: 1, name: "Tableau de bord" }),
    ).toBeVisible();

    // Déjà connecté : la page de connexion renvoie au tableau de bord.
    await page.goto("/admin/connexion");
    await expect(page).toHaveURL(/\/admin$/);

    await page.getByRole("button", { name: "Se déconnecter" }).click();
    await expect(page).toHaveURL(/\/admin\/connexion$/, LOGIN_TIMEOUT);
    // Le cookie de session doit avoir été supprimé.
    await expect
      .poll(async () =>
        (await page.context().cookies()).some((cookie) =>
          cookie.name.includes("authjs.session-token"),
        ),
      )
      .toBe(false);

    // Après déconnexion, le back-office est de nouveau inaccessible.
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/connexion/);
  });
});
