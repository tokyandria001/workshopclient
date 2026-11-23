import { expect, type Page } from "@playwright/test";

export const adminEmail = process.env.SEED_ADMIN_EMAIL ?? "";
export const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? "";
export const hasAdminCredentials = Boolean(adminEmail && adminPassword);

// Actions serveur + base Supabase (+ bcrypt) : plus lent que le délai par
// défaut de 5 s, surtout au premier appel en mode développement.
export const SERVER_TIMEOUT = { timeout: 15_000 };

export async function fillLogin(page: Page, email: string, password: string) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Mot de passe").fill(password);
  await page.getByRole("button", { name: "Se connecter" }).click();
}

/** Connecte l'administrateur du seed puis ouvre `path`. */
export async function loginAsAdmin(page: Page, path = "/admin") {
  await page.goto(`/admin/connexion?callbackUrl=${encodeURIComponent(path)}`);
  await fillLogin(page, adminEmail, adminPassword);
  await expect(page).toHaveURL(new RegExp(`${path}$`), SERVER_TIMEOUT);
}
