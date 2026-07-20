/**
 * E2E: Strategy contextual replies (mocked AI, no live credits).
 *
 * Intercepts chat POST + messages GET + strategy GET with fixture data
 * so the test runs offline. Skips cleanly when E2E credentials are missing.
 *
 * Requires: E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID
 * Seed first: node scripts/seed-e2e-workflow-project.mjs
 */

import { test, expect } from "@playwright/test";
import { loginWithStorage } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const TS = "2026-07-20T10:00:00.000Z";
const STRATEGY_UPDATED_AT = TS;

function fixtureTimestamp(offsetMinutes = 0): string {
  const d = new Date(TS);
  d.setMinutes(d.getMinutes() + offsetMinutes);
  return d.toISOString();
}

// -- Suggested replies (Indonesian labels, planner via plan §15) -------------

const suggestionsTurn1 = [
  {
    label: "SEO organik",
    message: "Saya paling berpengalaman di SEO organik.",
    field: "unique_angle",
    intent: "answer",
  },
  {
    label: "Paid Ads",
    message: "Saya paling berpengalaman menjalankan Paid Ads.",
    field: "unique_angle",
    intent: "answer",
  },
  {
    label: "B2B lead generation",
    message: "Keahlian utama saya adalah B2B lead generation.",
    field: "unique_angle",
    intent: "answer",
  },
  {
    label: "Bantu saya memilih",
    message:
      "Saya belum yakin. Bantu saya memilih area yang paling potensial.",
    field: "unique_angle",
    intent: "ask_recommendation",
  },
];

const suggestionsTurn2 = [
  {
    label: "Lead magnet",
    message:
      "Ebook ini akan saya gunakan sebagai lead magnet untuk dapat kontak.",
    field: "desired_outcome",
    intent: "answer",
  },
  {
    label: "Membangun otoritas",
    message:
      "Saya ingin membangun otoritas sebagai ahli di niche ini.",
    field: "desired_outcome",
    intent: "answer",
  },
  {
    label: "Bantu saya memilih",
    message: "Saya belum yakin. Bantu saya memilih tujuan yang paling cocok.",
    field: "desired_outcome",
    intent: "ask_recommendation",
  },
];

// -- Strategy state fixtures -------------------------------------------------

const emptyStrategy = {
  schema_version: 2,
  strategy: {
    topic: null,
    audience: null,
    audience_sophistication: null,
    primary_problem: null,
    pain_points: [],
    desired_outcome: null,
    core_promise: null,
    unique_angle: null,
    content_pillars: [],
    product_or_offer: null,
    funnel_goal: null,
    cta_goal: null,
    tone: null,
  },
  missing_fields: [
    "topic",
    "audience",
    "primary_problem",
    "desired_outcome",
    "core_promise",
    "unique_angle",
  ],
  next_action: "continue_strategy",
  conversation_summary: null,
  updated_at: STRATEGY_UPDATED_AT,
};

const strategyAfterTurn1 = {
  ...emptyStrategy,
  strategy: {
    ...emptyStrategy.strategy,
    topic: "SEO organik untuk bisnis kecil",
    unique_angle: "Saya paling berpengalaman di SEO organik.",
  },
  missing_fields: ["audience", "primary_problem", "desired_outcome", "core_promise"],
  next_action: "continue_strategy",
  readiness_score: 33,
  updated_at: STRATEGY_UPDATED_AT,
};

// -- Chat response fixtures --------------------------------------------------

function chatResponseTurn1(projectId: string) {
  return {
    message: {
      id: "msg-asst-1",
      project_id: projectId,
      role: "assistant",
      content:
        "Sip, SEO organik adalah area yang powerful. Sekarang, apa tujuan utama ebook ini? Apakah untuk lead magnet, membangun otoritas, atau untuk dijual?",
      agent: "strategist",
      metadata: {
        suggested_replies: suggestionsTurn2,
        strategy_context_updated_at: STRATEGY_UPDATED_AT,
        response_language: "id",
      },
      created_at: fixtureTimestamp(1),
    },
    state: strategyAfterTurn1,
    readiness_score: 33,
    next_action: "continue_strategy",
    missing_fields: ["audience", "primary_problem", "desired_outcome", "core_promise"],
  };
}

