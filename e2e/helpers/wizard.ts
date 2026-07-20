import type { Page } from "@playwright/test";

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
