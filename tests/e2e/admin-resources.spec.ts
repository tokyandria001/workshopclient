import { expect, test } from "@playwright/test";

import { hasAdminCredentials, loginAsAdmin, SERVER_TIMEOUT } from "./helpers";

// PNG 1×1 pixel, pour tester l'envoi de photo sans fichier externe.
const TINY_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);
const hasStorage = Boolean(process.env.STORAGE_URL && process.env.STORAGE_KEY);

test.describe("Gestion des ressources (back-office)", () => {
  test.skip(!hasAdminCredentials, "Identifiants du seed absents de .env");

  test("cycle complet : création, modification, désactivation, photo, suppression", async ({
    page,
  }, testInfo) => {
    test.setTimeout(120_000);
    // Nom unique : les projets mobile et bureau tournent en parallèle.
    const name = `Test e2e ${testInfo.project.name} ${Date.now()}`;

    await loginAsAdmin(page, "/admin/ressources");
    await page.getByRole("link", { name: "Nouvelle ressource" }).click();

    // 1. Validation : formulaire vide → erreurs affichées.
    await page.getByRole("button", { name: "Créer la ressource" }).click();
    await expect(
      page.getByText("Le nom doit contenir au moins 2 caractères."),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(page.getByText("Le tarif est obligatoire.")).toBeVisible();

    // 2. Création.
    await page.getByLabel("Nom").fill(name);
    await page.getByLabel("Description").fill("Ressource créée par un test.");
    await page.getByLabel("Tarif (€)").fill("49,90");
    await page.getByLabel("Caution (€)").fill("150");
    await page.getByLabel("Quantité totale").fill("3");
    await page.getByRole("button", { name: "Créer la ressource" }).click();

    await expect(page.getByText("Ressource créée.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
    await expect(page.getByLabel("Tarif (€)")).toHaveValue("49,90");
    const detailUrl = page.url().replace(/\?.*$/, "");

    // 3. Modification.
    await page.getByLabel("Tarif (€)").fill("55");
    await page.getByRole("button", { name: "Enregistrer" }).click();
    await expect(page.getByText("Modifications enregistrées.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    await page.reload();
    await expect(page.getByLabel("Tarif (€)")).toHaveValue("55,00");

    // 4. Visible dans la liste avec ses montants formatés.
    await page.goto("/admin/ressources");
    const row = page.getByRole("link", { name: new RegExp(name) });
    await expect(row).toContainText("55,00");
    await expect(row).toContainText("par jour");

    // 5. Désactivation puis réactivation.
    await page.goto(detailUrl);
    await page.getByRole("button", { name: "Désactiver" }).click();
    await expect(page.getByRole("button", { name: "Réactiver" })).toBeVisible(
      SERVER_TIMEOUT,
    );
    await expect(page.getByText("Inactive", { exact: true })).toBeVisible();
    await page.getByRole("button", { name: "Réactiver" }).click();
    await expect(page.getByRole("button", { name: "Désactiver" })).toBeVisible(
      SERVER_TIMEOUT,
    );

    // 6. Photos (si le stockage est configuré).
    if (hasStorage) {
      await page.getByLabel("Ajouter une photo").setInputFiles({
        name: "photo.png",
        mimeType: "image/png",
        buffer: TINY_PNG,
      });
      await page.getByRole("button", { name: "Envoyer la photo" }).click();
      await expect(page.getByText("Photo ajoutée.")).toBeVisible(
        SERVER_TIMEOUT,
      );
      await expect(
        page.getByRole("img", { name: `${name} – photo 1` }),
      ).toBeVisible();

      await page.getByRole("button", { name: "Supprimer la photo 1" }).click();
      await expect(page.getByText("Aucune photo.")).toBeVisible(SERVER_TIMEOUT);
    }

    // 7. Suppression (aucune réservation) après confirmation.
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Supprimer", exact: true }).click();
    await expect(page.getByText("La ressource a été supprimée.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    await expect(
      page.getByRole("link", { name: new RegExp(name) }),
    ).toHaveCount(0);
  });

  test("impose la quantité 1 pour une salle", async ({ page }) => {
    await loginAsAdmin(page, "/admin/ressources/nouvelle");
    await page.getByLabel("Type").selectOption("SALLE");
    await expect(page.getByLabel("Quantité totale")).toHaveValue("1");
    await expect(page.getByLabel("Quantité totale")).toHaveAttribute(
      "readonly",
    );
  });

  test("affiche une page introuvable pour un identifiant inconnu", async ({
    page,
  }) => {
    await loginAsAdmin(page, "/admin/ressources");
    // La page est envoyée en streaming (Suspense) : le statut HTTP est déjà
    // parti quand notFound() est appelé, on vérifie donc le contenu affiché.
    await page.goto("/admin/ressources/inexistante");
    await expect(
      page.getByRole("heading", { level: 1, name: "Ressource introuvable" }),
    ).toBeVisible(SERVER_TIMEOUT);
  });
});
