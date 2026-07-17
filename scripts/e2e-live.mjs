import { createClient } from "@supabase/supabase-js";

const BASE = process.env.BASE_URL || "http://127.0.0.1:3005";
const SB_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "http://127.0.0.1:54321";
const ANON =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const SERVICE =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU";

const results = [];
const ok = (n, d = "") => { results.push({ n, pass: true, d }); console.log("PASS", n, d); };
const fail = (n, d = "") => { results.push({ n, pass: false, d }); console.error("FAIL", n, d); };
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
  let json; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

async function main() {
  console.log("BASE", BASE);

  let r = await api("/api/billing/plans");
  assert(r.status === 200 && Array.isArray(r.json), "plans public", String(r.status));
  r = await api("/api/auth/me");
  assert(r.status === 401, "me unauth", String(r.status));

  const sbA = createClient(SB_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const emailA = `creator_${Date.now()}@e2e.local`;
  const pass = "TestPass123!";
  const { data: signA, error: eA } = await sbA.auth.signUp({ email: emailA, password: pass, options: { data: { name: "Creator A" } } });
  assert(!eA && signA.session?.access_token, "signup A", eA?.message || emailA);
  const tokenA = signA.session.access_token;
  const userA = signA.user.id;

  const admin = createClient(SB_URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: bal0 } = await admin.from("credit_balances").select("balance").eq("user_id", userA).single();
  assert(bal0?.balance === 50, "free grant 50", `bal=${bal0?.balance}`);

  r = await api("/api/auth/me", { token: tokenA });
  assert(r.status === 200 && r.json?.user?.id === userA, "me auth bearer", `status=${r.status}`);

  r = await api("/api/projects", {
    method: "POST",
    token: tokenA,
    body: {
      title: "E2E Content Engine",
      author: "Creator A",
      description: "Panduan content engine B2B untuk tes E2E live API.",
      audience: "Founder B2B",
      tone: "Taktis",
      niche: "Marketing",
    },
  });
  assert((r.status === 200 || r.status === 201) && r.json?.id, "create project", `status=${r.status}`);
  const projectId = r.json.id;

  r = await api(`/api/projects/${projectId}/chat`, { method: "POST", token: tokenA, body: { content: "Susun pillar topik." } });
  assert(r.status === 200 && r.json?.role === "assistant", "chat 1", `status=${r.status}`);
  r = await api(`/api/projects/${projectId}/chat`, { method: "POST", token: tokenA, body: { content: "Lanjut outline." } });
  assert(r.status === 200, "chat 2", `status=${r.status}`);

  r = await api(`/api/projects/${projectId}/outline/generate`, { method: "POST", token: tokenA, body: {} });
  assert(r.status === 200 && r.json?.sections?.length >= 5, "outline generate", `status=${r.status} n=${r.json?.sections?.length}`);
  const outline = r.json;
  const { data: bal1 } = await admin.from("credit_balances").select("balance").eq("user_id", userA).single();
  assert(bal1.balance === 45, "balance after outline 45", `bal=${bal1.balance}`);

  r = await api(`/api/projects/${projectId}/outline/approve`, { method: "POST", token: tokenA });
  assert(r.status === 200 && r.json?.approved === true, "outline approve", `status=${r.status}`);

  // 4 sections x 10 = 40 → balance 5
  for (const s of outline.sections.slice(0, 4)) {
    r = await api(`/api/projects/${projectId}/sections/generate`, {
      method: "POST",
      token: tokenA,
      body: { outline_section_id: s.id },
    });
    assert(r.status === 200 && r.json?.content_html, `section ${s.position}`, `status=${r.status}`);
  }
  const { data: bal2 } = await admin.from("credit_balances").select("balance").eq("user_id", userA).single();
  assert(bal2.balance === 5, "balance after 4 sections 5", `bal=${bal2.balance}`);

  // 5th should fail insufficient
  if (outline.sections[4]) {
    r = await api(`/api/projects/${projectId}/sections/generate`, {
      method: "POST",
      token: tokenA,
      body: { outline_section_id: outline.sections[4].id },
    });
    assert(r.status === 402 || r.json?.error?.code === "insufficient_credits", "insufficient credits", `status=${r.status}`);
  }

  r = await api("/api/billing/purchase-pack", { method: "POST", token: tokenA, body: { pack_id: "pack_100" } });
  assert(r.status === 200 && (r.json?.balance?.balance ?? r.json?.balance) >= 100, "topup pack", `status=${r.status}`);

  if (outline.sections[4]) {
    r = await api(`/api/projects/${projectId}/sections/generate`, {
      method: "POST",
      token: tokenA,
      body: { outline_section_id: outline.sections[4].id },
    });
    assert(r.status === 200, "section 5 after topup", `status=${r.status}`);
  }

  r = await api(`/api/projects/${projectId}/publish`, { method: "POST", token: tokenA, body: { is_public: true } });
  assert(r.status === 200 && r.json?.slug, "publish", `status=${r.status} slug=${r.json?.slug}`);
  const published = r.json;

  r = await api(`/api/published/${published.id}/claim-links`, {
    method: "POST",
    token: tokenA,
    body: { label: "E2E", max_uses: 10 },
  });
  assert(r.status === 200 && r.json?.token, "claim link", `status=${r.status}`);
  const claim = r.json;

  const sbB = createClient(SB_URL, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const emailB = `reader_${Date.now()}@e2e.local`;
  const { data: signB, error: eB } = await sbB.auth.signUp({ email: emailB, password: pass, options: { data: { name: "Reader B" } } });
  assert(!eB && signB.session?.access_token, "signup B", eB?.message || emailB);
  const tokenB = signB.session.access_token;

  r = await api(`/api/claim/${claim.token}`, { method: "POST", token: tokenB });
  assert(r.status === 200 && (r.json?.status === "claimed" || r.json?.status === "already_owned"), "claim", `status=${r.status} ${r.json?.status}`);

  r = await api("/api/library", { token: tokenB });
  assert(r.status === 200 && Array.isArray(r.json) && r.json.length >= 1, "library", `n=${r.json?.length}`);

  r = await api(`/api/published/by-slug/${published.slug}`, { token: tokenB });
  assert(r.status === 200, "read by slug", `status=${r.status}`);

  r = await api("/api/reading-progress", {
    method: "PATCH",
    token: tokenB,
    body: { ebook_id: published.id, progress: 40, current_section: 2 },
  });
  assert(r.status === 200 && r.json?.progress === 40, "reading progress", `status=${r.status}`);

  r = await api(`/api/projects/${projectId}`, { token: tokenB });
  assert(r.status === 404 || r.status === 403, "B cannot access A project", `status=${r.status}`);

  const passed = results.filter((x) => x.pass).length;
  const failed = results.filter((x) => !x.pass).length;
  console.log(`\nSUMMARY passed=${passed} failed=${failed} total=${results.length}`);
  if (failed) {
    for (const x of results.filter((i) => !i.pass)) console.log("FAIL", x.n, x.d);
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
