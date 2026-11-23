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
