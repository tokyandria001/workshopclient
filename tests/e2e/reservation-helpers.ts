// Étapes communes du formulaire public de réservation (tests e2e).

import { expect, type Page, type TestInfo } from "@playwright/test";

import { addDays, todayInParis } from "../../src/lib/dates";

import { SERVER_TIMEOUT } from "./helpers";

/**
 * Dates lointaines tirées au hasard à chaque exécution : les tests lancés en
 * parallèle ou répétés ne se gênent pas (une réservation de test bloque le
 * stock jusqu'au nettoyage final).
 */
export function testDates() {
  const start = addDays(todayInParis(), 300 + Math.floor(Math.random() * 240));
  return { start, end: addDays(start, 1) };
}

export async function fillDates(page: Page, start: string, end: string) {
  await page.getByLabel("Date de début").fill(start);
  await page.getByLabel("Date de fin (incluse)").fill(end);
}

/**
 * Saisit une période valide et attend les disponibilités. La saisie est
 * recommencée si elle a eu lieu avant que React soit prêt (hydratation) :
 * elle serait sinon perdue.
 */
export async function chooseDates(page: Page, start: string, end: string) {
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

export async function fillContact(
  page: Page,
  testInfo: TestInfo,
): Promise<string> {
  const email = `test-e2e-${testInfo.project.name}-${Date.now()}@example.com`;
  await page.getByLabel("Prénom").fill("Camille");
  await page.getByLabel("Nom", { exact: true }).fill("Test");
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Téléphone").fill("06 12 34 56 78");
  await page
    .getByLabel("J'ai lu et j'accepte les conditions générales de location")
    .check();
  return email;
}