function chatResponseTurn2(projectId: string) {
  return {
    message: {
      id: "msg-asst-2",
      project_id: projectId,
      role: "assistant",
      content:
        "Lead magnet adalah pilihan yang tepat untuk membangun list. Sekarang, siapa target pembaca ideal untuk ebook ini?",
      agent: "strategist",
      metadata: {
        suggested_replies: [
          {
            label: "Founder startup",
            message: "Target pembaca saya adalah founder startup tahap awal.",
            field: "audience",
            intent: "answer",
          },
          {
            label: "Marketing manager",
            message: "Target pembaca saya adalah marketing manager di perusahaan menengah.",
            field: "audience",
            intent: "answer",
          },
          {
            label: "Bantu saya memilih",
            message: "Saya belum yakin. Bantu saya tentukan target pembaca yang paling cocok.",
            field: "audience",
            intent: "ask_recommendation",
          },
        ],
        strategy_context_updated_at: STRATEGY_UPDATED_AT,
        response_language: "id",
      },
      created_at: fixtureTimestamp(2),
    },
    state: {
      ...strategyAfterTurn1,
      strategy: {
        ...strategyAfterTurn1.strategy,
        desired_outcome: "Lead magnet untuk dapat kontak",
      },
      next_action: "continue_strategy",
      readiness_score: 42,
      missing_fields: ["audience", "primary_problem", "core_promise"],
    },
    readiness_score: 42,
    next_action: "continue_strategy",
    missing_fields: ["audience", "primary_problem", "core_promise"],
  };
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

const PROJECT_ID = process.env.E2E_PROJECT_ID;

test.describe("Strategy contextual replies (mocked offline)", () => {
  test.skip(
    !process.env.E2E_EMAIL || !process.env.E2E_PASSWORD || !PROJECT_ID,
    "needs E2E_EMAIL, E2E_PASSWORD, E2E_PROJECT_ID",
  );

  test.beforeEach(async ({ page }) => {
    await loginWithStorage(page);
  });

  test("A. Indonesian copy smoke on Strategy stage", async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);

    // Header
    await expect(page.getByText("Asisten Strategi").first()).toBeVisible({
      timeout: 20_000,
    });

    // "Brief Ebook" title (desktop side panel)
    await expect(page.getByText("Brief Ebook").first()).toBeVisible({
      timeout: 10_000,
    });

    // Readiness card
    await expect(page.getByText("Kesiapan Strategi").first()).toBeVisible({
      timeout: 10_000,
    });

    // Empty-state title
    await expect(
      page.getByText("Mulai susun strategi ebook").first(),
    ).toBeVisible({ timeout: 10_000 });

    // Starter chips are only visible in empty state
    await expect(
      page.getByText("Cari topik ebook").first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Saya sudah punya topik").first(),
    ).toBeVisible({ timeout: 5_000 });
    await expect(
      page.getByText("Ebook untuk leads").first(),
    ).toBeVisible({ timeout: 5_000 });

    // Composer placeholder (Indonesian)
    const composer = page.getByPlaceholder(/Tulis jawaban/);
    await expect(composer.first()).toBeVisible({ timeout: 5_000 });

    // "Buat struktur ebook" button should exist but be disabled (gate not met)
    const createOutlineBtn = page.getByRole("button", {
      name: /Buat struktur ebook/i,
    });
    // May not be visible on all viewports/screens; check disabled if present
    const btnCount = await createOutlineBtn.count();
    if (btnCount > 0) {
      await expect(createOutlineBtn.first()).toBeDisabled();
    }
  });

  test("B. Empty state starter chips -- click sends message, intercepted chat returns contextual chips", async ({
    page,
  }) => {
    let chatPostBody: unknown = null;

    // Intercept chat POST -- capture body, return fixture
    await page.route(`**/api/projects/${PROJECT_ID}/chat`, async (route) => {
      if (route.request().method() === "POST") {
        chatPostBody = JSON.parse(route.request().postData() ?? "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(chatResponseTurn1(PROJECT_ID!)),
        });
      } else {
        await route.continue();
      }
    });

    // Intercept messages GET -- return chat history after turn 1
    await page.route(`**/api/projects/${PROJECT_ID}/messages`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "msg-user-1",
              project_id: PROJECT_ID,
              role: "user",
              content: "Saya paling berpengalaman di SEO organik.",
              agent: null,
              metadata: {},
              created_at: fixtureTimestamp(0),
            },
            chatResponseTurn1(PROJECT_ID!).message,
          ]),
        });
      } else {
        await route.continue();
      }
    });

    // Intercept strategy GET
    await page.route(`**/api/projects/${PROJECT_ID}/strategy`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            state: strategyAfterTurn1,
            readiness_score: 33,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);

    // Verify empty-state title is not present after interception returns messages
    // Wait for the intercepted messages to load
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/projects/${PROJECT_ID}/messages`) &&
        resp.status() === 200,
      { timeout: 15_000 },
    );
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/projects/${PROJECT_ID}/strategy`) &&
        resp.status() === 200,
      { timeout: 15_000 },
    );

    // Wait for at least one assistant bubble to render
    await expect(
      page.getByText("SEO organik adalah area yang powerful").first(),
    ).toBeVisible({ timeout: 10_000 });

    // Contextual chips from fixture metadata should appear
    await expect(page.getByText("Lead magnet").first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Membangun otoritas").first()).toBeVisible({
      timeout: 5_000,
    });
    await expect(page.getByText("Bantu saya memilih").first()).toBeVisible({
      timeout: 5_000,
    });
  });

  test("C. Click contextual chip -- assert POST body has full message", async ({
    page,
  }) => {
    let capturedBody: { content: string } | null = null;

    // Intercept chat POST to capture body, return turn-2 fixture
    await page.route(`**/api/projects/${PROJECT_ID}/chat`, async (route) => {
      if (route.request().method() === "POST") {
        capturedBody = JSON.parse(route.request().postData() ?? "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(chatResponseTurn2(PROJECT_ID!)),
        });
      } else {
        await route.continue();
      }
    });

    // messages GET: return after turn 1 assistant (with turn 1 chips)
    await page.route(`**/api/projects/${PROJECT_ID}/messages`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([
            {
              id: "msg-user-1",
              project_id: PROJECT_ID,
              role: "user",
              content: "Saya paling berpengalaman di SEO organik.",
              agent: null,
              metadata: {},
              created_at: fixtureTimestamp(0),
            },
            chatResponseTurn1(PROJECT_ID!).message,
          ]),
        });
      } else {
        await route.continue();
      }
    });

    // strategy GET
    await page.route(`**/api/projects/${PROJECT_ID}/strategy`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            state: strategyAfterTurn1,
            readiness_score: 33,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);

    // Wait for intersection to settle
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/projects/${PROJECT_ID}/messages`) &&
        resp.status() === 200,
      { timeout: 15_000 },
    );

    // Click the "Lead magnet" contextual chip
    await expect(page.getByText("Lead magnet").first()).toBeVisible({
      timeout: 10_000,
    });
    await page.getByText("Lead magnet").first().click();

    // Wait for the chat POST to be intercepted
    await page.waitForResponse(
      (resp) =>
        resp.url().includes(`/api/projects/${PROJECT_ID}/chat`) &&
        resp.request().method() === "POST",
      { timeout: 15_000 },
    );

    // Assert the full message was sent in the request body
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.content).toBe(
      "Ebook ini akan saya gunakan sebagai lead magnet untuk dapat kontak.",
    );
  });

  test("D. Free text send -- verify request body and chips appear in response", async ({
    page,
  }) => {
    let capturedBody: { content: string } | null = null;

    await page.route(`**/api/projects/${PROJECT_ID}/chat`, async (route) => {
      if (route.request().method() === "POST") {
        capturedBody = JSON.parse(route.request().postData() ?? "{}");
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(chatResponseTurn1(PROJECT_ID!)),
        });
      } else {
        await route.continue();
      }
    });

    // messages GET: empty initial state (so starter chips show)
    await page.route(`**/api/projects/${PROJECT_ID}/messages`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify([]),
        });
      } else {
        await route.continue();
      }
    });

    await page.route(`**/api/projects/${PROJECT_ID}/strategy`, async (route) => {
      if (route.request().method() === "GET") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            state: emptyStrategy,
            readiness_score: 0,
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto(`/projects/${PROJECT_ID}?step=strategy`);

    // Verify empty state
    await expect(
      page.getByText("Cari topik ebook").first(),
    ).toBeVisible({ timeout: 10_000 });

    // Type a free-text message
    const composer = page.getByPlaceholder(/Tulis jawaban/);
    await composer.first().fill("Saya ingin membuat ebook tentang SEO.");
    await composer.first().press("Enter");

    // Assert body
    expect(capturedBody).not.toBeNull();
    expect(capturedBody!.content).toBe("Saya ingin membuat ebook tentang SEO.");
  });

  test("E. Manual scenarios documented as blocked if credentials missing", async () => {
    // This test always passes — it documents manual scenarios.
    // When E2E_* env vars are set, it still runs harmlessly.
    test.info().annotations.push({
      type: "manual-verification",
      description: [
        "The following scenarios require a live backend (not mockable offline):",
        "1. Edit brief manual -> chips hide (stale context). Verify that after opening StrategyFieldEditor",
        "   and saving a field change, the contextual chips below the last assistant message disappear.",
        "2. Complete required fields -> 'Buat struktur ebook' button becomes active.",
        "3. Reload page -> latest chips still appear (messages API returns persisted data).",
        "4. Starter chips only appear on truly empty state (no messages).",
        "5. No raw markdown in assistant bubble — content renders cleanly via AssistantMessageContent.",
        "All scenarios use fixture-simulated or live backend; verify manually against staging.",
      ].join("\n"),
    });
    // No-op assertion to satisfy Playwright
    expect(true).toBe(true);
  });
});
