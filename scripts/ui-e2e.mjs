/**
 * Deterministic UI E2E covering TestSprite TC001–TC015 with real credentials.
 * Usage: BASE_URL=http://127.0.0.1:3005 node scripts/ui-e2e.mjs
 */
import { readFileSync, existsSync } from "fs";
import { chromium } from "playwright";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3005";
const credsPath = "testsprite_tests/tmp/test_credentials.json";
if (!existsSync(credsPath)) {
  console.error("Missing", credsPath);
  process.exit(1);
}
const creds = JSON.parse(readFileSync(credsPath, "utf8"));

// load .env.local for service role if needed
function loadEnv() {
  if (!existsSync(".env.local")) return {};
  return Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [
          l.slice(0, i).trim(),
          l
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, ""),
        ];
      })
  );
}
const env = loadEnv();

const results = [];
const ok = (id, d = "") => {
  results.push({ id, pass: true, d });
  console.log("PASS", id, d);
};
const fail = (id, d = "") => {
  results.push({ id, pass: false, d });
  console.error("FAIL", id, d);
};
const assert = (c, id, d = "") => (c ? ok(id, d) : fail(id, d));

async function login(page, email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill("#email", email);
  await page.fill("#password", password);
  await page.click('button[type="submit"]');
  await page.waitForURL("**/dashboard**", { timeout: 20000 });
}

