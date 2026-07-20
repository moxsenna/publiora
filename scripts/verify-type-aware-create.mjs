/**
 * Live API verification for type-aware project creation (Task 18).
 * Creates a temp user, POSTs V2 payloads for all three ebook types,
 * asserts seeded Strategy V3 state, cleans up.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:3000 node scripts/verify-type-aware-create.mjs
 */
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  if (!existsSync(file)) return {};
  return Object.fromEntries(
    readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        const k = l.slice(0, i).trim();
        const v = l
          .slice(i + 1)
          .trim()
          .replace(/^["']|["']$/g, "");
        return [k, v];
      }),
  );
}

const env = { ...loadEnv(".env.local"), ...loadEnv(".env.e2e.local") };
for (const [k, v] of Object.entries(env)) {
  if (process.env[k] === undefined) process.env[k] = v;
}

const BASE = process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3000";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SB_URL || !ANON || !SERVICE) {
  console.error("Missing Supabase env (URL, ANON/PUBLISHABLE, SERVICE_ROLE)");
  process.exit(1);
}

const results = [];
const ok = (n, d = "") => {
  results.push({ n, pass: true, d });
  console.log("PASS", n, d);
};
const fail = (n, d = "") => {
  results.push({ n, pass: false, d });
  console.error("FAIL", n, d);
};
const assert = (c, n, d = "") => (c ? ok(n, d) : fail(n, d));

async function api(path, { method = "GET", token, body } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return { status: res.status, json };
}

function common(overrides = {}) {
  return {
    topic: "Lead Generation B2B",
    audience: "Founder SaaS tahap awal",
    primary_problem: "Sulit mendapatkan lead berkualitas",
    desired_outcome: "Rencana lead generation 30 hari",
    niche: "B2B SaaS Marketing",
    tone: "Praktis, jelas",
    working_title: null,
    author: "E2E Verifier",
    additional_notes: null,
    ...overrides,
  };
}

const payloads = {
  lead_magnet: {
    version: 2,
    ebook_type: "lead_magnet",
    template_id: "tpl_checklist",
    common: common({ topic: "Lead Generation B2B" }),
    business_context: {
      type: "lead_magnet",
      lead_goal: "collect_email",
      traffic_source: "Konten organik",
      next_offer: "Audit marketing gratis",
      post_read_action: "visit_product",
      cta_url: "https://example.com/audit",
    },
  },
  bonus_product: {
    version: 2,
    ebook_type: "bonus_product",
    template_id: "tpl_implementation_guide",
    common: common({
      topic: "Pilih produk TikTok Affiliate",
      desired_outcome: "Shortlist 10 produk dalam 30 menit",
    }),
    business_context: {
      type: "bonus_product",
      parent_product: "Kelas TikTok Affiliate untuk Pemula",
      bonus_role: "implementation_aid",
      usage_moment: "Setelah modul riset produk",
    },
  },
  sellable_ebook: {
    version: 2,
    ebook_type: "sellable_ebook",
    template_id: "tpl_playbook",
    common: common({
      topic: "Framework content engine premium",
      desired_outcome: "Sistem konten 90 hari yang bisa dijual",
    }),
    business_context: {
      type: "sellable_ebook",
      sales_positioning: "premium_authority",
      buyer_objections: [
        "Pembeli merasa informasi serupa tersedia gratis",
        "Pembeli ragu ebook cukup praktis",
      ],
    },
  },
};

