import { expect, test } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";

const hasCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

test.describe("@attribution-lifecycle pratinjau dan klaim", () => {
  test.skip(!hasCredentials, "needs E2E_EMAIL and E2E_PASSWORD env vars");

  test("Journey A — pratinjau memakai Reader penuh tanpa progres tersimpan", async ({ page }) => {
    await loginWithStorage(page);
    await page.goto("/projects");
    // Ambil proyek apa pun (bukan "Proyek baru" dan bukan halaman preview).
    const projectLink = page
      .locator('a[href^="/projects/"]:not([href="/projects/new"]):not([href$="/preview"])')
      .first();
    test.skip((await projectLink.count()) === 0, "Akun uji tidak memiliki proyek.");
    const href = await projectLink.getAttribute("href");
    expect(href).toBeTruthy();

    const progressRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("/reading-progress") || url.includes("/progress")) {
        progressRequests.push(url);
      }
    });

    await page.goto(`${href}/preview`);
    // Mode creator_preview selalu menunjukkan banner pratinjau tanpa
    // ele-status "Terbit" (tidak ada publikasi & tidak ada klaim baru).
    await expect(page.getByText("Pratinjau", { exact: false }).first()).toBeVisible();
    expect(new URL(page.url()).pathname).toBe(`${href}/preview`);
    await page.waitForTimeout(1000);
    // Preview tidak pernah menyimpan progress pembaca.
    expect(progressRequests).toEqual([]);
  });

  test("Journey F — tautan klaim memakai domain baca, bukan origin aplikasi", async ({ page }) => {
    await loginWithStorage(page);
    await page.goto("/dashboard");
    const publishedLink = page.locator('a[href^="/published/"]').first();
    test.skip((await publishedLink.count()) === 0, "Akun uji tidak memiliki publikasi.");
    await publishedLink.click();

    await page.getByRole("tab", { name: "Tautan klaim" }).click();
    const createButton = page.getByRole("button", { name: "Buat tautan klaim" });
    if (await createButton.count()) {
      // Buat tautan klaim baru agar ada baris yang bisa diverifikasi.
      await createButton.click();
      const labelInput = page.locator("#claim-label");
      await expect(labelInput).toBeVisible();
      await labelInput.fill(`e2e-${Date.now()}`);
      await page.getByRole("button", { name: "Buat tautan" }).click();
      await expect(page.getByText("Tautan klaim dibuat")).toBeVisible();
    }

    const claimLink = page.locator('a[href*="/claim/"]').first();
    test.skip((await claimLink.count()) === 0, "Tidak ada tautan klaim untuk diverifikasi.");
    const href = await claimLink.getAttribute("href");
    expect(href).toBeTruthy();
    // Distribusi selalu absolut menuju domain reader baca.publiora.biz.id /
    // konfigurasi NEXT_PUBLIC_READER_URL — bukan path asal aplikasi.
    expect(href).toMatch(/^https?:\/\//);
    expect(href).toContain("/claim/");
    if (process.env.NEXT_PUBLIC_READER_URL) {
      expect(new URL(href).origin).toBe(new URL(process.env.NEXT_PUBLIC_READER_URL).origin);
    }
  });
});