/**
 * Type-aware new project wizard — Journey A/B/C (no live AI).
 *
 * Requires: E2E_EMAIL, E2E_PASSWORD (+ Supabase public env).
 * Skips cleanly when credentials are missing.
 */

import { test, expect } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";

test.describe("type-aware project creation", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "needs E2E_EMAIL and E2E_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("wizard shows Tujuan Brief Format Tinjau steps", async ({ page }) => {
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
  });

  async function fillCommonBrief(page: import("@playwright/test").Page) {
    await page.getByLabel("Topik utama").fill("Lead Generation B2B");
    await page
      .getByLabel("Target pembaca")
      .fill("Founder SaaS tahap awal yang belum punya tim marketing");
    await page
      .getByLabel("Masalah utama")
      .fill("Sulit mendapatkan lead berkualitas secara konsisten");
    await page
      .getByLabel("Hasil yang ingin diberikan")
      .fill("Pembaca memiliki rencana lead generation 30 hari");
    await page.getByLabel("Niche").fill("B2B SaaS Marketing");
  }

  test("Journey A — Lead Magnet create reaches Strategy", async ({ page }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Apa yang ingin Anda buat?")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /Lead Magnet/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(page.getByText("Lengkapi brief")).toBeVisible();
    await fillCommonBrief(page);
    await page.getByLabel("Tujuan Lead Magnet").selectOption("collect_email");
    await page
      .getByLabel("Aksi setelah membaca")
      .selectOption("visit_product");
    await page.getByLabel("Tautan tujuan").fill("https://example.com/audit");
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(
      page.getByText("Format yang direkomendasikan"),
    ).toBeVisible({ timeout: 10_000 });
    // Prefer checklist if shown
    const checklist = page.getByRole("button", { name: /Checklist/i }).first();
    if (await checklist.isVisible().catch(() => false)) {
      await checklist.click();
    }
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(page.getByText("Tinjau proyek")).toBeVisible();
    await page.getByRole("button", { name: "Buat Proyek" }).click();

    await expect(page).toHaveURL(/\/projects\/[^/]+/, { timeout: 30_000 });
    await expect(page).toHaveURL(/stage=strategy|step=strategy/, {
      timeout: 15_000,
    });
    // Seeded brief should show audience or topic without re-asking
    await expect(
      page.getByText(/Founder SaaS|Lead Generation|Brief Ebook|Asisten Strategi/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Journey B — Bonus Pembelian create seeds parent product", async ({
    page,
  }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Apa yang ingin Anda buat?")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /Bonus Pembelian/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await fillCommonBrief(page);
    await page
      .getByLabel("Produk utama")
      .fill("Kelas TikTok Affiliate untuk Pemula");
    await page.getByLabel("Fungsi bonus").selectOption("implementation_aid");
    await page
      .getByLabel("Kapan bonus digunakan?")
      .selectOption("Setelah modul atau bagian tertentu");
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(
      page.getByText("Format yang direkomendasikan"),
    ).toBeVisible({ timeout: 10_000 });
    const impl = page
      .getByRole("button", { name: /Panduan Implementasi|Implementation/i })
      .first();
    if (await impl.isVisible().catch(() => false)) {
      await impl.click();
    }
    await page.getByRole("button", { name: "Lanjutkan" }).click();
    await page.getByRole("button", { name: "Buat Proyek" }).click();

    await expect(page).toHaveURL(/\/projects\/[^/]+/, { timeout: 30_000 });
    await expect(
      page.getByText(/Kelas TikTok Affiliate|Produk utama|Brief Ebook/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Journey C — Ebook Berbayar create remains functional", async ({
    page,
  }) => {
    await page.goto("/projects/new");
    await expect(page.getByText("Apa yang ingin Anda buat?")).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: /Ebook Berbayar/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await fillCommonBrief(page);
    await page.getByLabel("Posisi produk").selectOption("premium_authority");
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(
      page.getByText("Format yang direkomendasikan"),
    ).toBeVisible({ timeout: 10_000 });
    const playbook = page.getByRole("button", { name: /Playbook/i }).first();
    if (await playbook.isVisible().catch(() => false)) {
      await playbook.click();
    }
    await page.getByRole("button", { name: "Lanjutkan" }).click();
    await page.getByRole("button", { name: "Buat Proyek" }).click();

    await expect(page).toHaveURL(/\/projects\/[^/]+/, { timeout: 30_000 });
    await expect(
      page.getByText(/Brief Ebook|Asisten Strategi|premium|Posisi/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });
});
