/**
 * Workspace shell deep-links and stage chrome.
 * Auth via injected Supabase session.
 * Requires: E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID
 */

import { test, expect } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";

const EMAIL = process.env.E2E_EMAIL;
const PASSWORD = process.env.E2E_PASSWORD;
const PROJECT_ID = process.env.E2E_PROJECT_ID;

test.describe("workspace shell", () => {
  test.skip(
    !EMAIL || !PASSWORD || !PROJECT_ID,
    "needs E2E_EMAIL, E2E_PASSWORD, and E2E_PROJECT_ID env vars",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("WorkspaceStepNav shows Strategy Outline Write Review Publish", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_ID}`);
    const nav = page.getByRole("navigation", { name: "Workflow stages" });
    await expect(nav.first()).toBeVisible({ timeout: 15_000 });

    for (const label of ["Strategy", "Outline", "Write", "Review", "Publish"]) {
      await expect(page.getByRole("tab", { name: label }).first()).toBeVisible();
    }
  });

  test("deep-link ?step=write shows write panel", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=write`);
    await expect(page.getByRole("tab", { name: "Write" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );
  });

  test("deep-link ?step=review shows review panel", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=review`);
    await expect(page.getByRole("tab", { name: "Review" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );
  });

  test("deep-link ?step=publish shows publish panel", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=publish`);
    await expect(page.getByRole("tab", { name: "Publish" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );
  });

  test('keyboard shortcut "1" navigates to Strategy', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=outline`);
    await expect(page.getByRole("tab", { name: "Outline" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("1");
    await expect(page).toHaveURL(/step=strategy/, { timeout: 10_000 });
  });

  test('keyboard shortcut "5" navigates to Publish', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await expect(page.getByRole("tab", { name: "Strategy" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("5");
    await expect(page).toHaveURL(/step=publish/, { timeout: 10_000 });
  });

  test("clicking Outline tab sets ?step=outline in URL", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await page.getByRole("tab", { name: "Outline" }).first().click();
    await expect(page).toHaveURL(/step=outline/);
  });

  test("clicking Write tab sets ?step=write in URL", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await page.getByRole("tab", { name: "Write" }).first().click();
    await expect(page).toHaveURL(/step=write/);
  });

  test("clicking Review tab sets ?step=review in URL", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await page.getByRole("tab", { name: "Review" }).first().click();
    await expect(page).toHaveURL(/step=review/);
  });

  test("mobile 320px stage selector usable", async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);

    const mobileSelect = page.getByLabel("Workflow stage selector");
    await expect(mobileSelect).toBeVisible({ timeout: 15_000 });

    // Open stage list and pick Outline
    await mobileSelect.click();
    await page.getByRole("option", { name: /Outline/i }).first().click();
    await expect(page).toHaveURL(/step=outline/, { timeout: 10_000 });

    // Allow small sub-pixel/scrollbar tolerance; page should not require horizontal pan.
    const overflow = await page.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    expect(overflow).toBeLessThanOrEqual(8);
  });
});
