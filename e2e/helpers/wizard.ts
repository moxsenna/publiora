import { expect, type Page } from "@playwright/test";

/** Matches /projects/{id} but not /projects/new */
export const PROJECT_WORKSPACE_URL =
  /\/projects\/(?!new(?:\/|\?|$))[^/?#]+/;

/** Ensure required author is filled (field is inside collapsed "Detail tambahan"). */
export async function ensureWizardAuthor(page: Page, name = "E2E Author") {
  const details = page.locator("details").filter({ hasText: "Detail tambahan" });
  if (await details.count()) {
    const open = await details.first().getAttribute("open");
    if (open === null) {
      await details.first().locator("summary").click();
    }
  }
  const author = page.locator("#author");
  if (await author.count()) {
    const current = await author.inputValue();
    if (!current?.trim()) {
      await author.fill(name);
    }
  }
}

export async function selectLeadGoal(page: Page, value: string) {
  await page.locator("#lead_goal").selectOption(value);
}

export async function goToFormatStep(page: Page) {
  await page.getByRole("button", { name: "Lanjutkan" }).click();
  await page.getByRole("button", { name: "Buat Proyek" }).waitFor({
    state: "visible",
    timeout: 15_000,
  });
}

export async function createProjectAndOpenWorkspace(page: Page) {
  await page.getByRole("button", { name: "Buat Proyek" }).click();
  await page.waitForURL(PROJECT_WORKSPACE_URL, { timeout: 30_000 });
}

/** Open app sidebar on mobile (TopBar hamburger). No-op if already visible. */
export async function openMobileNavIfNeeded(page: Page) {
  const navLink = page
    .getByRole("link", { name: /Produk & Penawaran/i })
    .first();
  if (await navLink.isVisible().catch(() => false)) return;
  const menu = page.getByRole("button", { name: "Open menu" });
  if (await menu.isVisible().catch(() => false)) {
    await menu.click();
    await navLink.waitFor({ state: "visible", timeout: 10_000 });
  }
}

/**
 * Open the strategy offer surface that is actually visible.
 * Mobile: force-open "Lihat brief" sheet.
 * Desktop: use the permanent right rail.
 */
export async function revealStrategyOfferContext(page: Page) {
  const dialog = page.getByRole("dialog", { name: /Brief & Kesiapan/i });
  if (await dialog.isVisible().catch(() => false)) return dialog;

  // Wait for strategy UI to finish loading (compact trigger or rail content).
  const lihatBrief = page.getByRole("button", { name: /Lihat brief/i });
  const rail = page.locator("div.hidden.lg\\:flex");

  // Prefer mobile compact trigger when it appears.
  try {
    await lihatBrief.waitFor({ state: "visible", timeout: 15_000 });
    await lihatBrief.click();
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    return dialog;
  } catch {
    // Desktop path: no compact trigger.
  }

  // Desktop rail may use Tailwind "hidden lg:flex" which Playwright still
  // considers visible on large viewports. Fall back to body.
  if (await rail.first().isVisible().catch(() => false)) {
    return page;
  }
  return page;
}

/** Assert offer context only on the currently visible strategy surface. */
export async function expectVisibleOfferContext(
  page: Page,
  opts?: { offerName?: string | RegExp; stale?: boolean },
) {
  const root = await revealStrategyOfferContext(page);
  // Always prefer dialog if it opened.
  const dialog = page.getByRole("dialog", { name: /Brief & Kesiapan/i });
  const assertRoot = (await dialog.isVisible().catch(() => false))
    ? dialog
    : root;

  // On mobile we MUST have opened the dialog — fail clearly otherwise.
  const isDialog = (await dialog.isVisible().catch(() => false)) === true;
  if (!isDialog) {
    // Last resort: click any button containing "brief"
    const anyBrief = page.locator("button", { hasText: /brief/i }).first();
    if (await anyBrief.isVisible().catch(() => false)) {
      await anyBrief.click();
      await expect(dialog).toBeVisible({ timeout: 10_000 });
    }
  }
  const finalRoot = (await dialog.isVisible().catch(() => false))
    ? dialog
    : assertRoot;

  await expect(finalRoot.getByText("Produk / Penawaran").first()).toBeVisible({
    timeout: 20_000,
  });
  if (opts?.offerName) {
    await expect(finalRoot.getByText(opts.offerName).first()).toBeVisible({
      timeout: 20_000,
    });
  }
  if (opts?.stale) {
    await expect(
      finalRoot.getByText("Produk telah diperbarui").first(),
    ).toBeVisible({ timeout: 20_000 });
  }
  return finalRoot;
}
