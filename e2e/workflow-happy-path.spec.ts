/**
 * Workflow shell + stage navigation journey.
 *
 * Auth: injects Supabase session via API (not flaky UI form).
 * Requires: E2E_EMAIL, E2E_PASSWORD
 * Optional: E2E_PROJECT_ID
 */

import { test, expect } from "@playwright/test";
import { loginWithStorage, openWorkspace } from "./helpers/auth";

const STEP_LABELS = ["Strategy", "Outline", "Write", "Review", "Publish"] as const;

test.describe("workflow happy path", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "needs E2E_EMAIL and E2E_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("step nav shows all five workflow stages", async ({ page }) => {
    await openWorkspace(page);

    for (const label of STEP_LABELS) {
      await expect(page.getByRole("tab", { name: label }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test("workspace has no agent-first UI remnants", async ({ page }) => {
    await openWorkspace(page);

    await expect(page.locator('[data-testid="chat-panel"]')).toHaveCount(0);
    await expect(page.getByText("Select agent")).toHaveCount(0);
    // Six-agent picker chips should not be the primary nav
    await expect(page.getByRole("navigation", { name: "Workflow stages" }).first()).toBeVisible();
  });

  test("can deep-link to ?step=write", async ({ page }) => {
    const id = await openWorkspace(page);
    await page.goto(`/projects/${id}?step=write`);
    await expect(page.getByRole("tab", { name: "Write" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );
  });

  test("can deep-link to ?step=review", async ({ page }) => {
    const id = await openWorkspace(page);
    await page.goto(`/projects/${id}?step=review`);
    await expect(page.getByRole("tab", { name: "Review" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );
  });

  test("publish stage shows blockers or publish controls", async ({ page }) => {
    const id = await openWorkspace(page);
    await page.goto(`/projects/${id}?step=publish`);

    await expect(page.getByRole("tab", { name: "Publish" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );

    const publishBtn = page.getByRole("button", { name: /Publish/i }).first();
    const blockers = page.getByText(/blocker|issue|resolve|not ready|incomplete/i).first();
    const hasPublish = await publishBtn.isVisible().catch(() => false);
    const hasBlockers = await blockers.isVisible().catch(() => false);
    expect(hasPublish || hasBlockers).toBe(true);
  });

  test("clicking step nav tabs changes stage URL", async ({ page }) => {
    const id = await openWorkspace(page);
    await page.goto(`/projects/${id}?step=outline`);

    await expect(page.getByRole("tab", { name: "Outline" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 15_000 },
    );

    await page.getByRole("tab", { name: "Strategy" }).first().click();
    await expect(page).toHaveURL(/step=strategy/);
  });

  test("keyboard 1-5 maps to workflow stages", async ({ page }) => {
    const id = await openWorkspace(page);
    await page.goto(`/projects/${id}?step=strategy`);
    await expect(page.getByRole("tab", { name: "Strategy" }).first()).toBeVisible({
      timeout: 15_000,
    });

    // Focus body so shortcuts apply (not inputs)
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("3");
    await expect(page).toHaveURL(/step=write/, { timeout: 10_000 });

    await page.keyboard.press("5");
    await expect(page).toHaveURL(/step=publish/, { timeout: 10_000 });
  });
});
