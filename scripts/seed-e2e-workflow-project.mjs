/**
 * Seed the E2E project with strategy + approved outline + written sections + CTA.
 * Requires .env.local (service role) and .env.e2e.local (E2E_PROJECT_ID, E2E_USER_ID).
 *
 * Usage: node scripts/seed-e2e-workflow-project.mjs
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

function loadEnv(file) {
  if (!fs.existsSync(file)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(file, "utf8")
      .split(/\r?\n/)
      .filter((l) => l && !l.startsWith("#") && l.includes("="))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
      }),
  );
}

const env = { ...loadEnv(".env.local"), ...loadEnv(".env.e2e.local") };
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const service = env.SUPABASE_SERVICE_ROLE_KEY;
const projectId = env.E2E_PROJECT_ID;
const userId = env.E2E_USER_ID;

if (!url || !service || !projectId) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or E2E_PROJECT_ID");
  process.exit(1);
}

const admin = createClient(url, service, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const outlineSections = [
  {
    id: "sec_intro",
    position: 1,
    title: "Introduction",
    summary: "Why this ebook matters",
    key_points: ["Promise", "Who it's for", "How to use"],
    estimated_words: 600,
    status: "pending",
  },
  {
    id: "sec_core",
    position: 2,
    title: "Core Framework",
    summary: "The main system",
    key_points: ["Step map", "Common mistakes", "Quick win"],
    estimated_words: 800,
    status: "pending",
  },
  {
    id: "sec_apply",
    position: 3,
    title: "Apply This Week",
    summary: "Action plan",
    key_points: ["Checklist", "Metrics", "Next steps"],
    estimated_words: 700,
    status: "pending",
  },
  {
    id: "sec_close",
    position: 4,
    title: "Closing & CTA",
    summary: "Wrap up and invite",
    key_points: ["Recap", "Offer", "CTA"],
    estimated_words: 500,
    status: "pending",
  },
  {
    id: "sec_bonus",
    position: 5,
    title: "Bonus Resources",
    summary: "Extras",
    key_points: ["Templates", "Links", "Community"],
    estimated_words: 400,
    status: "pending",
  },
];

const strategyState = {
  schema_version: 2,
  strategy: {
    topic: "Affiliate systems for freelancers",
    audience: "Beginner freelancers",
    audience_sophistication: "beginner",
    primary_problem: "No repeatable lead system",
    pain_points: ["Inconsistent income", "No funnel"],
    desired_outcome: "A simple affiliate funnel that books calls",
    core_promise: "Build your first affiliate system in 7 days",
    unique_angle: "Freelance-first, no ad budget required",
    content_pillars: ["Offer", "Traffic", "Conversion"],
    product_or_offer: "Free checklist + WhatsApp community",
    funnel_goal: "join_whatsapp",
    cta_goal: "join_whatsapp",
    tone: "practical",
  },
  missing_fields: [],
  next_action: "create_outline",
  conversation_summary: "User wants a practical affiliate ebook for freelancers.",
  updated_at: new Date().toISOString(),
};

function sectionHtml(title) {
  return `<h2>${title}</h2><p>This is seeded E2E content for <strong>${title}</strong>. It includes enough words for workflow completeness checks without calling the AI writer.</p><ul><li>Point one</li><li>Point two</li><li>Point three</li></ul><p>Continue with practical steps so the section is non-empty and publishable.</p>`;
}

const projectPatchBase = {
  title: "E2E Workflow Project",
  subtitle: "From idea to published ebook",
  author: "E2E Author",
  description: "Seeded multi-stage project for Playwright journey",
  audience: "Beginner freelancers",
  tone: "practical",
  niche: "affiliate marketing",
  ebook_type: "lead_magnet",
  status: "generated",
  total_sections: outlineSections.length,
  sections_generated: outlineSections.length,
  progress: 100,
  updated_at: new Date().toISOString(),
};

const projectPatchWithCta = {
  ...projectPatchBase,
  cta_goal: "join_whatsapp",
  final_cta: "Join the free WhatsApp group for weekly tactics",
  cta_url: "https://example.com/whatsapp",
};

let projErr = (await admin.from("projects").update(projectPatchWithCta).eq("id", projectId)).error;
if (projErr && /cta_/i.test(projErr.message)) {
  console.warn("CTA columns missing on remote DB; seeding without CTA fields");
  projErr = (await admin.from("projects").update(projectPatchBase).eq("id", projectId)).error;
}
if (projErr) {
  console.error("PROJECT_UPDATE_FAIL", projErr.message);
  process.exit(2);
}

const { error: stateErr } = await admin.from("project_states").upsert(
  {
    project_id: projectId,
    state_json: strategyState,
    readiness_score: 85,
    updated_at: new Date().toISOString(),
  },
  { onConflict: "project_id" },
);
if (stateErr) {
  console.error("STATE_UPSERT_FAIL", stateErr.message);
  process.exit(3);
}

// Replace outline
await admin.from("outlines").delete().eq("project_id", projectId);
const { data: outline, error: outErr } = await admin
  .from("outlines")
  .insert({
    project_id: projectId,
    title: "Affiliate Systems Playbook",
    description: "Flat outline seeded for e2e",
    sections: outlineSections,
    approved: true,
    approved_at: new Date().toISOString(),
  })
  .select("id")
  .single();
if (outErr) {
  console.error("OUTLINE_INSERT_FAIL", outErr.message);
  process.exit(4);
}

// Replace sections
await admin.from("ebook_sections").delete().eq("project_id", projectId);
const sectionRows = outlineSections.map((s) => {
  const html = sectionHtml(s.title);
  const word_count = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return {
    project_id: projectId,
    outline_section_id: s.id,
    position: s.position,
    title: s.title,
    content_html: html,
    word_count,
    status: "generated",
  };
});
const { error: secErr } = await admin.from("ebook_sections").insert(sectionRows);
if (secErr) {
  console.error("SECTIONS_INSERT_FAIL", secErr.message);
  process.exit(5);
}

// Optional message history for strategy chat panel
if (userId) {
  await admin.from("messages").delete().eq("project_id", projectId);
  await admin.from("messages").insert([
    {
      project_id: projectId,
      user_id: userId,
      role: "user",
      content: "I want an ebook for freelancers about affiliate systems.",
      agent: null,
    },
    {
      project_id: projectId,
      user_id: null,
      role: "assistant",
      content:
        "Great. I captured audience, promise, and angle. You can create an outline when ready.",
      agent: "strategist",
    },
  ]);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      projectId,
      outlineId: outline.id,
      sections: sectionRows.length,
      readiness_score: 85,
      cta_goal: "join_whatsapp",
    },
    null,
    2,
  ),
);
