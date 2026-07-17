// Mock API client — wraps the in-memory db with async calls mimicking the REST surface.

import { getDb, newId, newToken, slugify } from "./db";
import {
  AGENT_LABELS,
  plannerOutline,
  strategistReply,
  titleVariants,
  ctaVariants,
  writerSection,
} from "./ai";

import type {
  ChatMessage,
  ClaimCreateInput,
  ClaimEvent,
  ClaimLink,
  CreditBalance,
  CreditPack,
  CreditTransaction,
  Entitlement,
  ExportCreateInput,
  ExportJob,
  Outline,
  OutlineGenerateInput,
  OutlineUpdateInput,
  BillingPlan,
  PlanId,
  Project,
  ProjectInput,
  ProjectUpdate,
  PublishedEbook,
  ReadingProgress,
  Section,
  SectionUpdateInput,
  Subscription,
  Template,
} from "@/types";
import type { SendMessageInput } from "@/types/message";
import { CREDIT_COSTS } from "./seed";

/** Simulated network delay. */
function delay<T>(value: T): Promise<T> {
  const ms = 180 + Math.floor(Math.random() * 480);
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

function fail<T>(message: string, code?: string): Promise<T> {
  return Promise.reject({ error: { message, code } });
}

function nowIso(): string {
  return new Date().toISOString();
}

// ============ PROJECTS ============

export async function listProjects(): Promise<Project[]> {
  const db = getDb();
  return delay(structuredClone(db.projects));
}

export async function getProject(id: string): Promise<Project> {
  const db = getDb();
  const p = db.projects.find((x) => x.id === id);
  if (!p) return fail("Project not found", "not_found");
  return delay(structuredClone(p));
}

export async function createProject(input: ProjectInput): Promise<Project> {
  const db = getDb();
  const id = newId("prj");
  const project: Project = {
    id,
    owner_id: "usr_demo",
    title: input.title,
    author: input.author,
    subtitle: input.subtitle ?? null,
    description: input.description,
    audience: input.audience,
    tone: input.tone,
    niche: input.niche,
    status: "draft",
    progress: 0,
    sections_generated: 0,
    total_sections: 0,
    template_id: input.template_id ?? null,
    cover_color: "#0A0A0A",
    created_at: nowIso(),
    updated_at: nowIso(),
    published_at: null,
  };
  db.projects.unshift(project);
  return delay(structuredClone(project));
}

export async function updateProject(
  id: string,
  patch: ProjectUpdate
): Promise<Project> {
  const db = getDb();
  const p = db.projects.find((x) => x.id === id);
  if (!p) return fail("Project not found", "not_found");
  Object.assign(p, patch, { updated_at: nowIso() });
  return delay(structuredClone(p));
}

export async function deleteProject(id: string): Promise<{ ok: true }> {
  const db = getDb();
  db.projects = db.projects.filter((p) => p.id !== id);
  db.outlines = db.outlines.filter((o) => o.project_id !== id);
  db.sections = db.sections.filter((s) => s.project_id !== id);
  db.messages = db.messages.filter((m) => m.project_id !== id);
  return delay({ ok: true } as const);
}

// ============ OUTLINE ============

export async function getOutline(project_id: string): Promise<Outline | null> {
  const db = getDb();
  const o = db.outlines.find((x) => x.project_id === project_id) ?? null;
  return delay(o ? structuredClone(o) : null);
}

export async function generateOutline(
  project_id: string,
  _input: OutlineGenerateInput = {}
): Promise<Outline> {
  const db = getDb();
  const project = db.projects.find((p) => p.id === project_id);
  if (!project) return fail("Project not found", "not_found");

  const existing = db.outlines.find((o) => o.project_id === project_id);
  if (existing) {
    return fail("Outline already exists. Edit it instead.", "conflict");
  }
  chargeGeneration("outline", project_id);
  const outline = plannerOutline(project);
  db.outlines.push(outline);
  project.status = "outline_draft";
  project.total_sections = outline.sections.length;
  project.updated_at = nowIso();
  return delay(structuredClone(outline));
}

export async function updateOutline(
  project_id: string,
  patch: OutlineUpdateInput
): Promise<Outline> {
  const db = getDb();
  const o = db.outlines.find((x) => x.project_id === project_id);
  if (!o) return fail("Outline not found", "not_found");
  Object.assign(o, patch, { updated_at: nowIso() });
  const project = db.projects.find((p) => p.id === project_id);
  if (project) {
    project.total_sections = o.sections.length;
    project.updated_at = nowIso();
  }
  return delay(structuredClone(o));
}

export async function approveOutline(project_id: string): Promise<Outline> {
  const db = getDb();
  const o = db.outlines.find((x) => x.project_id === project_id);
  if (!o) return fail("Outline not found", "not_found");
  o.approved = true;
  o.approved_at = nowIso();
  o.updated_at = nowIso();
  const project = db.projects.find((p) => p.id === project_id);
  if (project) {
    project.status = "approved";
    project.updated_at = nowIso();
  }
  return delay(structuredClone(o));
}

// ============ SECTION GENERATION ============

export async function listSections(project_id: string): Promise<Section[]> {
  const db = getDb();
  const list = db.sections
    .filter((s) => s.project_id === project_id)
    .sort((a, b) => a.position - b.position);
  return delay(list.map((s) => structuredClone(s)));
}

export async function getSection(id: string): Promise<Section> {
  const db = getDb();
  const s = db.sections.find((x) => x.id === id);
  if (!s) return fail("Section not found", "not_found");
  return delay(structuredClone(s));
}

export async function generateSection(
  project_id: string,
  outline_section_id: string
): Promise<Section> {
  const db = getDb();
  const project = db.projects.find((p) => p.id === project_id);
  if (!project) return fail("Project not found", "not_found");
  const outline = db.outlines.find((o) => o.project_id === project_id);
  if (!outline) return fail("Outline not found", "not_found");
  const outlineSection = outline.sections.find(
    (s) => s.id === outline_section_id
  );
  if (!outlineSection) return fail("Outline section not found", "not_found");

  chargeGeneration("section", project_id);
  project.status = "generating";
  project.updated_at = nowIso();
  outlineSection.status = "generating";

  // simulate generation time
  await new Promise((r) => setTimeout(r, 900 + Math.random() * 700));

  const body = writerSection(outlineSection, project);
  const section: Section = {
    id: newId("sec"),
    project_id,
    outline_section_id,
    position: outlineSection.position,
    title: outlineSection.title,
    content_html: body.content_html,
    word_count: body.word_count,
    status: "generated",
    updated_at: nowIso(),
  };
  const existing = db.sections.findIndex(
    (s) =>
      s.project_id === project_id && s.outline_section_id === outline_section_id
  );
  if (existing >= 0) {
    db.sections[existing] = section;
  } else {
    db.sections.push(section);
  }
  outlineSection.status = "generated";

  project.sections_generated = db.sections.filter(
    (s) => s.project_id === project_id
  ).length;
  project.progress = Math.round(
    (project.sections_generated / project.total_sections) * 100
  );
  project.updated_at = nowIso();
  if (project.sections_generated === project.total_sections) {
    project.status = "generated";
  }
  return delay(structuredClone(section));
}

export async function generateAllSections(
  project_id: string
): Promise<Section[]> {
  const db = getDb();
  const outline = db.outlines.find((o) => o.project_id === project_id);
  if (!outline) return fail("Outline not found", "not_found");
  const results: Section[] = [];
  for (const os of outline.sections) {
    const s = await generateSection(project_id, os.id);
    results.push(s);
  }
  return delay(results);
}

export async function updateSection(
  id: string,
  patch: SectionUpdateInput
): Promise<Section> {
  const db = getDb();
  const s = db.sections.find((x) => x.id === id);
  if (!s) return fail("Section not found", "not_found");
  if (patch.title) s.title = patch.title;
  if (patch.content_html) {
    s.content_html = patch.content_html;
    s.word_count = patch.content_html.split(/\s+/).length;
  }
  s.status = "edited";
  s.updated_at = nowIso();
  return delay(structuredClone(s));
}

// ============ MESSAGES / CHAT ============

export async function listMessages(project_id: string): Promise<ChatMessage[]> {
  const db = getDb();
  const list = db.messages.filter((m) => m.project_id === project_id);
  return delay(list.map((m) => structuredClone(m)));
}

export async function sendMessage(input: SendMessageInput): Promise<ChatMessage> {
  const db = getDb();
  const userMsg: ChatMessage = {
    id: newId("msg"),
    project_id: input.project_id,
    role: "user",
    content: input.content,
    agent: null,
    created_at: nowIso(),
  };
  db.messages.push(userMsg);

  const project = db.projects.find((p) => p.id === input.project_id);
  const agent = input.agent ?? "strategist";
  const reply = strategistReply({
    title: project?.title ?? "Project",
    description: project?.description ?? "",
  });

  const aiMsg: ChatMessage = {
    id: newId("msg"),
    project_id: input.project_id,
    role: "assistant",
    agent,
    content: reply,
    created_at: nowIso(),
  };
  db.messages.push(aiMsg);
  return delay(structuredClone(aiMsg));
}

// ============ PUBLISH ============

export async function listPublishedEbooks(): Promise<PublishedEbook[]> {
  const db = getDb();
  return delay(db.published.map((p) => structuredClone(p)));
}

export async function getPublishedEbook(
  id: string
): Promise<PublishedEbook> {
  const db = getDb();
  const p = db.published.find((x) => x.id === id);
  if (!p) return fail("Published ebook not found", "not_found");
  return delay(structuredClone(p));
}

export async function getPublishedBySlug(
  slug: string
): Promise<PublishedEbook> {
  const db = getDb();
  const p = db.published.find((x) => x.slug === slug);
  if (!p) return fail("Ebook not found", "not_found");
  return delay(structuredClone(p));
}

export async function publishEbook(input: {
  project_id: string;
  is_public?: boolean;
}): Promise<PublishedEbook> {
  const db = getDb();
  const project = db.projects.find((p) => p.id === input.project_id);
  if (!project) return fail("Project not found", "not_found");
  const sections = db.sections
    .filter((s) => s.project_id === input.project_id)
    .sort((a, b) => a.position - b.position);
  if (sections.length === 0) return fail("No sections to publish", "empty");

  project.status = "publishing";
  project.updated_at = nowIso();
  await new Promise((r) => setTimeout(r, 500));

  const ebook: PublishedEbook = {
    id: newId("pub"),
    project_id: project.id,
    slug: slugify(project.title) + "-" + Math.random().toString(36).slice(2, 6),
    title: project.title,
    author: project.author,
    subtitle: project.subtitle,
    cover_color: project.cover_color,
    sections: sections.map((s) => ({
      id: s.id,
      position: s.position,
      title: s.title,
      content_html: s.content_html,
    })),
    published_at: nowIso(),
    total_readers: 0,
    active_claims: 0,
    is_public: input.is_public ?? true,
  };
  // unlink earlier publications from same project
  db.published = db.published.filter((p) => p.project_id !== project.id);
  db.published.unshift(ebook);

  project.status = "published";
  project.published_at = nowIso();
  project.updated_at = nowIso();
  return delay(structuredClone(ebook));
}

// ============ CLAIM LINKS ============

export async function listClaimLinks(ebook_id: string): Promise<ClaimLink[]> {
  const db = getDb();
  const links = db.claimLinks.filter((l) => l.ebook_id === ebook_id);
  return delay(links.map((l) => structuredClone(l)));
}

export async function createClaimLink(
  input: ClaimCreateInput
): Promise<ClaimLink> {
  const db = getDb();
  const link: ClaimLink = {
    id: newId("clnk"),
    ebook_id: input.ebook_id,
    token: newToken(),
    label: input.label,
    status: "active",
    max_uses: input.max_uses ?? null,
    used_count: 0,
    created_at: nowIso(),
    expires_at:
      input.expires_in_days != null
        ? new Date(
            Date.now() + input.expires_in_days * 86400_000
          ).toISOString()
        : null,
    revoked_at: null,
  };
  db.claimLinks.unshift(link);
  return delay(structuredClone(link));
}

export async function revokeClaimLink(id: string): Promise<ClaimLink> {
  const db = getDb();
  const l = db.claimLinks.find((x) => x.id === id);
  if (!l) return fail("Claim link not found", "not_found");
  l.status = "revoked";
  l.revoked_at = nowIso();
  return delay(structuredClone(l));
}

export async function deleteClaimLink(id: string): Promise<{ ok: true }> {
  const db = getDb();
  db.claimLinks = db.claimLinks.filter((l) => l.id !== id);
  db.claimEvents = db.claimEvents.filter((e) => e.claim_link_id !== id);
  return delay({ ok: true } as const);
}

export async function listClaimEvents(
  claim_link_id: string
): Promise<ClaimEvent[]> {
  const db = getDb();
  const events = db.claimEvents
    .filter((e) => e.claim_link_id === claim_link_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return delay(events.map((e) => structuredClone(e)));
}

// ============ CLAIM FLOW (public reader) ============

export async function resolveClaim(
  token: string,
  reader_id: string
): Promise<
  | { status: "claimed"; ebook: PublishedEbook; entitlement: Entitlement }
  | { status: "already_owned"; ebook: PublishedEbook }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "limit_reached" }
  | { status: "not_found" }
> {
  const db = getDb();
  const link = db.claimLinks.find((l) => l.token === token.toUpperCase());
  if (!link) return delay({ status: "not_found" });
  if (link.status === "revoked") return delay({ status: "revoked" });
  if (link.status === "expired") return delay({ status: "expired" });
  if (
    link.expires_at &&
    new Date(link.expires_at).getTime() < Date.now()
  ) {
    link.status = "expired";
    return delay({ status: "expired" });
  }
  if (link.max_uses != null && link.used_count >= link.max_uses) {
    return delay({ status: "limit_reached" });
  }
  const ebook = db.published.find((e) => e.id === link.ebook_id);
  if (!ebook) return delay({ status: "not_found" });

  const existing = db.entitlements.find(
    (e) => e.ebook_id === ebook.id && e.reader_id === reader_id
  );
  if (existing) {
    db.claimEvents.push({
      id: newId("ev"),
      claim_link_id: link.id,
      reader_email: reader_id,
      status: "already_owned",
      created_at: nowIso(),
    });
    return delay({ status: "already_owned", ebook });
  }

  const ent: Entitlement = {
    id: newId("ent"),
    reader_id,
    ebook_id: ebook.id,
    ebook_title: ebook.title,
    ebook_slug: ebook.slug,
    cover_color: ebook.cover_color,
    author: ebook.author,
    claim_link_id: link.id,
    created_at: nowIso(),
  };
  db.entitlements.push(ent);
  link.used_count += 1;
  db.claimEvents.push({
    id: newId("ev"),
    claim_link_id: link.id,
    reader_email: reader_id,
    status: "claimed",
    created_at: nowIso(),
  });
  ebook.total_readers += 1;
  return delay({ status: "claimed", ebook, entitlement: ent });
}

// ============ READER LIBRARY ============

export async function listLibrary(reader_id: string): Promise<Entitlement[]> {
  const db = getDb();
  const list = db.entitlements.filter((e) => e.reader_id === reader_id);
  return delay(list.map((e) => structuredClone(e)));
}

export async function listReadingProgress(
  reader_id: string
): Promise<ReadingProgress[]> {
  const db = getDb();
  const list = db.readingProgress.filter((r) => r.reader_id === reader_id);
  return delay(list.map((r) => structuredClone(r)));
}

export async function updateReadingProgress(
  reader_id: string,
  ebook_id: string,
  patch: { progress?: number; current_section?: number }
): Promise<ReadingProgress> {
  const db = getDb();
  let rp = db.readingProgress.find(
    (r) => r.reader_id === reader_id && r.ebook_id === ebook_id
  );
  if (!rp) {
    const ebook = db.published.find((e) => e.id === ebook_id);
    if (!ebook) return fail("Ebook not found", "not_found");
    rp = {
      id: newId("rp"),
      reader_id,
      ebook_id,
      ebook_title: ebook.title,
      cover_color: ebook.cover_color,
      author: ebook.author,
      progress: 0,
      current_section: 1,
      total_sections: ebook.sections.length,
      last_read_at: nowIso(),
    };
    db.readingProgress.push(rp);
  }
  if (patch.progress != null) rp.progress = patch.progress;
  if (patch.current_section != null) rp.current_section = patch.current_section;
  rp.last_read_at = nowIso();
  return delay(structuredClone(rp));
}

// ============ EXPORTS ============

export async function listExports(ebook_id: string): Promise<ExportJob[]> {
  const db = getDb();
  const list = db.exports.filter((e) => e.ebook_id === ebook_id);
  return delay(list.map((e) => structuredClone(e)));
}

export async function createExport(input: ExportCreateInput): Promise<ExportJob> {
  const db = getDb();
  const ebook = db.published.find((e) => e.id === input.ebook_id);
  if (!ebook) return fail("Ebook not found", "not_found");
  const job: ExportJob = {
    id: newId("xp"),
    ebook_id: ebook.id,
    ebook_title: ebook.title,
    format: input.format,
    status: "processing",
    url: null,
    created_at: nowIso(),
    completed_at: null,
    error: null,
  };
  db.exports.unshift(job);
  // simulate completion
  setTimeout(() => {
    job.status = "complete";
    job.url = `#/download/${ebook.slug}.${job.format}`;
    job.completed_at = nowIso();
  }, 1200);
  return delay(structuredClone(job));
}

// ============ BILLING / CREDITS ============

function spendCredits(
  amount: number,
  label: string,
  meta?: CreditTransaction["meta"]
): CreditBalance {
  const db = getDb();
  if (amount > 0 && db.creditBalance.balance < amount) {
    const err = {
      error: {
        message: "Kredit tidak cukup. Upgrade plan atau beli top-up.",
        code: "insufficient_credits",
      },
    };
    throw err;
  }
  if (amount > 0) {
    db.creditBalance.balance -= amount;
    db.creditBalance.lifetime_spent += amount;
    db.creditBalance.updated_at = nowIso();
    db.creditTxns.unshift({
      id: newId("ctx"),
      user_id: db.creditBalance.user_id,
      type: "spend",
      amount: -amount,
      balance_after: db.creditBalance.balance,
      label,
      meta,
      created_at: nowIso(),
    });
  }
  return structuredClone(db.creditBalance);
}

export async function getCreditBalance(): Promise<CreditBalance> {
  const db = getDb();
  return delay(structuredClone(db.creditBalance));
}

export async function listCreditTransactions(): Promise<CreditTransaction[]> {
  const db = getDb();
  return delay(db.creditTxns.map((t) => structuredClone(t)));
}

export async function listPlans(): Promise<BillingPlan[]> {
  const db = getDb();
  return delay(db.plans.map((p) => structuredClone(p)));
}

export async function listCreditPacks(): Promise<CreditPack[]> {
  const db = getDb();
  return delay(db.creditPacks.map((p) => structuredClone(p)));
}

export async function getSubscription(): Promise<Subscription> {
  const db = getDb();
  return delay(structuredClone(db.subscription));
}

export async function changePlan(plan_id: PlanId): Promise<{
  subscription: Subscription;
  balance: CreditBalance;
}> {
  const db = getDb();
  const plan = db.plans.find((p) => p.id === plan_id);
  if (!plan) return fail("Plan not found", "not_found");

  db.subscription.plan_id = plan_id;
  db.subscription.status = "active";
  db.subscription.renews_at = new Date(
    Date.now() + 30 * 86400_000
  ).toISOString();
  db.subscription.canceled_at = null;

  db.creditBalance.plan_id = plan_id;
  db.creditBalance.period_grant = plan.monthly_credits;
  db.creditBalance.balance = plan.monthly_credits;
  db.creditBalance.period_start = nowIso();
  db.creditBalance.period_end = db.subscription.renews_at;
  db.creditBalance.updated_at = nowIso();

  const profile = db.profiles.find((p) => p.id === db.creditBalance.user_id);
  if (profile) profile.plan = plan_id;

  db.creditTxns.unshift({
    id: newId("ctx"),
    user_id: db.creditBalance.user_id,
    type: "grant",
    amount: plan.monthly_credits,
    balance_after: db.creditBalance.balance,
    label: `${plan.name} plan — kredit bulanan`,
    created_at: nowIso(),
  });

  return delay({
    subscription: structuredClone(db.subscription),
    balance: structuredClone(db.creditBalance),
  });
}

export async function purchaseCreditPack(pack_id: string): Promise<{
  balance: CreditBalance;
  txn: CreditTransaction;
}> {
  const db = getDb();
  const pack = db.creditPacks.find((p) => p.id === pack_id);
  if (!pack) return fail("Pack not found", "not_found");

  db.creditBalance.balance += pack.credits;
  db.creditBalance.updated_at = nowIso();
  const txn: CreditTransaction = {
    id: newId("ctx"),
    user_id: db.creditBalance.user_id,
    type: "purchase",
    amount: pack.credits,
    balance_after: db.creditBalance.balance,
    label: `Top-up ${pack.name}`,
    meta: { pack_id: pack.id },
    created_at: nowIso(),
  };
  db.creditTxns.unshift(txn);
  return delay({
    balance: structuredClone(db.creditBalance),
    txn: structuredClone(txn),
  });
}

export async function getCreditCosts(): Promise<typeof CREDIT_COSTS> {
  return delay({ ...CREDIT_COSTS });
}

export function chargeGeneration(
  kind: keyof typeof CREDIT_COSTS,
  project_id?: string
): void {
  const cost = CREDIT_COSTS[kind];
  if (cost <= 0) return;
  spendCredits(cost, `Generate ${kind}`, project_id ? { project_id } : undefined);
}

// ============ TEMPLATES ============
// ============ TEMPLATES ============

export async function listTemplates(): Promise<Template[]> {
  const db = getDb();
  return delay(db.templates.map((t) => structuredClone(t)));
}

// ============ Title & CTA Generators (agents) ============

export async function generateTitles(project_id: string): Promise<string[]> {
  const db = getDb();
  const project = db.projects.find((p) => p.id === project_id);
  if (!project) return fail("Project not found", "not_found");
  chargeGeneration("title", project_id);
  return delay(titleVariants(project.title));
}

export async function generateCtas(project_id: string): Promise<string[]> {
  chargeGeneration("cta", project_id);
  return delay(ctaVariants());
}

export { AGENT_LABELS };
