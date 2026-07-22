import type { SectionRevisionSource } from "@/types/section-revision";

export type SectionSnapshot = {
  id: string;
  project_id: string;
  title: string;
  content_html: string;
  word_count: number;
};

export function sectionHasReplaceableContent(
  section: { content_html?: string | null; status?: string | null } | null | undefined,
): boolean {
  if (!section) return false;
  const html = (section.content_html ?? "").trim();
  if (!html) return false;
  const plain = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return plain.length > 0;
}

export function buildRevisionInsert(opts: {
  section: SectionSnapshot;
  source: SectionRevisionSource;
}) {
  return {
    section_id: opts.section.id,
    project_id: opts.section.project_id,
    title: opts.section.title,
    content_html: opts.section.content_html,
    word_count: opts.section.word_count,
    source: opts.source,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SupabaseLike = any;

export async function createSectionRevision(
  supabase: SupabaseLike,
  opts: {
    section: SectionSnapshot;
    source: SectionRevisionSource;
  },
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!sectionHasReplaceableContent(opts.section)) {
    return { ok: true };
  }
  const { error } = await supabase
    .from("ebook_section_revisions")
    .insert(buildRevisionInsert(opts));
  if (error) {
    return { ok: false, error: error.message ?? "revision insert failed" };
  }
  return { ok: true };
}