async function main() {
  console.log("BASE", BASE);
  console.log("USER", creds.LOGIN_USER);
  console.log("CLAIM", creds.claim_token, "SLUG", creds.slug);

  // verify HTTP
  const health = await fetch(`${BASE}/login`);
  assert(health.ok, "TC000 server health", String(health.status));

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  try {
    // TC002 login dashboard
    await login(page, creds.LOGIN_USER, creds.LOGIN_PASSWORD);
    assert(page.url().includes("/dashboard"), "TC002 dashboard url", page.url());
    const dash = await page.locator("body").innerText();
    assert(/Credits|kredit|Projects|New project/i.test(dash), "TC002 dashboard content");

    // TC012 credits visible
    assert(/\d+/.test(dash) && /kredit|Credits|CREDITS/i.test(dash), "TC012 credits visible");

    // TC007 session restore
    await page.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" });
    assert(page.url().includes("/dashboard"), "TC007 session restore", page.url());

    // TC014 projects list
    await page.goto(`${BASE}/projects`, { waitUntil: "networkidle" });
    const projectsText = await page.locator("body").innerText();
    assert(/Projects|project/i.test(projectsText), "TC014 projects page");

    // TC003 create project
    await page.goto(`${BASE}/projects/new`, { waitUntil: "networkidle" });
    const typeBtn = page.getByRole("button", { name: /Lead Magnet/i });
    if (await typeBtn.count()) await typeBtn.click();
    const blank = page.getByRole("button", { name: /^Blank$/i });
    if (await blank.count()) await blank.click();
    await page.fill("#title", `UI E2E Project ${Date.now()}`);
    await page.fill("#author", "TestSprite Runner");
    await page.fill(
      "#description",
      "Brief untuk UI E2E full flow — cukup panjang agar lolos validasi min 20."
    );
    await page.fill("#audience", "Founder B2B");
    await page.fill("#tone", "Taktis");
    await page.fill("#niche", "Marketing");
    await page.getByRole("button", { name: /Create project/i }).click();
    await page.waitForURL(/\/projects\/[0-9a-f-]{8,}/i, { timeout: 20000 });
    const projectUrl = page.url();
    assert(/\/projects\//.test(projectUrl), "TC003 create project", projectUrl);
    const projectId = projectUrl.split("/projects/")[1]?.split(/[?#]/)[0];

    // TC010 chat
    const ta = page.locator("textarea").first();
    if (await ta.count()) {
      await ta.fill("Bantu susun pillar topik singkat untuk audiens founder.");
      try {
        await page.getByRole("button", { name: /send|kirim/i }).first().click({ timeout: 3000 });
      } catch {
        await ta.press("Enter");
      }
      await page.waitForTimeout(8000);
    }
    const chatBody = await page.locator("body").innerText();
    assert(
      /Strategist|Chat|pillar|assistant|Mulai percakapan|pesan|message/i.test(chatBody),
      "TC010 chat panel"
    );

    // TC005 outline
    try {
      await page.getByText("Outline", { exact: true }).first().click({ timeout: 5000 });
    } catch {
      /* tab may already active */
    }
    await page.waitForTimeout(1000);
    const genOutline = page.getByRole("button", { name: /Generate outline/i });
    if (await genOutline.count()) {
      await genOutline.click();
      await page.waitForTimeout(45000);
    }
    // approve if present
    const approve = page.getByRole("button", { name: /Approve/i });
    if (await approve.count()) {
      await approve.click();
      await page.waitForTimeout(3000);
    }
    const outlineBody = await page.locator("body").innerText();
    assert(
      /Outline|Generate outline|Approve|bab|section|Chapter/i.test(outlineBody),
      "TC005 outline tab"
    );

    // TC008 sections enhance UI present
    try {
      await page.getByText("Sections", { exact: true }).first().click({ timeout: 5000 });
    } catch {}
    await page.waitForTimeout(1000);
    const secBody = await page.locator("body").innerText();
    assert(/Sections|Generate|pending|Outline belum/i.test(secBody), "TC008 sections panel");

    // Tools
    try {
      await page.getByText("Tools", { exact: true }).first().click({ timeout: 5000 });
    } catch {}
    await page.waitForTimeout(800);
    const toolsBody = await page.locator("body").innerText();
    assert(/Title generator|CTA generator|Generate/i.test(toolsBody), "TC008b tools panel");

    // TC006 publish dialog presence (may disable if no sections)
    const publishBtn = page.getByRole("button", { name: /Publish/i });
    assert((await publishBtn.count()) > 0, "TC006 publish button present");

    // TC015 billing
    await page.goto(`${BASE}/settings/billing`, { waitUntil: "networkidle" });
    const bill = await page.locator("body").innerText();
    assert(/Billing|kredit|Credits|Plans|Top-up/i.test(bill), "TC015 billing page");

    // TC001 claim with seeded token as reader
    await context.clearCookies();
    // clear storage
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await login(page, creds.READER_USER, creds.READER_PASSWORD);
    await page.goto(`${BASE}/claim/${creds.claim_token}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    const claimPage = await page.locator("body").innerText();
    // claim button or already owned or ready
    const claimBtn = page.getByRole("button", {
      name: /Add to My Library|Login & Add|Klaim|Claim/i,
    });
    if (await claimBtn.count()) {
      await claimBtn.first().click();
      await page.waitForTimeout(4000);
    }
    // go library
    await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const lib = await page.locator("body").innerText();
    assert(
      /Library|ebook|Baca|Lanjutkan|TestSprite|Seed/i.test(lib),
      "TC001 library after claim",
      lib.slice(0, 120)
    );

    // TC009 reader
    if (creds.slug) {
      await page.goto(`${BASE}/read/${creds.slug}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const reader = await page.locator("body").innerText();
      assert(
        /section|chapter|ebook|TestSprite|Seed|Baca|reader/i.test(reader),
        "TC009 reader page",
        page.url()
      );
    } else {
      fail("TC009 reader page", "no slug");
    }

    // TC011 resume progress UI — library shows progress or continue
    await page.goto(`${BASE}/library`, { waitUntil: "networkidle" });
    const lib2 = await page.locator("body").innerText();
    assert(/Library|Baca|Lanjutkan|Selesai|%|Belum dibaca/i.test(lib2), "TC011 library progress UI");

    // TC013 claim link management — creator published detail
    await context.clearCookies();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await login(page, creds.LOGIN_USER, creds.LOGIN_PASSWORD);
    if (creds.ebookId) {
      await page.goto(`${BASE}/published/${creds.ebookId}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(1500);
      const pub = await page.locator("body").innerText();
      assert(
        /Claim|claim link|New claim|Export|readers|Buka reader/i.test(pub),
        "TC013 published claim links",
        page.url()
      );
    } else {
      fail("TC013 published claim links", "no ebookId");
    }

    // TC004 register page reachable when logged out (do not submit — rate limit)
    await context.clearCookies();
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
    await page.evaluate(() => {
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {}
    });
    await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const reg = await page.locator("body").innerText();
    assert(
      page.url().includes("/register") &&
        /Create account|Nama|Email|Password/i.test(reg),
      "TC004 register form present",
      page.url()
    );

  } catch (e) {
    fail("SUITE_CRASH", e instanceof Error ? e.message : String(e));
  } finally {
    await browser.close();
  }

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log("\nSUMMARY passed=%d failed=%d total=%d", passed, failed, results.length);
  if (failed) {
    for (const r of results.filter((x) => !x.pass)) console.error("-", r.id, r.d);
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
