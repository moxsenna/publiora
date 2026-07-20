/**
 * Multi-stage Strategy → Publish journey against a seeded project.
 * Does not burn AI credits; verifies stage chrome + content + publish gate.
 *
 * Requires: E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID
 * Seed first: node scripts/seed-e2e-workflow-project.mjs
 */

import { test, expect } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID;

test.describe("workflow journey seeded project", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD || !PROJECT_ID,
    "needs E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("Strategy stage shows assistant and brief", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await expect(page.getByText("Asisten Strategi").first()).toBeVisible({
      timeout: 20_000,
    });
    // Desktop + mobile may both render brief titles
    await expect(page.getByText("Brief Ebook").first()).toBeVisible();
    await expect(page.getByText("Kesiapan Strategi").first()).toBeVisible();
  });

  test("Outline stage shows approved flat sections", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=outline`);
    await expect(page.getByRole("tab", { name: "Struktur" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 20_000 },
    );
    // Seeded titles should appear somewhere in outline list
    await expect(
      page.getByText(/Introduction|Core Framework|Affiliate Systems/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Write stage lists sections with content", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=write`);
    await expect(page.getByRole("tab", { name: "Tulis" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 20_000 },
    );
    await expect(
      page.getByText(/Introduction|Core Framework|Apply This Week/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Review stage shows readiness and checklist", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=review`);
    await expect(page.getByRole("tab", { name: "Tinjau" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 20_000 },
    );
    await expect(page.getByText(/Readiness/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText(/checklist|title|subtitle|CTA|preview|warning|blocker/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Publish stage shows publish controls for complete seeded project", async ({
    page,
  }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=publish`);
    await expect(page.getByRole("tab", { name: "Terbitkan" }).first()).toHaveAttribute(
      "aria-selected",
      "true",
      { timeout: 20_000 },
    );

    const publishBtn = page
      .getByRole("button", { name: /Publish now|Republish|Publish/i })
      .first();
    await expect(publishBtn).toBeVisible({ timeout: 15_000 });
    const enabled = await publishBtn.isEnabled();
    const hasIssues = await page
      .getByText(/issue|blocker|resolve/i)
      .first()
      .isVisible()
      .catch(() => false);
    expect(enabled || hasIssues).toBe(true);
  });

  test("walk stages via step nav Strategy→Publish", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);
    await expect(page.getByText("Asisten Strategi").first()).toBeVisible({
      timeout: 20_000,
    });

    const stepMap: Record<string, string> = {
      Struktur: "outline",
      Tulis: "write",
      Tinjau: "review",
      Terbitkan: "publish",
    };

    for (const step of ["Struktur", "Tulis", "Tinjau", "Terbitkan"] as const) {
      await page.getByRole("tab", { name: step }).first().click();
      await expect(page).toHaveURL(new RegExp(`step=${stepMap[step]}`));
      await expect(page.getByRole("tab", { name: step }).first()).toHaveAttribute(
        "aria-selected",
        "true",
      );
    }
  });
});
