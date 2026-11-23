import { expect, test, type Page } from "@playwright/test";

import { hasAdminCredentials, loginAsAdmin, SERVER_TIMEOUT } from "./helpers";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  );
  expect(overflow).toBe(false);
}

test.describe("Catalogue public", () => {
  test("liste la salle et le matériel actifs", async ({ page }) => {
    await page.goto("/catalogue");
    await expect(
      page.getByRole("heading", { level: 1, name: "Catalogue" }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Salle de spectacle" }),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(
      page.getByRole("link", { name: "Enceinte amplifiée" }),
    ).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("filtre par type", async ({ page }) => {
    await page.goto("/catalogue");
    const filters = page.getByRole("navigation", { name: "Filtrer par type" });

    await filters.getByRole("link", { name: "Salle" }).click();
    await expect(page).toHaveURL(/\/catalogue\?type=salle$/);
    await expect(
      page.getByRole("link", { name: "Salle de spectacle" }),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(
      page.getByRole("link", { name: "Enceinte amplifiée" }),
    ).toHaveCount(0);
    await expect(filters.getByRole("link", { name: "Salle" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await filters.getByRole("link", { name: "Matériel" }).click();
    await expect(page).toHaveURL(/\/catalogue\?type=materiel$/);
    await expect(
      page.getByRole("link", { name: "Enceinte amplifiée" }),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(
      page.getByRole("link", { name: "Salle de spectacle" }),
    ).toHaveCount(0);
  });

  test("affiche la fiche d'une ressource", async ({ page }) => {
    await page.goto("/catalogue?type=materiel");
    await page.getByRole("link", { name: "Enceinte amplifiée" }).click();

    await expect(
      page.getByRole("heading", { level: 1, name: "Enceinte amplifiée" }),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(page).toHaveTitle(/Enceinte amplifiée/);
    for (const label of ["Tarif", "Caution", "Quantité disponible"]) {
      await expect(page.getByText(label, { exact: true })).toBeVisible();
    }
    await expect(page.getByText(/€/).first()).toBeVisible();
    await expectNoHorizontalScroll(page);
  });

  test("n'affiche pas la quantité pour la salle", async ({ page }) => {
    await page.goto("/catalogue?type=salle");
    await page.getByRole("link", { name: "Salle de spectacle" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Salle de spectacle" }),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(page.getByText("Quantité disponible")).toHaveCount(0);
  });

  test("indique une ressource introuvable", async ({ page }) => {
    await page.goto("/catalogue/inexistante");
    await expect(
      page.getByRole("heading", { level: 1, name: "Ressource introuvable" }),
    ).toBeVisible(SERVER_TIMEOUT);
  });

  test("masque immédiatement une ressource désactivée", async ({
    page,
  }, testInfo) => {
    test.skip(!hasAdminCredentials, "Identifiants du seed absents de .env");
    test.setTimeout(90_000);
    const name = `Test e2e catalogue ${testInfo.project.name} ${Date.now()}`;

    // Création d'une ressource active dans le back-office.
    await loginAsAdmin(page, "/admin/ressources/nouvelle");
    await page.getByLabel("Nom").fill(name);
    await page
      .getByLabel("Description")
      .fill("Ressource de test du catalogue.");
    await page.getByLabel("Tarif (€)").fill("10");
    await page.getByRole("button", { name: "Créer la ressource" }).click();
    await expect(page.getByText("Ressource créée.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    const adminUrl = page.url().replace(/\?.*$/, "");
    const publicUrl = adminUrl.replace("/admin/ressources/", "/catalogue/");

    // Visible tout de suite dans le catalogue public et sur sa fiche.
    await page.goto("/catalogue");
    await expect(page.getByRole("link", { name })).toBeVisible(SERVER_TIMEOUT);
    await page.goto(publicUrl);
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible(
      SERVER_TIMEOUT,
    );

    // Désactivation → disparaît sans attendre l'expiration du cache.
    await page.goto(adminUrl);
    await page.getByRole("button", { name: "Désactiver" }).click();
    await expect(page.getByRole("button", { name: "Réactiver" })).toBeVisible(
      SERVER_TIMEOUT,
    );

    await page.goto("/catalogue");
    await expect(
      page.getByRole("link", { name: "Salle de spectacle" }),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(page.getByRole("link", { name })).toHaveCount(0);
    await page.goto(publicUrl);
    await expect(
      page.getByRole("heading", { level: 1, name: "Ressource introuvable" }),
    ).toBeVisible(SERVER_TIMEOUT);
    // La ressource est supprimée par tests/e2e/global-teardown.ts.
  });
});
