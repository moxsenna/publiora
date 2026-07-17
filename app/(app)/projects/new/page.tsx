"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateProject, useTemplates } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Input, Label, Textarea } from "@/components/ui/Input";
import { Card, CardBody } from "@/components/ui/Card";
import { ArrowLeft, Check } from "lucide-react";
import Link from "next/link";

const newProjectSchema = z.object({
  title: z.string().min(3, "Min 3").max(120),
  author: z.string().min(1, "Wajib"),
  subtitle: z.string().optional(),
  description: z.string().min(20, "Min 20"),
  audience: z.string().min(1, "Wajib"),
  tone: z.string().min(1, "Wajib"),
  niche: z.string().min(1, "Wajib"),
});

type NewProjectInput = z.infer<typeof newProjectSchema>;

export default function NewProjectPage() {
  const router = useRouter();
  const create = useCreateProject();
  const { data: templates } = useTemplates();
  const pushToast = useUiStore((s) => s.pushToast);
  const [selectedTemplate, setSelectedTemplate] = React.useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<NewProjectInput>({ resolver: zodResolver(newProjectSchema) });

  const applyTemplate = (tplId: string) => {
    const tpl = templates?.find((t) => t.id === tplId);
    if (!tpl) return;
    setSelectedTemplate(tplId);
    setValue("niche", tpl.niche, { shouldValidate: true });
    setValue("audience", tpl.default_audience, { shouldValidate: true });
    setValue("tone", tpl.default_tone, { shouldValidate: true });
  };

  const onSubmit = async (data: NewProjectInput) => {
    try {
      const project = await create.mutateAsync({
        title: data.title,
        author: data.author,
        subtitle: data.subtitle,
        description: data.description,
        audience: data.audience,
        tone: data.tone,
        niche: data.niche,
        template_id: selectedTemplate ?? undefined,
      });
      pushToast({ title: "Project dibuat", variant: "success" });
      router.push(`/projects/${project.id}`);
    } catch (e) {
      pushToast({ title: "Gagal membuat project", variant: "danger" });
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
      <Link href="/projects">
        <Button variant="ghost" size="sm">
          <ArrowLeft className="h-4 w-4" />
          Kembali ke projects
        </Button>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-[var(--color-publiora-black)]">New Project</h1>
        <p className="text-[var(--color-medium-gray)] mt-1">Pilih template atau mulai dari nol.</p>
      </div>

      <section>
        <h2 className="text-sm font-semibold text-[var(--color-publiora-black)] uppercase tracking-wide mb-3">
          Template
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setSelectedTemplate(null)}
            className="p-4 rounded-2xl border-2 text-left transition-all bg-white"
            style={{ borderColor: !selectedTemplate ? "var(--color-publiora-black)" : "var(--color-publiora-border)" }}
          >
            <div className="text-sm font-semibold text-[var(--color-publiora-black)]">Blank</div>
            <p className="mt-1 text-xs text-[var(--color-medium-gray)]">Mulai dari nol.</p>
            {!selectedTemplate && <Check className="h-4 w-4 text-[var(--color-publiora-black)] mt-2" />}
          </button>
          {(templates ?? []).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => applyTemplate(t.id)}
              className="p-4 rounded-2xl border-2 text-left bg-white transition-all"
              style={{
                borderColor: selectedTemplate === t.id ? "var(--color-publiora-black)" : "var(--color-publiora-border)",
              }}
            >
              <div className="h-3 w-3 rounded-full mb-2" style={{ background: t.cover_color }} />
              <div className="text-sm font-semibold text-[var(--color-publiora-black)]">{t.name}</div>
              <p className="mt-1 text-xs text-[var(--color-medium-gray)] line-clamp-2">{t.description}</p>
              {selectedTemplate === t.id && <Check className="h-4 w-4 text-[var(--color-publiora-black)] mt-2" />}
            </button>
          ))}
        </div>
      </section>

      <Card>
        <CardBody>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input id="title" placeholder="Contoh: The Content Engine Playbook" {...register("title")} />
              {errors.title && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.title.message}</p>}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="author">Author</Label>
                <Input id="author" defaultValue="Mox Demo" {...register("author")} />
                {errors.author && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.author.message}</p>}
              </div>
              <div>
                <Label htmlFor="subtitle">Subtitle (opsional)</Label>
                <Input id="subtitle" placeholder="Build a perpetual growth machine" {...register("subtitle")} />
              </div>
            </div>
            <div>
              <Label htmlFor="description">Description / Brief</Label>
              <Textarea id="description" rows={4} placeholder="Jelaskan tujuan ebook dan apa yang harus diketahui AI" {...register("description")} />
              {errors.description && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.description.message}</p>}
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="audience">Audience</Label>
                <Input id="audience" placeholder="Founder B2B SaaS" {...register("audience")} />
                {errors.audience && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.audience.message}</p>}
              </div>
              <div>
                <Label htmlFor="tone">Tone</Label>
                <Input id="tone" placeholder="Taktis, padat" {...register("tone")} />
                {errors.tone && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.tone.message}</p>}
              </div>
              <div>
                <Label htmlFor="niche">Niche</Label>
                <Input id="niche" placeholder="Marketing" {...register("niche")} />
                {errors.niche && <p className="text-xs text-[var(--color-danger)] mt-1">{errors.niche.message}</p>}
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Link href="/projects">
                <Button type="button" variant="outline">Batal</Button>
              </Link>
              <Button type="submit" loading={create.isPending}>
                Create project
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