async function main() {
  console.log("BASE", BASE);
  console.log("SB", SB_URL);

  // Health
  let health;
  try {
    health = await fetch(`${BASE}/login`);
  } catch (e) {
    fail("server health", String(e));
    process.exit(1);
  }
  assert(health.ok, "server health", String(health.status));

  const admin = createClient(SB_URL, SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const anon = createClient(SB_URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const ts = Date.now();
  const email = `typeaware_${ts}@gmail.com`;
  const password = "TestPass123!";
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: "TypeAware E2E" },
  });
  if (createErr || !created.user) {
    fail("create user", createErr?.message ?? "no user");
    process.exit(1);
  }
  ok("create user", email);
  const userId = created.user.id;

  await new Promise((r) => setTimeout(r, 500));
  const { data: login, error: loginErr } = await anon.auth.signInWithPassword({
    email,
    password,
  });
  if (loginErr || !login.session) {
    fail("sign in", loginErr?.message ?? "no session");
    process.exit(1);
  }
  const token = login.session.access_token;
  ok("sign in");

  // Invalid template rejection
  {
    const bad = structuredClone(payloads.lead_magnet);
    bad.template_id = "tpl_does_not_exist";
    const r = await api("/api/projects", {
      method: "POST",
      token,
      body: bad,
    });
    assert(
      r.status === 400,
      "reject invalid template",
      `status=${r.status}`,
    );
  }

  // Invalid CTA URL rejection
  {
    const bad = structuredClone(payloads.lead_magnet);
    bad.business_context.cta_url = "not-a-url";
    const r = await api("/api/projects", {
      method: "POST",
      token,
      body: bad,
    });
    assert(r.status === 400, "reject invalid CTA URL", `status=${r.status}`);
  }

  // Type/context mismatch
  {
    const bad = structuredClone(payloads.lead_magnet);
    bad.business_context = payloads.bonus_product.business_context;
    const r = await api("/api/projects", {
      method: "POST",
      token,
      body: bad,
    });
    assert(r.status === 400, "reject type/context mismatch", `status=${r.status}`);
  }

  const createdIds = [];

  for (const [type, body] of Object.entries(payloads)) {
    const r = await api("/api/projects", { method: "POST", token, body });
    assert(
      r.status === 201 && r.json?.id,
      `create ${type}`,
      `status=${r.status} title=${r.json?.title ?? ""}`,
    );
    if (!r.json?.id) continue;
    const id = r.json.id;
    createdIds.push(id);

    assert(r.json.ebook_type === type, `${type} ebook_type`, r.json.ebook_type);
    assert(
      typeof r.json.title === "string" && r.json.title.length > 0,
      `${type} title present`,
      r.json.title,
    );

    if (type === "lead_magnet") {
      assert(r.json.cta_goal === "visit_product", "lead cta_goal seeded");
      assert(
        r.json.cta_url === "https://example.com/audit",
        "lead cta_url seeded",
      );
    }

    // Strategy endpoint
    const s = await api(`/api/projects/${id}/strategy`, { token });
    assert(s.status === 200 && s.json?.state, `${type} strategy load`, String(s.status));
    const state = s.json?.state;
    const strategy = state?.strategy ?? {};
    assert(state?.schema_version === 3, `${type} schema v3`, String(state?.schema_version));
    assert(strategy.topic, `${type} topic seeded`, strategy.topic);
    assert(strategy.audience, `${type} audience seeded`, strategy.audience);
    assert(
      strategy.core_promise == null,
      `${type} no fabricated core_promise`,
      String(strategy.core_promise),
    );
    assert(
      strategy.unique_angle == null,
      `${type} no fabricated unique_angle`,
      String(strategy.unique_angle),
    );

    if (type === "lead_magnet") {
      assert(!!strategy.funnel_goal, "lead funnel_goal seeded", strategy.funnel_goal);
      assert(
        strategy.traffic_source === "Konten organik",
        "lead traffic_source seeded",
        strategy.traffic_source,
      );
      assert(
        strategy.product_or_offer === "Audit marketing gratis",
        "lead next_offer mapped",
        strategy.product_or_offer,
      );
    }
    if (type === "bonus_product") {
      assert(
        strategy.product_or_offer === "Kelas TikTok Affiliate untuk Pemula",
        "bonus parent product seeded",
        strategy.product_or_offer,
      );
      assert(
        strategy.bonus_role === "implementation_aid",
        "bonus role seeded",
        strategy.bonus_role,
      );
      assert(
        strategy.usage_moment === "Setelah modul riset produk",
        "bonus usage_moment seeded",
        strategy.usage_moment,
      );
    }
    if (type === "sellable_ebook") {
      assert(
        strategy.sales_positioning === "premium_authority",
        "sellable positioning seeded",
        strategy.sales_positioning,
      );
      assert(
        Array.isArray(strategy.buyer_objections) &&
          strategy.buyer_objections.length === 2,
        "sellable objections seeded",
        JSON.stringify(strategy.buyer_objections),
      );
    }

    // Readiness should be partial (missing promise/angle)
    const score = s.json?.readiness_score ?? 0;
    assert(
      typeof score === "number" && score < 100,
      `${type} readiness partial`,
      String(score),
    );
    assert(
      Array.isArray(state.missing_fields) &&
        state.missing_fields.includes("core_promise"),
      `${type} missing core_promise`,
      JSON.stringify(state.missing_fields),
    );
  }

  // Legacy flat create still works
  {
    const r = await api("/api/projects", {
      method: "POST",
      token,
      body: {
        title: "Legacy Flat Project",
        author: "E2E Verifier",
        description: "Deskripsi legacy flat create untuk kompatibilitas API.",
        audience: "Pemula",
        tone: "Santai",
        niche: "Marketing",
        ebook_type: "lead_magnet",
      },
    });
    assert(
      r.status === 201 && r.json?.id,
      "legacy create still works",
      `status=${r.status}`,
    );
    if (r.json?.id) createdIds.push(r.json.id);
  }

  // Cleanup
  for (const id of createdIds) {
    await admin.from("projects").delete().eq("id", id);
  }
  await admin.auth.admin.deleteUser(userId);
  ok("cleanup", `${createdIds.length} projects + user`);

  const passed = results.filter((r) => r.pass).length;
  const failed = results.filter((r) => !r.pass).length;
  console.log("\n=== SUMMARY ===");
  console.log(`passed=${passed} failed=${failed} total=${results.length}`);

  mkdirSync("docs/e2e-evidence", { recursive: true });
  const report = {
    at: new Date().toISOString(),
    base: BASE,
    passed,
    failed,
    results,
  };
  writeFileSync(
    "docs/e2e-evidence/2026-07-20-type-aware-create.json",
    JSON.stringify(report, null, 2),
  );
  writeFileSync(
    "docs/e2e-evidence/2026-07-20-type-aware-create.md",
    [
      "# Type-aware project creation — live API evidence",
      "",
      `- When: ${report.at}`,
      `- Base: ${BASE}`,
      `- Result: **${passed} passed / ${failed} failed** (${results.length} checks)`,
      "",
      "## Checks",
      "",
      ...results.map(
        (r) => `- ${r.pass ? "PASS" : "FAIL"} \`${r.n}\`${r.d ? ` — ${r.d}` : ""}`,
      ),
      "",
      "## Coverage",
      "",
      "- Lead Magnet V2 create + Strategy V3 seed",
      "- Bonus Pembelian V2 create + parent/role/usage seed",
      "- Ebook Berbayar V2 create + positioning/objections seed",
      "- Invalid template / CTA URL / type mismatch rejected",
      "- Legacy flat create still accepted",
      "- No fabricated core_promise / unique_angle",
      "",
    ].join("\n"),
  );

  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
