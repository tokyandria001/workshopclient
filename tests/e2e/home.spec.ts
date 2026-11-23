import { expect, test } from "@playwright/test";

test.describe("Page d'accueil", () => {
  test("s'affiche avec le titre principal", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(/Zénith de Bel Air/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Zénith de Bel Air" }),
    ).toBeVisible();
  });

  test("ne provoque pas de défilement horizontal", async ({ page }) => {
    await page.goto("/");
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasHorizontalScroll).toBe(false);
  });
});
