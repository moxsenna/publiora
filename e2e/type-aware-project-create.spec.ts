/**
 * Type-aware new project wizard — V3 offer-aware shell (no live AI).
 *
 * Requires: E2E_EMAIL, E2E_PASSWORD (+ Supabase public env).
 * Skips cleanly when credentials are missing.
 *
 * Full offer journeys: see offer-library-journeys.spec.ts (A–F).
 */

import { test, expect } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";
import {
  createProjectAndOpenWorkspace,
  ensureWizardAuthor,
  goToFormatStep,
  PROJECT_WORKSPACE_URL,
  selectLeadGoal,
} from "./helpers/wizard";

test.describe("type-aware project creation (V3 shell)", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "needs E2E_EMAIL and E2E_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("wizard shows Tujuan Ide & Produk Format steps", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(
      page.getByRole("heading", { name: "Buat Proyek Baru" }),
    ).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Apa yang ingin Anda buat?")).toBeVisible();
    await expect(page.getByRole("button", { name: /Lead Magnet/i })).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Bonus Pembelian/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Ebook Berbayar/i }),
    ).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Langkah pembuatan proyek" }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Langkah pembuatan proyek" })
        .getByText("Ide & Produk", { exact: true }),
    ).toBeVisible();
    await expect(
      page
        .getByRole("navigation", { name: "Langkah pembuatan proyek" })
        .getByText("Format", { exact: true }),
    ).toBeVisible();
  });

  test("Journey B — Lead without offer reaches Strategy", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Apa yang ingin Anda buat?")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /Lead Magnet/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(page.getByText("Ide lead magnet")).toBeVisible();
    await page
      .getByLabel("Ide lead magnet")
      .fill("Lead Generation B2B checklist");
    await page.getByRole("button", { name: /Belum ada produk/i }).click();
    await selectLeadGoal(page, "collect_email");
    await ensureWizardAuthor(page);
    await goToFormatStep(page);
    await createProjectAndOpenWorkspace(page);

    await expect(page).toHaveURL(PROJECT_WORKSPACE_URL);
    await expect(page).toHaveURL(/stage=strategy|step=strategy/, {
      timeout: 15_000,
    });
    await expect(
      page
        .getByText(/Lead Generation|Brief Ebook|Asisten Strategi/i)
        .first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Journey C shell — Bonus requires offer picker", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByRole("button", { name: /Bonus Pembelian/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(
      page.getByText(/Bonus ini melengkapi produk apa/i),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: /Tambah cepat|Pilih produk/i }).first(),
    ).toBeVisible();
    // No free-text parent product field
    await expect(page.getByLabel("Produk utama", { exact: true })).toHaveCount(
      0,
    );
  });

  test("Ebook Berbayar shows role modes", async ({ page }) => {
    await page.goto("/projects/new");
    await page.getByRole("button", { name: /Ebook Berbayar/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(page.getByText(/Peran ebook ini/i)).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByText(/Produk mandiri/i)).toBeVisible();
    await expect(page.getByText(/Bagian dari bundle/i)).toBeVisible();
    await expect(
      page.getByText(/Produk entry menuju penawaran lain/i),
    ).toBeVisible();
  });
});
