/**
 * Capture desktop + mobile screenshots for Offer Library evidence.
 * Requires E2E_EMAIL / E2E_PASSWORD and a running app.
 */
import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";
import { loginWithStorage } from "./helpers/auth";
import { openMobileNavIfNeeded } from "./helpers/wizard";

const outDir = path.resolve("docs/e2e-evidence/offer-library-2026-07-21");

test.describe("offer library screenshots", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "needs E2E credentials",
  );

  test.beforeAll(() => {
    fs.mkdirSync(outDir, { recursive: true });
  });

  test("capture list and wizard shells", async ({ page }, testInfo) => {
    await loginWithStorage(page);
    const project = testInfo.project.name;
    const suffix = project === "mobile" ? "mobile" : "desktop";

    await page.goto("/dashboard");
    await openMobileNavIfNeeded(page);
    await page.goto("/offers");
    await expect(
      page.getByRole("heading", { name: /Produk & Penawaran/i }),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: path.join(outDir, `${suffix}-offers-list.png`),
      fullPage: true,
    });

    await page.goto("/offers/new");
    await expect(page.getByText(/Tambah Produk/i).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.screenshot({
      path: path.join(outDir, `${suffix}-offers-new.png`),
      fullPage: true,
    });

    await page.goto("/projects/new");
    await expect(
      page.getByRole("heading", { name: "Buat Proyek Baru" }),
    ).toBeVisible({ timeout: 15_000 });
    await page.screenshot({
      path: path.join(outDir, `${suffix}-wizard-tujuan.png`),
      fullPage: true,
    });

    await page.getByRole("button", { name: /Lead Magnet/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();
    await expect(page.getByText("Ide lead magnet")).toBeVisible({
      timeout: 10_000,
    });
    await page.screenshot({
      path: path.join(outDir, `${suffix}-wizard-ide-produk.png`),
      fullPage: true,
    });
  });
});
