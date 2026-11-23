import { expect, test, type Page } from "@playwright/test";

import { addDays, todayInParis } from "../../src/lib/dates";

import { createTestReservation, type TestReservation } from "./fixtures";
import { hasAdminCredentials, loginAsAdmin, SERVER_TIMEOUT } from "./helpers";

/** Dates lointaines au hasard : aucune gêne avec les autres tests. */
function farDates() {
  const start = addDays(todayInParis(), 300 + Math.floor(Math.random() * 240));
  return { start, end: addDays(start, 1) };
}

async function openReservation(page: Page, reservation: TestReservation) {
  await page.goto(`/admin/reservations/${reservation.id}`);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: `Réservation ${reservation.reference}`,
    }),
  ).toBeVisible(SERVER_TIMEOUT);
}

const actions = (page: Page) =>
  page.getByRole("complementary").filter({ hasText: "Actions" });

test.describe("Gestion des réservations (back-office)", () => {
  test.skip(!hasAdminCredentials, "Identifiants du seed absents de .env");

  test("filtre la liste par statut et par client", async ({ page }) => {
    const reservation = await createTestReservation({
      status: "EN_ATTENTE",
      ...farDates(),
      label: "Filtre",
    });
    await loginAsAdmin(page, "/admin/reservations");

    await page.getByLabel("Statut").selectOption("EN_ATTENTE");
    await page.getByLabel("Client ou référence").fill(reservation.lastName);
    await page.getByRole("button", { name: "Filtrer" }).click();

    await expect(page).toHaveURL(/statut=EN_ATTENTE/, SERVER_TIMEOUT);
    const row = page.getByRole("link", {
      name: new RegExp(reservation.lastName),
    });
    await expect(row).toBeVisible(SERVER_TIMEOUT);
    await expect(row).toContainText("En attente");
    await expect(
      page.getByText("1 réservation", { exact: true }),
    ).toBeVisible();

    // Un autre statut ne la montre plus.
    await page.getByLabel("Statut").selectOption("CONFIRMEE");
    await page.getByRole("button", { name: "Filtrer" }).click();
    await expect(page).toHaveURL(/statut=CONFIRMEE/, SERVER_TIMEOUT);
    await expect(
      page.getByText("Aucune réservation ne correspond."),
    ).toBeVisible();

    await page.getByRole("link", { name: "Effacer" }).click();
    await expect(page).toHaveURL(/\/admin\/reservations$/, SERVER_TIMEOUT);
  });

  test("accepte une demande", async ({ page }) => {
    const reservation = await createTestReservation({
      status: "EN_ATTENTE",
      ...farDates(),
      label: "Accepter",
    });
    await loginAsAdmin(page, "/admin/reservations");
    await openReservation(page, reservation);

    await actions(page).getByRole("button", { name: "Accepter" }).click();
    await expect(
      page.getByText("Statut mis à jour : Acceptée – en attente de paiement."),
    ).toBeVisible(SERVER_TIMEOUT);
    await expect(page.getByText("Paiement attendu avant le")).toBeVisible();
    // Historique et nouvelles actions possibles.
    await expect(page.getByText("En attente → À payer")).toBeVisible();
    await expect(
      actions(page).getByRole("button", { name: "Accepter" }),
    ).toHaveCount(0);
    await expect(
      actions(page).getByRole("button", { name: "Annuler" }),
    ).toBeVisible();
  });

  test("refuse une demande avec un motif obligatoire", async ({ page }) => {
    const reservation = await createTestReservation({
      status: "EN_ATTENTE",
      ...farDates(),
      label: "Refuser",
    });
    await loginAsAdmin(page, "/admin/reservations");
    await openReservation(page, reservation);

    const panel = actions(page);
    page.on("dialog", (dialog) => dialog.accept());

    // Sans motif : le navigateur bloque l'envoi (champ obligatoire).
    await panel.getByRole("button", { name: "Refuser" }).click();
    await expect(page.getByText("Statut mis à jour")).toHaveCount(0);

    await panel.getByLabel("Motif du refus").fill("Salle déjà prise");
    await panel.getByRole("button", { name: "Refuser" }).click();
    await expect(page.getByText("Statut mis à jour : Refusée.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    await expect(page.getByText("« Salle déjà prise »")).toBeVisible();
    await expect(
      page.getByText(
        "Aucune action possible : la réservation est terminée ou close.",
      ),
    ).toBeVisible();
  });

  test("enregistre la sortie puis la restitution du matériel", async ({
    page,
  }) => {
    const today = todayInParis();
    const reservation = await createTestReservation({
      status: "CONFIRMEE",
      start: today,
      end: addDays(today, 2),
      label: "Sortie",
    });
    await loginAsAdmin(page, "/admin/reservations");
    await openReservation(page, reservation);

    await actions(page)
      .getByRole("button", { name: "Marquer comme sorti" })
      .click();
    await expect(page.getByText("Statut mis à jour : En cours.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    await expect(page.getByText("Sorti le")).toBeVisible();

    // Visible dans la vue « matériel sorti » du planning.
    await page.goto("/admin/planning?vue=sorti");
    await expect(
      page.getByRole("link", { name: new RegExp(reservation.lastName) }),
    ).toBeVisible(SERVER_TIMEOUT);

    await openReservation(page, reservation);
    await actions(page)
      .getByLabel("Remarque sur l'état du matériel")
      .fill("Rendu complet, RAS");
    await actions(page)
      .getByRole("button", { name: "Marquer comme restitué" })
      .click();
    await expect(page.getByText("Statut mis à jour : Terminée.")).toBeVisible(
      SERVER_TIMEOUT,
    );
    await expect(page.getByText("« Rendu complet, RAS »")).toBeVisible();
  });

  test("signale un retour en retard", async ({ page }) => {
    const today = todayInParis();
    const reservation = await createTestReservation({
      status: "EN_COURS",
      start: addDays(today, -5),
      end: addDays(today, -1),
      label: "Retard",
    });
    await loginAsAdmin(page, "/admin");
    await expect(page.getByText("Retours en retard")).toBeVisible(
      SERVER_TIMEOUT,
    );

    await page.goto("/admin/planning?vue=sorti");
    const row = page.getByRole("link", {
      name: new RegExp(reservation.lastName),
    });
    await expect(row).toBeVisible(SERVER_TIMEOUT);
    await expect(row).toContainText("En retard");

    await openReservation(page, reservation);
    await expect(page.getByText("Retour en retard")).toBeVisible();
  });

  test("affiche la réservation dans le planning", async ({ page }) => {
    const { start, end } = farDates();
    const reservation = await createTestReservation({
      status: "CONFIRMEE",
      start,
      end,
      label: "Planning",
    });
    await loginAsAdmin(page, "/admin");

    for (const view of ["mois", "semaine"]) {
      await page.goto(`/admin/planning?vue=${view}&date=${start}`);
      await expect(
        page
          .getByRole("link", { name: new RegExp(reservation.reference) })
          .first(),
      ).toBeVisible(SERVER_TIMEOUT);
    }

    // Navigation vers la fiche depuis le planning.
    await page
      .getByRole("link", { name: new RegExp(reservation.reference) })
      .first()
      .click();
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: `Réservation ${reservation.reference}`,
      }),
    ).toBeVisible(SERVER_TIMEOUT);
  });

  test("indique une réservation introuvable", async ({ page }) => {
    await loginAsAdmin(page, "/admin");
    await page.goto("/admin/reservations/inexistante");
    await expect(
      page.getByRole("heading", { level: 1, name: "Réservation introuvable" }),
    ).toBeVisible(SERVER_TIMEOUT);
  });
});
