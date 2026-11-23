import { expect, test } from "@playwright/test";

import { createTestReservation } from "./fixtures";
import { hasAdminCredentials, loginAsAdmin, SERVER_TIMEOUT } from "./helpers";
import { emailsTo, trackingPath, waitForEmail } from "./outbox";
import { chooseDates, fillContact, testDates } from "./reservation-helpers";

// Les e-mails sont écrits sur disque par le serveur de test (jamais envoyés) :
// on vérifie leur contenu en français et on suit leurs liens.

test.describe("E-mails envoyés au client", () => {
  test("demande reçue : e-mail avec un lien de suivi valide", async ({
    page,
  }, testInfo) => {
    test.setTimeout(90_000);
    const { start, end } = testDates();

    await page.goto("/reserver?ressource=seed-micro");
    await chooseDates(page, start, end);
    const email = await fillContact(page, testInfo);
    await page.getByRole("button", { name: "Envoyer ma demande" }).click();
    await expect(page).toHaveURL(/\/suivi\//, SERVER_TIMEOUT);
    const reference = (
      await page.getByRole("heading", { level: 1 }).textContent()
    )?.replace("Réservation ", "");

    const message = await waitForEmail(email, "Demande de réservation reçue");
    expect(message.subject).toBe(`Demande de réservation reçue – ${reference}`);
    expect(message.text).toContain("Bonjour Camille");
    expect(message.text).toContain("Nous avons bien reçu votre demande");
    expect(message.text).toContain("Micro sans fil × 1");

    // Le lien de l'e-mail ouvre bien la page de suivi de cette réservation.
    await page.goto(trackingPath(message));
    await expect(
      page.getByRole("heading", { level: 1, name: `Réservation ${reference}` }),
    ).toBeVisible(SERVER_TIMEOUT);
  });

  test.describe("après une action de l'administrateur", () => {
    test.skip(!hasAdminCredentials, "Identifiants du seed absents de .env");

    test("demande acceptée : montant, date limite et lien", async ({
      page,
    }) => {
      const { start, end } = testDates();
      const reservation = await createTestReservation({
        status: "EN_ATTENTE",
        start,
        end,
        label: "E-mail accepté",
      });
      await loginAsAdmin(page, "/admin");
      await page.goto(`/admin/reservations/${reservation.id}`);
      await page.getByRole("button", { name: "Accepter" }).click();
      await expect(page.getByText("Statut mis à jour")).toBeVisible(
        SERVER_TIMEOUT,
      );

      const message = await waitForEmail(reservation.email, "Demande acceptée");
      expect(message.subject).toContain(reservation.reference);
      expect(message.text).toContain(
        "votre demande de réservation est acceptée",
      );
      // Espace insécable avant « € » (typographie française).
      expect(message.text).toMatch(/15,00\s€/);
      // Date limite de paiement en toutes lettres, à l'heure de Paris.
      expect(message.text).toMatch(
        /avant le \w+ \d{1,2} \w+ \d{4} à \d{2}:\d{2}/,
      );

      await page.goto(trackingPath(message));
      await expect(
        page.getByText("Acceptée – en attente de paiement"),
      ).toBeVisible(SERVER_TIMEOUT);
    });

    test("demande refusée : motif transmis au client", async ({ page }) => {
      const { start, end } = testDates();
      const reservation = await createTestReservation({
        status: "EN_ATTENTE",
        start,
        end,
        label: "E-mail refusé",
      });
      await loginAsAdmin(page, "/admin");
      await page.goto(`/admin/reservations/${reservation.id}`);
      page.on("dialog", (dialog) => dialog.accept());
      await page.getByLabel("Motif du refus").fill("Matériel en maintenance.");
      await page.getByRole("button", { name: "Refuser" }).click();
      await expect(page.getByText("Statut mis à jour")).toBeVisible(
        SERVER_TIMEOUT,
      );

      const message = await waitForEmail(
        reservation.email,
        "Demande de réservation non retenue",
      );
      expect(message.text).toContain("nous ne pouvons pas donner suite");
      expect(message.text).toContain("Matériel en maintenance.");
    });

    test("n'envoie pas d'e-mail à la sortie du matériel", async ({ page }) => {
      // Seules l'acceptation et le refus prévoient un e-mail (section 6.4).
      const reservation = await createTestReservation({
        status: "CONFIRMEE",
        ...testDates(),
        label: "Sans e-mail",
      });
      await loginAsAdmin(page, "/admin");
      await page.goto(`/admin/reservations/${reservation.id}`);
      await page.getByRole("button", { name: "Marquer comme sorti" }).click();
      await expect(page.getByText("Statut mis à jour")).toBeVisible(
        SERVER_TIMEOUT,
      );
      // Laisse aux éventuels envois différés (after) le temps de partir.
      await page.waitForTimeout(3_000);
      expect(await emailsTo(reservation.email)).toHaveLength(0);
    });
  });
});
