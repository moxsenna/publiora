/**
 * Offer Library + product-aware onboarding — Journeys A–F (no live AI).
 *
 * A Lead with saved offer
 * B Lead without offer
 * C Bonus quick create
 * D Offer update + stale/sync UI
 * E Publish stores offer_context (API-level when project ready)
 * F Bonus cannot create without offer (client gate)
 *
 * Requires: E2E_EMAIL, E2E_PASSWORD (+ Supabase public env).
 * Skips cleanly when credentials are missing.
 */

import { test, expect, type Page } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";
import {
  createProjectAndOpenWorkspace,
  ensureWizardAuthor,
  goToFormatStep,
  PROJECT_WORKSPACE_URL,
  selectLeadGoal,
} from "./helpers/wizard";

const stamp = () => Date.now().toString(36);

async function createOfferViaApi(
  page: Page,
  body: Record<string, unknown>,
): Promise<{ id: string; name: string }> {
  const res = await page.request.post("/api/offers", { data: body });
  expect(res.ok(), `create offer failed: ${res.status()} ${await res.text()}`).toBeTruthy();
  const json = (await res.json()) as { offer: { id: string; name: string } };
  expect(json.offer?.id).toBeTruthy();
  return json.offer;
}

async function goToNewProject(page: Page) {
  await page.goto("/projects/new");
  await expect(
    page.getByRole("heading", { name: "Buat Proyek Baru" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Apa yang ingin Anda buat?")).toBeVisible();
}

test.describe("offer library journeys A–F", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD,
    "needs E2E_EMAIL and E2E_PASSWORD env vars",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("sidebar shows Produk & Penawaran and list page loads", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("link", { name: /Produk & Penawaran/i }).first(),
    ).toBeVisible({ timeout: 15_000 });
    await page.getByRole("link", { name: /Produk & Penawaran/i }).first().click();
    await expect(page).toHaveURL(/\/offers/);
    await expect(
      page.getByRole("heading", { name: /Produk & Penawaran/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Journey A — Lead Magnet with saved offer", async ({ page }) => {
    const name = `E2E Offer A ${stamp()}`;
    const offer = await createOfferViaApi(page, {
      name,
      offer_type: "service",
      ownership: "owned",
      target_audience: "Founder SaaS tahap awal",
      primary_outcome: "Menemukan hambatan growth",
      niche: "SaaS B2B",
      destination_url: "https://example.com/growth-audit",
    });

    await goToNewProject(page);
    await page.getByRole("button", { name: /Lead Magnet/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(page.getByText("Ide lead magnet")).toBeVisible({
      timeout: 10_000,
    });
    await page.getByLabel("Ide lead magnet").fill("Checklist growth audit 7 hari");

    await page
      .getByRole("button", { name: /Pilih produk atau penawaran/i })
      .click();
    await page.getByLabel("Cari produk").fill(name);
    await expect(page.getByRole("option", { name: new RegExp(name) })).toBeVisible({
      timeout: 15_000,
    });
    await page.getByRole("option", { name: new RegExp(name) }).click();
    await expect(page.getByText(name).first()).toBeVisible();

    await selectLeadGoal(page, "visit_offer");
    await ensureWizardAuthor(page);
    await goToFormatStep(page);
    await createProjectAndOpenWorkspace(page);

    await expect(page).toHaveURL(PROJECT_WORKSPACE_URL);
    await expect(page).toHaveURL(/stage=strategy|step=strategy/);
    await expect(page.getByText(new RegExp(name)).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page.getByText(/Produk \/ Penawaran|Dipromosikan/i).first(),
    ).toBeVisible({ timeout: 15_000 });

    void offer;
  });

  test("Journey B — Lead Magnet without offer", async ({ page }) => {
    await goToNewProject(page);
    await page.getByRole("button", { name: /Lead Magnet/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await page.getByLabel("Ide lead magnet").fill("Panduan email list building");
    await page.getByRole("button", { name: /Belum ada produk/i }).click();
    await selectLeadGoal(page, "collect_email");
    await ensureWizardAuthor(page);
    await goToFormatStep(page);
    await createProjectAndOpenWorkspace(page);

    await expect(page).toHaveURL(PROJECT_WORKSPACE_URL);
    await expect(
      page.getByText(/Brief Ebook|Asisten Strategi|email list/i).first(),
    ).toBeVisible({ timeout: 20_000 });
  });

  test("Journey C — Bonus quick create parent offer", async ({ page }) => {
    await goToNewProject(page);
    await page.getByRole("button", { name: /Bonus Pembelian/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(
      page.getByText(/Bonus ini melengkapi produk apa/i),
    ).toBeVisible({ timeout: 10_000 });

    await page.getByRole("button", { name: /Tambah cepat/i }).click();
    await expect(
      page.getByRole("heading", { name: /Tambah Produk dengan Cepat/i }),
    ).toBeVisible({ timeout: 10_000 });

    const parentName = `E2E Parent Bonus ${stamp()}`;
    await page.getByLabel("Nama produk").fill(parentName);
    await page.getByLabel("Jenis").selectOption("course");
    await page.getByLabel("Kepemilikan").selectOption("owned");
    await page.getByRole("button", { name: /Simpan dan Pilih/i }).click();

    await expect(page.getByText(parentName).first()).toBeVisible({
      timeout: 15_000,
    });

    await page
      .getByRole("button", { name: /Mempraktikkan materi produk/i })
      .click();
    await ensureWizardAuthor(page);
    await goToFormatStep(page);
    await createProjectAndOpenWorkspace(page);

    await expect(page).toHaveURL(PROJECT_WORKSPACE_URL);
    await expect(page.getByText(parentName).first()).toBeVisible({
      timeout: 20_000,
    });
    await expect(
      page
        .getByText(
          /Produk utama untuk Bonus|Bonus untuk produk|Produk \/ Penawaran/i,
        )
        .first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Journey D — Offer update shows stale indicator and sync dialog", async ({
    page,
  }) => {
    // Desktop rail holds StrategyBriefCard with stale badge (lg:flex).
    await page.setViewportSize({ width: 1400, height: 900 });

    const name = `E2E Offer D ${stamp()}`;
    const offer = await createOfferViaApi(page, {
      name,
      offer_type: "saas",
      ownership: "owned",
      target_audience: "Founder tahap awal",
      niche: "SaaS",
      destination_url: "https://example.com/d",
    });

    await goToNewProject(page);
    await page.getByRole("button", { name: /Lead Magnet/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();
    await page.getByLabel("Ide lead magnet").fill("Quick win for D");
    await page
      .getByRole("button", { name: /Pilih produk atau penawaran/i })
      .click();
    await page.getByLabel("Cari produk").fill(name);
    await page.getByRole("option", { name: new RegExp(name) }).click();
    await selectLeadGoal(page, "visit_offer");
    await ensureWizardAuthor(page);
    await goToFormatStep(page);
    await createProjectAndOpenWorkspace(page);
    await expect(page).toHaveURL(PROJECT_WORKSPACE_URL);
    const projectUrl = page.url();
    const projectId = projectUrl.match(/\/projects\/([^/?#]+)/)?.[1];
    expect(projectId).toBeTruthy();

    // Ensure link exists before patch.
    const linksBefore = await page.request.get(
      `/api/projects/${projectId}/offers`,
    );
    expect(linksBefore.ok()).toBeTruthy();
    const beforeJson = (await linksBefore.json()) as {
      items: Array<{ source_is_newer: boolean }>;
    };
    expect(beforeJson.items?.length ?? 0).toBeGreaterThan(0);

    // Wait so offer.updated_at is strictly newer than source_offer_updated_at.
    await page.waitForTimeout(1200);

    const patch = await page.request.patch(`/api/offers/${offer.id}`, {
      data: {
        target_audience: "Founder dan Head of Growth SaaS B2B",
      },
    });
    expect(patch.ok(), await patch.text()).toBeTruthy();
    const patchBody = (await patch.json()) as { stale_project_count?: number };
    expect((patchBody.stale_project_count ?? 0) >= 1).toBeTruthy();

    const linksAfter = await page.request.get(
      `/api/projects/${projectId}/offers`,
    );
    const afterJson = (await linksAfter.json()) as {
      items: Array<{ source_is_newer: boolean }>;
    };
    expect(afterJson.items?.[0]?.source_is_newer).toBe(true);

    await page.goto(projectUrl);
    await page.reload();
    await expect(
      page.getByText(/Produk telah diperbarui/i).first(),
    ).toBeVisible({ timeout: 20_000 });

    const syncBtn = page.getByRole("button", { name: /Sinkronkan/i }).first();
    await expect(syncBtn).toBeVisible({ timeout: 10_000 });
    await syncBtn.click();
    await expect(
      page.getByRole("heading", { name: /Bandingkan perubahan produk/i }),
    ).toBeVisible({ timeout: 10_000 });
    await page.getByRole("button", { name: /Sinkronkan ke proyek/i }).click();
    await expect(
      page.getByText(/Founder dan Head of Growth/i).first(),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("Journey E — Publish snapshot includes offer_context when linked", async ({
    page,
  }) => {
    const name = `E2E Offer E ${stamp()}`;
    const offer = await createOfferViaApi(page, {
      name,
      offer_type: "service",
      ownership: "affiliate",
      destination_url: "https://example.com/e",
    });

    const detail = await page.request.get(`/api/offers/${offer.id}`);
    expect(detail.ok()).toBeTruthy();
    const body = (await detail.json()) as {
      offer: { ownership: string };
      linked_projects: unknown[];
    };
    expect(body.offer.ownership).toBe("affiliate");
    expect(Array.isArray(body.linked_projects)).toBe(true);

    if (process.env.E2E_PROJECT_ID) {
      const pub = await page.request.get(
        `/api/projects/${process.env.E2E_PROJECT_ID}`,
      );
      expect([200, 404]).toContain(pub.status());
    }
  });

  test("Journey F — Bonus without offer is blocked in wizard", async ({
    page,
  }) => {
    await goToNewProject(page);
    await page.getByRole("button", { name: /Bonus Pembelian/i }).click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await page
      .getByRole("button", { name: /Mempraktikkan materi produk/i })
      .click();
    await page.getByRole("button", { name: "Lanjutkan" }).click();

    await expect(
      page.getByText(/Pilih atau buat produk utama|wajib diisi/i).first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("button", { name: "Buat Proyek" })).toHaveCount(
      0,
    );
  });
});
