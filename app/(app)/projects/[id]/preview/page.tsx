import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Reader } from "@/components/reader/Reader";
import { Button } from "@/components/ui/Button";
import { buildProjectPreviewDocument } from "@/lib/reader/build-project-preview-document";
import type { Project } from "@/types/project";
import type { Section } from "@/types/section";

export const dynamic = "force-dynamic";

function mapSection(row: Record<string, unknown>): Section {
  return {
    id: String(row.id),
    project_id: String(row.project_id),
    outline_section_id: String(row.outline_section_id),
    position: Number(row.position),
    title: String(row.title),
    content_html: String(row.content_html ?? ""),
    word_count: Number(row.word_count ?? 0),
    status: row.status as Section["status"],
    updated_at: String(row.updated_at),
  };
}

function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    owner_id: String(row.owner_id),
    title: String(row.title),
    author: String(row.author ?? ""),
    subtitle: (row.subtitle as string | null) ?? null,
    description: String(row.description ?? ""),
    audience: String(row.audience ?? ""),
    tone: String(row.tone ?? ""),
    niche: String(row.niche ?? ""),
    ebook_type: row.ebook_type as Project["ebook_type"],
    status: row.status as Project["status"],
    template_id: (row.template_id as string | null) ?? null,
    progress: Number(row.progress ?? 0),
    sections_generated: Number(row.sections_generated ?? 0),
    total_sections: Number(row.total_sections ?? 0),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
    published_at: (row.published_at as string | null) ?? null,
    cover_color: String(row.cover_color ?? "#1F2937"),
    cta_goal: (row.cta_goal as Project["cta_goal"]) ?? null,
    final_cta: (row.final_cta as string | null) ?? null,
    cta_url: (row.cta_url as string | null) ?? null,
  };
}

export default async function ProjectPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login");
  }

  const { data: projectRow, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", id)
    .eq("owner_id", user.id)
    .maybeSingle();

  if (projectError || !projectRow) {
    notFound();
  }

  const { data: sectionRows } = await supabase
    .from("ebook_sections")
    .select("*")
    .eq("project_id", id)
    .order("position", { ascending: true });

  const sections: Section[] = (sectionRows ?? []).map(mapSection);
  const document = buildProjectPreviewDocument({
    project: mapProject(projectRow),
    sections,
  });

  // No-content state: nothing readable yet (no generated/edited section).
  if (!document.capabilities.can_edit_sections) {
    return (
      <div className="grid place-items-center min-h-[60vh] px-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-bold text-[var(--color-publiora-black)]">
            Pratinjau belum tersedia
          </h1>
          <p className="mt-3 text-sm text-[var(--color-medium-gray)]">
            Tulis minimal satu section untuk membuka mode pembaca.
          </p>
          <Link href={`/projects/${id}`} className="mt-6 inline-block">
            <Button>Kembali ke proyek</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Reader
      document={document}
      mode="creator_preview"
      backHref={`/projects/${id}`}
      backLabel="Kembali ke proyek"
    />
  );
}