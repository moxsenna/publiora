"use client";

import * as React from "react";
import {
  useProject,
  useGenerateTitles,
  useGenerateCtas,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody } from "@/components/ui/Card";
import { CopyButton } from "@/components/ui/CopyButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Sparkles, Heading, Megaphone } from "lucide-react";

export function ToolsPanel({ projectId }: { projectId: string }) {
  const { data: project } = useProject(projectId);
  const genTitles = useGenerateTitles();
  const genCtas = useGenerateCtas();
  const pushToast = useUiStore((s) => s.pushToast);
  const [titles, setTitles] = React.useState<string[]>([]);
  const [ctas, setCtas] = React.useState<string[]>([]);

  const fetchTitles = async () => {
    try {
      const res = await genTitles.mutateAsync(projectId);
      setTitles(res);
      pushToast({ title: "Judul digenerate", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title:
          e?.code === "insufficient_credits"
            ? "Kredit tidak cukup"
            : "Generate judul gagal",
        description:
          e?.code === "insufficient_credits"
            ? "Buka Billing untuk top-up."
            : e?.message,
        variant: "danger",
      });
    }
  };

  const fetchCtas = async () => {
    try {
      const res = await genCtas.mutateAsync(projectId);
      setCtas(res);
      pushToast({ title: "CTA digenerate", variant: "success" });
    } catch (err) {
      const e = err as { code?: string; message?: string };
      pushToast({
        title:
          e?.code === "insufficient_credits"
            ? "Kredit tidak cukup"
            : "Generate CTA gagal",
        description:
          e?.code === "insufficient_credits"
            ? "Buka Billing untuk top-up."
            : e?.message,
        variant: "danger",
      });
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-3xl mx-auto">
      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--color-publiora-black)] grid place-items-center text-white">
                <Heading className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--color-publiora-black)]">
                  Title generator
                </h2>
                <p className="text-xs text-[var(--color-medium-gray)]">
                  Variasi judul dari title agent.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={fetchTitles} loading={genTitles.isPending}>
              <Sparkles className="h-4 w-4" />
              Generate
            </Button>
          </div>
          {titles.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {titles.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)]"
                >
                  <span className="text-sm font-medium text-[var(--color-deep-gray)]">
                    {t}
                  </span>
                  <CopyButton value={t} label="Copy" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={<Heading className="h-5 w-5" />}
                title="Belum ada variasi judul"
                description="Klik Generate untuk membuat."
              />
            </div>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardBody>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[var(--color-danger)] grid place-items-center text-white">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h2 className="font-semibold text-[var(--color-publiora-black)]">
                  CTA generator
                </h2>
                <p className="text-xs text-[var(--color-medium-gray)]">
                  Variasi call-to-action untuk ebook & landing.
                </p>
              </div>
            </div>
            <Button size="sm" onClick={fetchCtas} loading={genCtas.isPending}>
              <Sparkles className="h-4 w-4" />
              Generate
            </Button>
          </div>
          {ctas.length > 0 ? (
            <ul className="mt-4 space-y-2">
              {ctas.map((t, i) => (
                <li
                  key={i}
                  className="flex items-center justify-between gap-2 p-3 rounded-xl border border-[var(--color-publiora-border)] bg-[var(--color-surface-2)]"
                >
                  <span className="text-sm text-[var(--color-deep-gray)]">{t}</span>
                  <CopyButton value={t} label="Copy" />
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-4">
              <EmptyState
                icon={<Megaphone className="h-5 w-5" />}
                title="Belum ada CTA"
                description="Klik Generate untuk membuat."
              />
            </div>
          )}
        </CardBody>
      </Card>

      {project && (
        <Card>
          <CardBody>
            <h3 className="font-semibold text-[var(--color-publiora-black)] mb-3">
              Project metadata
            </h3>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <dt className="text-[var(--color-soft-gray)]">Author</dt>
              <dd className="text-[var(--color-deep-gray)]">{project.author}</dd>
              <dt className="text-[var(--color-soft-gray)]">Tipe</dt>
              <dd className="text-[var(--color-deep-gray)] capitalize">
                {(project.ebook_type ?? "lead_magnet").replaceAll("_", " ")}
              </dd>
              <dt className="text-[var(--color-soft-gray)]">Audience</dt>
              <dd className="text-[var(--color-deep-gray)]">{project.audience}</dd>
              <dt className="text-[var(--color-soft-gray)]">Tone</dt>
              <dd className="text-[var(--color-deep-gray)]">{project.tone}</dd>
              <dt className="text-[var(--color-soft-gray)]">Niche</dt>
              <dd className="text-[var(--color-deep-gray)]">{project.niche}</dd>
            </dl>
          </CardBody>
        </Card>
      )}
    </div>
  );
}
