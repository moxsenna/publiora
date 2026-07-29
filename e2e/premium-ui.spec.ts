import { expect, test } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";

const hasCredentials = Boolean(process.env.E2E_EMAIL && process.env.E2E_PASSWORD);

async function expectNoHorizontalOverflow(page: import("@playwright/test").Page) {
  const overflow = await page.evaluate(() =>
    document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(8);
}

test.describe("@premium-ui dasbor dan proyek", () => {
  test.skip(!hasCredentials, "needs E2E_EMAIL and E2E_PASSWORD env vars");

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("menampilkan Dasbor lokal tanpa mengunci jumlah data", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expect(page.getByRole("link", { name: "Proyek Baru" }).first()).toHaveAttribute(
      "href",
      "/projects/new",
    );
    for (const label of ["Kredit", "Proyek", "Terbit", "Total pembaca", "Klaim aktif"]) {
      await expect(page.getByText(label, { exact: true }).first()).toBeVisible();
    }
    await expectNoHorizontalOverflow(page);
  });

  test("menampilkan koleksi dan filter proyek yang aksesibel", async ({ page }) => {
    await page.goto("/projects");
    await expect(page.getByRole("heading", { level: 1, name: "Proyek" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Cari proyek" })).toBeVisible();
    for (const label of ["Semua", "Draf", "Sedang dibuat", "Siap ditinjau", "Terbit"]) {
      await expect(page.getByRole("button", { name: label })).toHaveAttribute("aria-pressed");
    }
    await expectNoHorizontalOverflow(page);
  });
});
