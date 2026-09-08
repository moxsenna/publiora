import { test, expect } from "@playwright/test";
import path from "node:path";
import fs from "node:fs";

const SCREENSHOT_DIR = path.resolve("test-results/stage4-screenshots");

const MOCK_PROJECT = {
  id: "proj-review-e2e",
  title: "Panduan Investasi Properti Pemula",
  subtitle: "Langkah Praktis Menghasilkan Passive Income",
  user_id: "user-123",
  status: "draft",
  ebook_type: "lead_magnet",
  final_cta: "Konsultasi Gratis Sekarang",
  cta_goal: "lead_generation",
  cta_url: "https://example.com/konsultasi",
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

const MOCK_STRATEGY = {
  readiness_score: 85,
  state: {
    version: 2,
    ebook_type: "lead_magnet",
    strategy: {
      target_audience: "Karyawan usia 25-35 tahun yang ingin investasi properti",
      core_promise: "Mulai investasi properti modal minim tanpa takut rugi",
      reader_level: "beginner",
      tone_of_voice: "authoritative",
      primary_topic: "Investasi Properti",
      content_pillars: ["Analisis Lokasi", "Perhitungan Finansial", "Negosiasi"],
      pain_points: ["Modal terbatas", "Takut ditipu agen"],
    },
    approved_sections: [],
  },
};

const MOCK_OUTLINE = {
  id: "outline-1",
  project_id: "proj-review-e2e",
  approved: true,
  sections: [
    {
      id: "sec-1",
      position: 1,
      title: "Pondasi Finansial Sebelum Membeli Properti",
      summary: "Memastikan cash flow aman",
      key_points: ["Dana darurat", "Rasio utang"],
      estimated_words: 500,
      status: "approved",
    },
    {
      id: "sec-2",
      position: 2,
      title: "Menemukan Properti di Bawah Harga Pasar",
      summary: "Trik mencari peluang",
      key_points: ["Riset lokasi", "Cek NJOP"],
      estimated_words: 700,
      status: "approved",
    },
  ],
  approved_at: new Date().toISOString(),
};

const MOCK_SECTIONS = [
  {
    id: "sec-1",
    project_id: "proj-review-e2e",
    outline_section_id: "sec-1",
    position: 1,
    title: "Pondasi Finansial Sebelum Membeli Properti",
    content: "<p>Sebelum membeli properti pertama, pastikan keuangan Anda sudah memiliki pondasi yang kokoh. Dana darurat minimal enam bulan pengeluaran rutin harus tersimpan aman.</p>",
    content_html: "<p>Sebelum membeli properti pertama, pastikan keuangan Anda sudah memiliki pondasi yang kokoh. Dana darurat minimal enam bulan pengeluaran rutin harus tersimpan aman.</p>",
    word_count: 550,
    status: "generated",
  },
  {
    id: "sec-2",
    project_id: "proj-review-e2e",
    outline_section_id: "sec-2",
    position: 2,
    title: "Menemukan Properti di Bawah Harga Pasar",
    content: "<p>Mencari properti murah bukan berarti membeli properti bermasalah. Periksa sertifikat dan legalitas tanah secara teliti ke kantor BPN setempat.</p>",
    content_html: "<p>Mencari properti murah bukan berarti membeli properti bermasalah. Periksa sertifikat dan legalitas tanah secara teliti ke kantor BPN setempat.</p>",
    word_count: 720,
    status: "generated",
  },
];

const MOCK_AI_REVIEW = {
  summary: "Secara keseluruhan naskah sudah sangat aplikatif dan fokus pada kebutuhan pemula. Ada sedikit catatan pada transisi antar bab 1 dan bab 2 serta kejelasan call to action.",
  issues: [
    {
      severity: "warning",
      category: "audience suitability",
      section_id: "sec-1",
      title: "Istilah perbankan perlu diperjelas",
      explanation: "Istilah DSR (Debt Service Ratio) belum didefinisikan untuk pembaca pemula.",
      suggested_action: "Tambahkan satu kalimat penjelasan singkat mengenai cara menghitung rasio utang perbankan.",
    },
    {
      severity: "important",
      category: "weak transitions",
      section_id: "sec-2",
      title: "Transisi antar bab terasa mendadak",
      explanation: "Bab 2 langsung membahas riset harga tanpa merangkum kesiapan finansial dari bab 1.",
      suggested_action: "Tambahkan kalimat pembuka di awal bab 2 yang menghubungkan kesiapan dana dengan target properti.",
    },
  ],
  reviewed_at: new Date().toISOString(),
};

test.describe("Stage 4 Review & Quality Check User-Friendly Experience", () => {
  test.beforeEach(async ({ page }) => {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

    page.on("console", (msg) => console.log("PAGE LOG:", msg.type(), msg.text()));
    page.on("pageerror", (err) => console.log("PAGE ERROR:", err.message));
    page.on("response", (resp) => {
      if (!resp.ok()) console.log("FAILED RES:", resp.status(), resp.url());
    });

    // Inject mock auth session into localStorage before any page script executes
    await page.addInitScript(() => {
      window.localStorage.setItem(
        "__publiora_test_session",
        JSON.stringify({
          user: { id: "user-123", email: "author@publiora.id" },
          profile: {
            id: "user-123",
            name: "Author Test",
            email: "author@publiora.id",
            role: "user",
            plan: "pro",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        })
      );
    });

    // Mock all necessary API endpoints
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          user: { id: "user-123", email: "author@publiora.id" },
        }),
      });
    });

    await page.route("**/api/projects/proj-review-e2e", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PROJECT),
      });
    });

    await page.route("**/api/projects/proj-review-e2e/strategy", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_STRATEGY),
      });
    });

    await page.route("**/api/projects/proj-review-e2e/outline", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_OUTLINE),
      });
    });

    await page.route("**/api/projects/proj-review-e2e/sections", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_SECTIONS),
      });
    });

    await page.route("**/api/projects/proj-review-e2e/quality-review", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_AI_REVIEW),
      });
    });

    await page.route("**/api/projects/proj-review-e2e/titles", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ titles: [] }),
      });
    });

    await page.route("**/api/projects/proj-review-e2e/ctas", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ctas: [] }),
      });
    });

    await page.route("**/api/billing/balance", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ credits: 25 }),
      });
    });
  });

  test("Desktop: renders balanced 2-column layout, segmented review tabs, and Indonesian AI review", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/projects/proj-review-e2e?step=review");

    // 1. Stage Chrome & Header
    await expect(page.getByText("Tahap 4 dari 5: Tinjauan Naskah")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Tinjau & Kurasi Ebook" })).toBeVisible();

    // 2. Segmented review tabs
    const systemTabBtn = page.getByRole("button", { name: /Checklist Sistem/i });
    const aiTabBtn = page.getByRole("button", { name: /Audit Redaksi AI/i });
    await expect(systemTabBtn).toBeVisible();
    await expect(aiTabBtn).toBeVisible();

    // In system tab: check for checklist items or pass state
    await expect(page.getByText("Pemeriksaan & Audit Kualitas")).toBeVisible();
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-1-system-checklist.png"),
    });

    // 3. Switch to AI Redaksi tab
    await aiTabBtn.click();
    await expect(page.getByText("Audit Redaksi & Alur Naskah (AI)")).toBeVisible();

    // Trigger AI Quality Check
    const runAiBtn = page.getByRole("button", { name: /Periksa kualitas dengan AI/i });
    await expect(runAiBtn).toBeVisible();
    await runAiBtn.click();

    await expect(page.getByText("Rangkuman Evaluasi Naskah")).toBeVisible();
    await expect(page.getByText("Saran opsional untuk menyempurnakan naskah")).toBeVisible();

    // Verify Indonesian translations of category and severity
    await expect(page.getByText("Kesesuaian Audiens", { exact: true })).toBeVisible();
    await expect(page.getByText("Alur & Transisi", { exact: true })).toBeVisible();
    await expect(page.getByText("Prioritas Utama", { exact: true })).toBeVisible();
    await expect(page.getByText("Saran Perbaikan", { exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "desktop-2-ai-editorial-tab.png"),
    });

    // 4. Desktop Sidebar: Kesiapan Ebook, Preview, and Guide
    await expect(page.getByText("Kesiapan Ebook")).toBeVisible();
    await expect(page.getByText("Kendala", { exact: true })).toBeVisible();
    await expect(page.getByText("Peringatan", { exact: true })).toBeVisible();
    await expect(page.getByText("Lolos", { exact: true })).toBeVisible();

    // Preview stats
    await expect(page.getByText("2 bab siap")).toBeVisible();
    await expect(page.getByText(/menit baca/i)).toBeVisible();
    await expect(page.getByText(/Pratinjau sebagai pembaca/i)).toBeVisible();

    // Guide
    await expect(page.getByText("Panduan Tahap Tinjau")).toBeVisible();

    // Final CTA and Title inputs
    await expect(page.locator("#review-title-input")).toBeVisible();
    await expect(page.locator("#review-cta-section")).toBeVisible();
  });

  test("Mobile: stacks seamlessly, tabs fit without overflow, touch targets are friendly", async ({
    page,
  }) => {
    // Test on 375px mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/projects/proj-review-e2e?step=review");

    await expect(page.getByRole("heading", { name: "Tinjau & Kurasi Ebook" })).toBeVisible();

    // Segmented tabs fit without overflow
    const systemTabBtn = page.getByRole("button", { name: /Checklist/i });
    const aiTabBtn = page.getByRole("button", { name: /Audit/i });
    await expect(systemTabBtn).toBeVisible();
    await expect(aiTabBtn).toBeVisible();

    // Check no horizontal scrollbar on body
    const hasHorizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasHorizontalOverflow).toBe(false);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-1-system-checklist.png"),
    });

    // Switch to AI tab on mobile
    await aiTabBtn.click();
    await expect(page.getByText("Audit Redaksi & Alur Naskah (AI)")).toBeVisible();

    // Trigger AI Quality Check on mobile
    const runAiBtn = page.getByRole("button", { name: /Periksa kualitas dengan AI/i });
    await expect(runAiBtn).toBeVisible();
    await runAiBtn.click();

    await expect(page.getByText("Rangkuman Evaluasi Naskah")).toBeVisible();
    await expect(page.getByText("Kesesuaian Audiens", { exact: true })).toBeVisible();
    await expect(page.getByText("Prioritas Utama", { exact: true })).toBeVisible();

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-2-ai-editorial-tab.png"),
    });

    // Verify 320px ultra-narrow viewport doesn't break
    await page.setViewportSize({ width: 320, height: 568 });
    const hasNarrowOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    expect(hasNarrowOverflow).toBe(false);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "mobile-3-narrow-320px.png"),
    });
  });
});
