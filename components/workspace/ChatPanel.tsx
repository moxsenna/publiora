"use client";

import * as React from "react";
import { useMessages, useSendMessage } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { AGENT_LABELS, AGENT_COLORS } from "@/lib/mock/ai";
import type { AgentName } from "@/types/message";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { Send, MessageSquare } from "lucide-react";
import { AGENTS } from "./agents";
import { cn } from "@/lib/utils";

const SUGGESTIONS: Record<AgentName, string[]> = {
  strategist: [
    "Bantu susun pillar topik untuk audiens ini",
    "Apa angle paling kuat dari brief saya?",
    "Ringkas positioning ebook dalam 3 kalimat",
  ],
  planner: [
    "Buatkan outline 5–6 bab yang actionable",
    "Susun ulang outline agar alur lebih logis",
    "Tambah section tentang pitfall umum",
  ],
  writer: [
    "Tulis ulang section ini lebih padat",
    "Tambah contoh konkret di section 1",
    "Perkuat opening paragraph",
  ],
  enhancement: [
    "Perbaiki alur dan kejelasan paragraf",
    "Rapikan tone agar lebih taktis",
    "Singkatkan tanpa hilang poin utama",
  ],
  title: [
    "Generate 5 variasi judul",
    "Buat judul yang lebih outcome-driven",
    "Usulkan subtitle yang complementary",
  ],
  cta: [
    "Generate 5 CTA untuk landing page",
    "CTA untuk email claim link",
    "CTA yang lebih soft-sell",
  ],
};

export function ChatPanel({ projectId }: { projectId: string }) {
  const { data: messages, isLoading } = useMessages(projectId);
  const send = useSendMessage();
  const pushToast = useUiStore((s) => s.pushToast);
  const [text, setText] = React.useState("");
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const [agent, setAgent] = React.useState<AgentName>("strategist");

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // auto-grow textarea
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [text]);

  const onSend = async (content?: string) => {
    const body = (content ?? text).trim();
    if (!body) return;
    setText("");
    try {
      await send.mutateAsync({
        project_id: projectId,
        content: body,
        agent,
      });
    } catch {
      pushToast({ title: "Pesan gagal dikirim", variant: "danger" });
    }
  };

  const empty = !messages || messages.length === 0;

  return (
    <div className="flex flex-col h-full bg-[var(--color-surface-2)]">
      <div className="border-b border-[var(--color-publiora-border)] bg-white px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {AGENTS.map((a) => {
          const active = agent === a.slug;
          return (
            <button
              key={a.slug}
              type="button"
              onClick={() => setAgent(a.slug as AgentName)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all",
                active
                  ? "bg-[var(--color-publiora-black)] text-white border-[var(--color-publiora-black)]"
                  : "bg-white text-[var(--color-medium-gray)] hover:bg-[var(--color-surface-2)] border-[var(--color-publiora-border)]"
              )}
            >
              <span
                className="inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle"
                style={{ background: AGENT_COLORS[a.slug as AgentName] }}
              />
              {AGENT_LABELS[a.slug as AgentName]}
            </button>
          );
        })}
      </div>

      {/* Chat messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-5 space-y-5">
        {isLoading ? (
          <div className="space-y-4 max-w-xl">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
        ) : empty ? (
          <div className="max-w-xl mx-auto pt-6">
            <EmptyState
              icon={<MessageSquare className="h-6 w-6" />}
              title="Mulai percakapan"
              description={`Chat dengan ${AGENT_LABELS[agent]} untuk membentuk brief ebook.`}
            />
            <div className="mt-4 flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS[agent].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSend(s)}
                  disabled={send.isPending}
                  className="px-3 py-2 rounded-xl border border-[var(--color-publiora-border)] bg-white text-xs text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)] transition-colors text-left max-w-xs"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m) => (
            <div
              key={m.id}
              className={cn(
                "flex gap-3 max-w-2xl animate-fade-in",
                m.role === "user" && "ml-auto justify-end"
              )}
            >
              {m.role === "assistant" && (
                <div className="shrink-0">
                  <div
                    className="h-7 w-7 rounded-lg grid place-items-center text-white text-xs font-semibold"
                    style={{
                      background: AGENT_COLORS[m.agent ?? "strategist"],
                    }}
                  >
                    {m.agent ? AGENT_LABELS[m.agent].slice(0, 2) : "AI"}
                  </div>
                </div>
              )}
              <div
                className={cn(
                  "px-4 py-3 rounded-2xl max-w-xl text-sm whitespace-pre-wrap",
                  m.role === "user"
                    ? "bg-[var(--color-publiora-black)] text-white rounded-tr-sm"
                    : "bg-white border border-[var(--color-publiora-border)] text-[var(--color-deep-gray)] rounded-tl-sm"
                )}
              >
                {m.content}
                {m.role === "assistant" && m.agent && (
                  <div className="mt-2 text-[10px] uppercase tracking-wide text-[var(--color-soft-gray)]">
                    {AGENT_LABELS[m.agent]}
                  </div>
                )}
              </div>
              {m.role === "user" && (
                <div className="shrink-0">
                  <Avatar name="You" size="sm" />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {!empty && (
        <div className="px-4 pb-1 flex flex-wrap gap-1.5">
          {SUGGESTIONS[agent].slice(0, 2).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setText(s)}
              className="px-2.5 py-1 rounded-full border border-[var(--color-publiora-border)] bg-white text-[11px] text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="border-t border-[var(--color-publiora-border)] bg-white p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={taRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                onSend();
              }
            }}
            rows={1}
            placeholder={`Pesan ke ${AGENT_LABELS[agent]}… (⌘/Ctrl+Enter)`}
            className="flex-1 max-h-32 resize-none rounded-2xl border border-[var(--color-publiora-border)] px-4 py-3 text-sm outline-none focus:border-[var(--color-publiora-blue)] bg-white"
          />
          <Button
            onClick={() => onSend()}
            loading={send.isPending}
            size="icon"
            disabled={!text.trim()}
            aria-label="Send"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
