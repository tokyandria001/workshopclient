import { expect, test, type Page, type TestInfo } from "@playwright/test";

import { addDays, todayInParis } from "../../src/lib/dates";

import { SERVER_TIMEOUT } from "./helpers";

/**
 * Dates lointaines tirées au hasard à chaque exécution : les tests lancés en
 * parallèle ou répétés ne se gênent pas (une réservation de test bloque le
 * stock jusqu'au nettoyage final).
 */
function testDates() {
  const start = addDays(todayInParis(), 300 + Math.floor(Math.random() * 240));
  return { start, end: addDays(start, 1) };
}

async function fillDates(page: Page, start: string, end: string) {
  await page.getByLabel("Date de début").fill(start);
  await page.getByLabel("Date de fin (incluse)").fill(end);
}

/**
 * Saisit une période valide et attend les disponibilités. La saisie est
 * recommencée si elle a eu lieu avant que React soit prêt (hydratation) :
 * elle serait sinon perdue.
 */
async function chooseDates(page: Page, start: string, end: string) {
  await expect(async () => {
    await fillDates(page, start, end);
    await expect(page.getByText(/^Location (du|le) /)).toBeVisible({
      timeout: 2_000,
    });
  }).toPass(SERVER_TIMEOUT);
  await expect(
    page
      .getByText(/· (Disponible|Indisponible sur ces dates|\d+ disponibles?)$/)
      .first(),
  ).toBeVisible(SERVER_TIMEOUT);
}

async function fillContact(page: Page, testInfo: TestInfo) {
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page
    .getByLabel("E-mail")
    .fill(`test-e2e-${testInfo.project.name}-${Date.now()}@example.com`);
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page
    .getByLabel("J'ai lu et j'accepte les conditions générales de location")
    .check();
}

test.describe("Demande de réservation", () => {
  test("envoie une demande complète depuis le catalogue", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { start, end } = testDates();

    await page.goto("/catalogue?type=materiel");
    await page.getByRole("link", { name: "Micro sans fil" }).click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Micro sans fil" }),
    ).toBeVisible(SERVER_TIMEOUT);
    // Le bouton de la fiche (pas celui de l'en-tête).
    await page
      .getByRole("main")
      .getByRole("link", { name: "Réserver" })
      .click();
    await expect(page).toHaveURL(/\/reserver\?ressource=/, SERVER_TIMEOUT);

    await chooseDates(page, start, end);
    // La ressource choisie dans le catalogue est présélectionnée.
    await expect(page.getByLabel("Quantité – Micro sans fil")).toHaveValue("1");
    await expect(page.getByText("Micro sans fil × 1")).toBeVisible();
    await expect(page.getByTestId("total")).toContainText("€");

    await fillContact(page, testInfo);
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();

    await expect(page).toHaveURL(
      /\/suivi\/[\w-]{43}\?nouvelle=1$/,
      SERVER_TIMEOUT,
    );
    await expect(page.getByText("Demande envoyée")).toBeVisible();
    await expect(
      page.getByText("Demande en attente de validation"),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: /Réservation R\d{2}-/ }),
    ).toBeVisible();
    await expect(page.getByText("Micro sans fil × 1")).toBeVisible();
  });

  test("cache le champ piège anti-robots", async ({ page }) => {
    await page.goto("/reserver");
    const honeypot = page.getByTestId("honeypot");
    await expect(honeypot).toBeAttached();
    // On fait défiler jusqu'aux coordonnées, là où se trouve le champ piège.
    await page.getByLabel("Prénom").scrollIntoViewIfNeeded();
    // Hors de l'écran et transparent : invisible pour un visiteur.
    await expect(honeypot).not.toBeInViewport();
    await expect(honeypot).toHaveCSS("opacity", "0");
    // Le champ « Prénom » n'est pas recouvert.
    await expect(page.getByLabel("Prénom")).toBeInViewport();
    await expect(page.getByText("Ne pas remplir")).not.toBeInViewport();
  });

  test("affiche les erreurs d'un formulaire incomplet", async ({ page }) => {
    await page.goto("/reserver");
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();

    await expect(
      page.getByText("Certaines informations sont manquantes ou incorrectes."),
    ).toBeVisible(SERVER_TIMEOUT);
    for (const message of [
      "La date de début est obligatoire.",
      "Choisissez au moins une ressource.",
      "Le prénom est obligatoire.",
      "Vous devez accepter les conditions générales de location.",
    ]) {
      await expect(page.getByText(message)).toBeVisible();
    }
  });

  test("signale une période invalide sans appeler le serveur", async ({
    page,
  }) => {
    await page.goto("/reserver");
    const start = addDays(todayInParis(), 10);
    // Période trop longue : pas de récapitulatif ni d'appel au serveur.
    await expect(async () => {
      await fillDates(page, start, addDays(start, 40));
      await expect(
        page.getByText("Une réservation ne peut pas dépasser 31 jours."),
      ).toBeVisible({ timeout: 2_000 });
    }).toPass(SERVER_TIMEOUT);
    await expect(
      page.getByText("Une réservation ne peut pas dépasser 31 jours."),
    ).toBeVisible();
  });

  test("rend la salle indisponible une fois réservée", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { start, end } = testDates();

    // 1re demande : la salle.
    await page.goto("/reserver");
    await chooseDates(page, start, end);
    const salle = page.getByLabel("Salle de spectacle");
    await expect(salle).toBeEnabled();
    await salle.check();
    await fillContact(page, testInfo);
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page).toHaveURL(/\/suivi\//, SERVER_TIMEOUT);

    // Une demande en attente bloque déjà la salle sur ces dates…
    await page.goto("/reserver");
    await chooseDates(page, start, end);
    await expect(
      page.getByText(/Indisponible sur ces dates/).first(),
    ).toBeVisible();
    await expect(page.getByLabel("Salle de spectacle")).toBeDisabled();

    // … mais pas le lendemain de la fin.
    await chooseDates(page, addDays(end, 1), addDays(end, 1));
    await expect(page.getByLabel("Salle de spectacle")).toBeEnabled();
  });

  test("indique un lien de suivi invalide", async ({ page }) => {
    await page.goto("/suivi/lien-invalide");
    await expect(
      page.getByRole("heading", { level: 1, name: "Réservation introuvable" }),
    ).toBeVisible(SERVER_TIMEOUT);
  });
});
