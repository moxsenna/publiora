"use client";

import * as React from "react";
import { useMessages, useSendMessage, useStrategy } from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { StrategyBriefCard } from "@/components/workspace/StrategyBriefCard";
import { StrategyReadinessCard } from "@/components/workspace/StrategyReadinessCard";
import { StrategyFieldEditor } from "@/components/workspace/StrategyFieldEditor";
import { Send, MessageSquare, Lightbulb } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/message";
import type { StrategyNextAction } from "@/types/strategy";
import {
  STRATEGY_COPY_ID,
  STRATEGY_DEFAULT_SUGGESTIONS,
  STRATEGY_MISSING_FIELD_PROMPTS,
} from "@/lib/workflow/strategy-copy";

// ---------------------------------------------------------------------------
// StrategyPanel
// ---------------------------------------------------------------------------

const HEADER_LABEL = STRATEGY_COPY_ID.assistantName;

interface StrategyPanelProps {
  projectId: string;
  onRequestOutline?: () => void;
}

export function StrategyPanel({ projectId, onRequestOutline }: StrategyPanelProps) {
  const { data: messages, isLoading: msgsLoading } = useMessages(projectId);
  const { data: strategyData, isLoading: strategyLoading } = useStrategy(projectId);
  const send = useSendMessage();
  const pushToast = useUiStore((s) => s.pushToast);

  const [text, setText] = React.useState("");
  const [editorOpen, setEditorOpen] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const sendStatusRef = React.useRef<HTMLDivElement>(null);

  const strategy = strategyData?.state.strategy;
  const readinessScore = strategyData?.readiness_score ?? 0;
  const missingFields = strategyData?.state.missing_fields ?? [];
  const nextAction: StrategyNextAction =
    strategyData?.state.next_action ?? "continue_strategy";

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  // Auto-grow textarea
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
      });
    } catch {
      pushToast({ title: STRATEGY_COPY_ID.sendError, variant: "danger" });
    }
  };

  const empty = !messages || messages.length === 0;

  // Derive prompt suggestions: prioritize missing-field prompts, then fall back
  const promptSuggestions = React.useMemo(() => {
    if (missingFields.length > 0) {
      const fromMissing = missingFields
        .map((f) => STRATEGY_MISSING_FIELD_PROMPTS[f])
        .filter(Boolean)
        .slice(0, 5);
      if (fromMissing.length > 0) return fromMissing;
    }
    return STRATEGY_DEFAULT_SUGGESTIONS;
  }, [missingFields]);

  return (
    <div className="flex flex-col sm:flex-row h-full bg-[var(--color-surface-2)]">
      {/* ------------------------------------------------------------------ */}
      {/* Left: Conversation */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 border-r border-[var(--color-publiora-border)]">
        {/* Header */}
        <div className="shrink-0 px-3 py-2.5 border-b border-[var(--color-publiora-border)] bg-white">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-[var(--color-publiora-black)] grid place-items-center text-white text-xs font-semibold">
              SA
            </div>
            <span className="text-sm font-semibold text-[var(--color-publiora-black)]">
              {HEADER_LABEL}
            </span>
          </div>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
          {msgsLoading ? (
            <div className="space-y-2.5 max-w-xl">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-16" />
              ))}
            </div>
          ) : empty ? (
            <div className="max-w-xl mx-auto pt-4">
              <EmptyState
                icon={<MessageSquare className="h-5 w-5" />}
                title={STRATEGY_COPY_ID.emptyTitle}
                description={STRATEGY_COPY_ID.emptyDescription}
              />
              <div className="mt-4 flex flex-wrap gap-2 justify-center">
                {promptSuggestions.slice(0, 5).map((s) => (
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
              <MessageBubble key={m.id} message={m} />
            ))
          )}
        </div>

        {/* Prompt suggestions bar (visible when there are messages) */}
        {!empty && promptSuggestions.length > 0 && (
          <div className="px-4 pb-1 flex flex-wrap gap-1.5">
            {promptSuggestions.slice(0, 3).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setText(s)}
                className="px-2.5 py-1.5 rounded-full border border-[var(--color-publiora-border)] bg-white text-xs text-[var(--color-medium-gray)] hover:text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)]"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Missing-field CTA */}
        {!empty && missingFields.length > 0 && (
          <div className="px-3 pb-1">
            <div className="flex items-center gap-2 text-xs text-[var(--color-gold)] bg-[var(--color-surface-2)] rounded-lg px-3 py-2">
              <Lightbulb className="h-3.5 w-3.5 shrink-0" />
              <span>
                {STRATEGY_COPY_ID.missingFieldsCta(missingFields.length)}
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="underline font-medium hover:text-[var(--color-publiora-black)]"
                >
                  edit langsung
                </button>
                .
              </span>
            </div>
          </div>
        )}

        {/* Composer */}
        <div className="border-t border-[var(--color-publiora-border)] bg-white p-2.5">
          <div className="flex items-end gap-2">
            <textarea
              ref={taRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                const isComposing =
                  (e.nativeEvent as KeyboardEvent).isComposing ||
                  (e as unknown as { isComposing?: boolean }).isComposing === true;
                if (e.key === "Enter" && !e.shiftKey && !isComposing) {
                  e.preventDefault();
                  onSend();
                }
              }}
              rows={1}
              placeholder={STRATEGY_COPY_ID.composerPlaceholder}
              className="flex-1 max-h-32 resize-none rounded-xl border border-[var(--color-publiora-border)] px-3 py-2 text-sm text-[var(--color-deep-gray)] focus:border-[var(--color-publiora-blue)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-publiora-blue)] bg-white"
              aria-label={STRATEGY_COPY_ID.composerPlaceholder}
            />
            <Button
              onClick={() => onSend()}
              loading={send.isPending}
              size="icon"
              disabled={!text.trim() || send.isPending}
              aria-label={STRATEGY_COPY_ID.sendAriaLabel}
            >
              <Send className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Composer helper / send status */}
          <div className="hidden sm:flex items-center justify-between mt-1.5">
            <p className="text-[10px] text-[var(--color-medium-gray)]">
              {STRATEGY_COPY_ID.composerHelper}
            </p>
          </div>
          <div ref={sendStatusRef} aria-live="polite" className="sr-only">
            {send.isPending && STRATEGY_COPY_ID.sending}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right: Brief + Readiness (desktop side panel) */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden sm:flex sm:flex-col sm:w-80 lg:w-96 shrink-0 overflow-y-auto p-3 gap-3 bg-[var(--color-surface-2)]">
        {strategyLoading ? (
          <>
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
          </>
        ) : strategy ? (
          <>
            <StrategyBriefCard
              strategy={strategy}
              onEdit={() => setEditorOpen(true)}
            />
            <StrategyReadinessCard
              readinessScore={readinessScore}
              missingFields={missingFields}
              nextAction={nextAction}
            />
          </>
        ) : (
          <div className="text-sm text-[var(--color-medium-gray)] text-center py-6 space-y-3">
            <p>{STRATEGY_COPY_ID.strategyUnavailable}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              {STRATEGY_COPY_ID.reload}
            </Button>
          </div>
        )}
      </div>

      {/* Mobile: collapsible brief section below messages */}
      <div className="sm:hidden border-t border-[var(--color-publiora-border)] bg-white px-3 py-3 space-y-3 overflow-y-auto max-h-[40vh]">
        {strategyLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : strategy ? (
          <>
            <StrategyBriefCard
              strategy={strategy}
              onEdit={() => setEditorOpen(true)}
            />
            <StrategyReadinessCard
              readinessScore={readinessScore}
              missingFields={missingFields}
              nextAction={nextAction}
            />
          </>
        ) : (
          <div className="text-sm text-[var(--color-medium-gray)] text-center py-4 space-y-3">
            <p>{STRATEGY_COPY_ID.strategyUnavailable}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.location.reload()}
            >
              {STRATEGY_COPY_ID.reload}
            </Button>
          </div>
        )}
      </div>

      {/* Field editor modal */}
      {strategy && (
        <StrategyFieldEditor
          open={editorOpen}
          onClose={() => setEditorOpen(false)}
          projectId={projectId}
          strategy={strategy}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
  return (
    <div
      className={cn(
        "flex gap-3 max-w-2xl animate-fade-in",
        message.role === "user" && "ml-auto justify-end"
      )}
    >
      {message.role === "assistant" && (
        <div className="shrink-0">
          <div className="h-7 w-7 rounded-lg grid place-items-center bg-[var(--color-publiora-black)] text-white text-xs font-semibold">
            SA
          </div>
        </div>
      )}
      <div
        className={cn(
          "px-3 py-2.5 rounded-xl max-w-xl text-sm whitespace-pre-wrap",
          message.role === "user"
            ? "bg-[var(--color-publiora-black)] text-white rounded-tr-sm"
            : "bg-white border border-[var(--color-publiora-border)] text-[var(--color-deep-gray)] rounded-tl-sm"
        )}
      >
        {message.content}
        {message.role === "assistant" && (
          <div className="mt-2 text-xs uppercase tracking-wide text-[var(--color-medium-gray)]">
            {HEADER_LABEL}
          </div>
        )}
      </div>
      {message.role === "user" && (
        <div className="shrink-0">
          <Avatar name="You" size="sm" />
        </div>
      )}
    </div>
  );
}
