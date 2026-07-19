/**
 * Capture authenticated workspace screenshots for PR baseline.
 * Requires E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID.
 * Tagged @screenshots — run:
 *   npx playwright test --project=chromium e2e/capture-workspace-screenshots.spec.ts
 */

import { test } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { loginWithStorage } from "./helpers/auth";

const PROJECT_ID = process.env.E2E_PROJECT_ID;
const OUT_DIR = path.resolve("docs/baseline-workspace");

const STEPS = ["strategy", "outline", "write", "review", "publish"] as const;

test.describe("workspace screenshots", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD || !PROJECT_ID,
    "needs E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID",
  );

  test("capture desktop and mobile stages @screenshots", async ({ page }) => {
    fs.mkdirSync(OUT_DIR, { recursive: true });
    await loginWithStorage(page);

    // Desktop
    await page.setViewportSize({ width: 1280, height: 800 });
    for (const step of STEPS) {
      await page.goto(`/projects/${PROJECT_ID}?step=${step}`);
      await page.getByRole("tab", { name: new RegExp(step, "i") }).first().waitFor({
        state: "visible",
        timeout: 20_000,
      });
      await page.waitForTimeout(500);
      await page.screenshot({
        path: path.join(OUT_DIR, `desktop-${step}.png`),
        fullPage: true,
      });
    }

    // Mobile 320px (plan quality gate)
    await page.setViewportSize({ width: 320, height: 720 });
    for (const step of STEPS) {
      await page.goto(`/projects/${PROJECT_ID}?step=${step}`);
      await page.waitForTimeout(600);
      await page.screenshot({
        path: path.join(OUT_DIR, `mobile320-${step}.png`),
        fullPage: true,
      });
    }
  });
});
