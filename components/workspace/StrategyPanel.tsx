"use client";

import * as React from "react";
import {
  useMessages,
  useProject,
  useProjectOffers,
  useSendMessage,
  useStrategy,
} from "@/lib/api/hooks";
import { useUiStore } from "@/store/projectStore";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { AssistantMessageContent } from "@/components/workspace/AssistantMessageContent";
import { ContextualQuickReplies } from "@/components/workspace/ContextualQuickReplies";
import { StrategyBriefCard } from "@/components/workspace/StrategyBriefCard";
import { StrategyReadinessCard } from "@/components/workspace/StrategyReadinessCard";
import { StrategyFieldEditor } from "@/components/workspace/StrategyFieldEditor";
import { StrategyBriefSheet } from "@/components/workspace/StrategyBriefSheet";
import { OfferSyncDialog } from "@/components/offers/OfferSyncDialog";
import { LegacyOfferConversionCard } from "@/components/offers/LegacyOfferConversionCard";
import { Send, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "@/types/message";
import type { EbookStrategy, StrategyNextAction } from "@/types/strategy";
import { REQUIRED_STRATEGY_FIELDS } from "@/types/strategy";
import {
  STRATEGY_COPY_ID,
  STRATEGY_STARTER_REPLIES_ID,
} from "@/lib/workflow/strategy-copy";

// ---------------------------------------------------------------------------
// StrategyPanel
// ---------------------------------------------------------------------------

const HEADER_LABEL = STRATEGY_COPY_ID.assistantName;

type PendingSend =
  | { status: "sending"; content: string }
  | { status: "failed"; content: string };

interface StrategyPanelProps {
  projectId: string;
  onRequestOutline?: () => void;
}

export function StrategyPanel({ projectId, onRequestOutline }: StrategyPanelProps) {
  const { data: messages, isLoading: msgsLoading } = useMessages(projectId);
  const { data: strategyData, isLoading: strategyLoading } = useStrategy(projectId);
  const { data: project } = useProject(projectId);
  const { data: projectOffers } = useProjectOffers(projectId);
  const ebookType = project?.ebook_type ?? "lead_magnet";
  const send = useSendMessage();
  const pushToast = useUiStore((s) => s.pushToast);

  const [text, setText] = React.useState("");
  const [pendingSend, setPendingSend] = React.useState<PendingSend | null>(null);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editorInitialField, setEditorInitialField] = React.useState<keyof EbookStrategy | null>(null);
  const [briefSheetOpen, setBriefSheetOpen] = React.useState(false);
  const [syncOpen, setSyncOpen] = React.useState(false);

  const primaryOffer = React.useMemo(() => {
    const items = projectOffers?.items ?? [];
    return items.find((i) => i.link.is_primary) ?? items[0] ?? null;
  }, [projectOffers]);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const taRef = React.useRef<HTMLTextAreaElement>(null);
  const sendStatusRef = React.useRef<HTMLDivElement>(null);
  const isSending = pendingSend?.status === "sending" || send.isPending;

  const strategy = strategyData?.state.strategy;
  const readinessScore = strategyData?.readiness_score ?? 0;
  const missingFields = strategyData?.state.missing_fields ?? [];
  const nextAction: StrategyNextAction =
    strategyData?.state.next_action ?? "continue_strategy";

  // Core filled count for compact trigger
  const coreFilled = React.useMemo(() => {
    if (!strategy) return 0;
    return REQUIRED_STRATEGY_FIELDS.filter((key) => {
      const v = strategy[key];
      if (Array.isArray(v)) return v.filter(Boolean).length > 0;
      return (v as string)?.trim().length > 0;
    }).length;
  }, [strategy]);

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, pendingSend]);

  // Auto-grow textarea
  React.useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = Math.min(el.scrollHeight, 128) + "px";
  }, [text]);

  const onSend = async (content?: string) => {
    const body = (content ?? text).trim();
    if (!body || isSending) return;
    setText("");
    setPendingSend({ status: "sending", content: body });
    try {
      await send.mutateAsync({
        project_id: projectId,
        content: body,
      });
      setPendingSend(null);
    } catch {
      setPendingSend({ status: "failed", content: body });
      setText(body);
      pushToast({ title: STRATEGY_COPY_ID.sendError, variant: "danger" });
    }
  };

  const onRetry = () => {
    if (!pendingSend || pendingSend.status !== "failed") return;
    void onSend(pendingSend.content);
  };

  const empty = !messages || messages.length === 0;

  // Find latest assistant message
  const latestAssistant = React.useMemo(() => {
    if (!messages || messages.length === 0) return null;
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return messages[i];
    }
    return null;
  }, [messages]);

  // Contextual suggestions from latest assistant metadata
  const latestSuggestions = React.useMemo(() => {
    if (!latestAssistant || !strategyData?.state) return [];
    const meta = latestAssistant.metadata;
    if (!meta?.suggested_replies || meta.suggested_replies.length === 0) return [];
    // Stale check: only show if strategy_context_updated_at matches state.updated_at
    if (meta.strategy_context_updated_at !== strategyData.state.updated_at) return [];
    return meta.suggested_replies;
  }, [latestAssistant, strategyData?.state]);

  // Skeleton: show only when waiting for next assistant reply after first
  const showSkeleton =
    pendingSend?.status === "sending" && latestAssistant !== null;

  return (
    <div className="flex flex-col lg:flex-row h-full bg-[var(--color-surface-2)]">
      {/* ------------------------------------------------------------------ */}
      {/* Left: Conversation */}
      {/* ------------------------------------------------------------------ */}
      <div className="flex flex-col flex-1 min-h-0 min-w-0 lg:border-r border-[var(--color-publiora-border)]">
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
            pendingSend ? (
              // Empty state with pending/failed first message
              <>
                <MessageBubble
                  message={{
                    id: "pending",
                    project_id: projectId,
                    role: "user",
                    content: pendingSend.content,
                    agent: null,
                    metadata: {},
                    created_at: new Date().toISOString(),
                  }}
                  pending={pendingSend.status === "sending"}
                  failed={pendingSend.status === "failed"}
                  onRetry={pendingSend.status === "failed" ? onRetry : undefined}
                />
                {pendingSend.status === "sending" && (
                  <div
                    className="text-sm text-[var(--color-medium-gray)] text-center py-4"
                    aria-live="polite"
                    aria-busy="true"
                  >
                    Asisten menyiapkan balasan…
                  </div>
                )}
              </>
            ) : (
              <div className="max-w-xl mx-auto pt-4">
                <EmptyState
                  icon={<MessageSquare className="h-5 w-5" />}
                  title={STRATEGY_COPY_ID.emptyTitle}
                  description={STRATEGY_COPY_ID.emptyDescription}
                />
                <div className="mt-4 flex flex-wrap gap-2 justify-center">
                  {STRATEGY_STARTER_REPLIES_ID.map((s) => (
                    <button
                      key={s.label}
                      type="button"
                      onClick={() => onSend(s.message)}
                      disabled={isSending}
                      className="px-3 py-2 rounded-xl border border-[var(--color-publiora-border)] bg-white text-xs text-[var(--color-deep-gray)] hover:bg-[var(--color-surface-2)] transition-colors text-left max-w-xs"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )
          ) : (
            <>
              {messages.map((m) => (
                <React.Fragment key={m.id}>
                  <MessageBubble message={m} />
                  {m.role === "assistant" &&
                    m.id === latestAssistant?.id &&
                    latestSuggestions.length > 0 && (
                      <ContextualQuickReplies
                        suggestions={latestSuggestions}
                        disabled={isSending}
                        onSelect={(s) => onSend(s.message)}
                      />
                    )}
                </React.Fragment>
              ))}

              {/* Optimistic / failed user bubble */}
              {pendingSend && (
                <MessageBubble
                  message={{
                    id: "pending",
                    project_id: projectId,
                    role: "user",
                    content: pendingSend.content,
                    agent: null,
                    metadata: {},
                    created_at: new Date().toISOString(),
                  }}
                  pending={pendingSend.status === "sending"}
                  failed={pendingSend.status === "failed"}
                  onRetry={pendingSend.status === "failed" ? onRetry : undefined}
                />
              )}

              {/* Skeleton while waiting for next assistant reply */}
              {showSkeleton && (
                <div
                  className="text-sm text-[var(--color-medium-gray)] text-center py-2"
                  aria-live="polite"
                  aria-busy="true"
                >
                  Menyiapkan pilihan berikutnya…
                </div>
              )}
            </>
          )}
        </div>

        {/* Compact brief trigger (tablet + mobile, <lg) */}
        {strategy && (
          <button
            type="button"
            onClick={() => setBriefSheetOpen(true)}
            className="lg:hidden shrink-0 border-t border-[var(--color-publiora-border)] bg-white px-3 py-2 text-sm font-medium text-[var(--color-publiora-black)] hover:bg-[var(--color-surface-2)] transition-colors text-left"
          >
            {STRATEGY_COPY_ID.briefCompactSummary(coreFilled, REQUIRED_STRATEGY_FIELDS.length, readinessScore)}
          </button>
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
              loading={isSending}
              size="icon"
              disabled={!text.trim() || isSending}
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
            {pendingSend?.status === "sending" && STRATEGY_COPY_ID.sending}
            {pendingSend?.status === "failed" && STRATEGY_COPY_ID.sendError}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Right: Brief + Readiness (desktop side panel, lg+) */}
      {/* ------------------------------------------------------------------ */}
      <div className="hidden lg:flex lg:flex-col lg:w-[340px] xl:w-96 shrink-0 overflow-y-auto p-3 gap-3 bg-[var(--color-surface-2)]">
        {strategyLoading ? (
          <>
            <Skeleton className="h-48" />
            <Skeleton className="h-40" />
          </>
        ) : strategy ? (
          <>
            <StrategyBriefCard
              strategy={strategy}
              ebookType={ebookType}
              linkedOffer={primaryOffer}
              onSyncOffer={() => setSyncOpen(true)}
              onReplaceOffer={() => {
                if (
                  window.confirm(
                    "Ganti produk yang terhubung?\n\nStrategi dan CTA tidak akan diubah sampai Anda memilih field yang ingin diterapkan dari produk baru.",
                  )
                ) {
                  setBriefSheetOpen(true);
                }
              }}
              onEdit={() => {
                setEditorInitialField(null);
                setEditorOpen(true);
              }}
              onEditField={(key) => {
                setEditorInitialField(key);
                setEditorOpen(true);
              }}
            />
            {!primaryOffer && strategy.product_or_offer ? (
              <LegacyOfferConversionCard
                projectId={projectId}
                ebookType={ebookType}
                legacyText={strategy.product_or_offer}
              />
            ) : null}
            <StrategyReadinessCard
              readinessScore={readinessScore}
              missingFields={missingFields}
              nextAction={nextAction}
              onRequestOutline={onRequestOutline}
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

      {primaryOffer ? (
        <OfferSyncDialog
          open={syncOpen}
          onClose={() => setSyncOpen(false)}
          projectId={projectId}
          link={primaryOffer.link}
          offer={primaryOffer.offer}
        />
      ) : null}

      {/* Field editor modal */}
      {strategy && (
        <StrategyFieldEditor
          open={editorOpen}
          onClose={() => {
            setEditorOpen(false);
            setEditorInitialField(null);
          }}
          projectId={projectId}
          strategy={strategy}
          ebookType={ebookType}
          initialField={editorInitialField}
        />
      )}

      {/* Brief sheet (tablet + mobile, <lg) */}
      {strategy && (
        <StrategyBriefSheet
          open={briefSheetOpen}
          onClose={() => setBriefSheetOpen(false)}
          strategy={strategy}
          ebookType={ebookType}
          readinessScore={readinessScore}
          missingFields={missingFields}
          nextAction={nextAction}
          linkedOffer={primaryOffer}
          onSyncOffer={() => {
            setBriefSheetOpen(false);
            setSyncOpen(true);
          }}
          onReplaceOffer={() => {
            if (
              window.confirm(
                "Ganti produk yang terhubung?\n\nStrategi dan CTA tidak akan diubah sampai Anda memilih field yang ingin diterapkan dari produk baru.",
              )
            ) {
              setBriefSheetOpen(true);
            }
          }}
          onEdit={() => {
            setBriefSheetOpen(false);
            setEditorInitialField(null);
            setEditorOpen(true);
          }}
          onEditField={(key) => {
            setBriefSheetOpen(false);
            setEditorInitialField(key);
            setEditorOpen(true);
          }}
          onRequestOutline={onRequestOutline}
        />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({
  message,
  pending = false,
  failed = false,
  onRetry,
}: {
  message: ChatMessage;
  pending?: boolean;
  failed?: boolean;
  onRetry?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex gap-3 max-w-2xl animate-fade-in",
        message.role === "user" && "ml-auto justify-end",
        pending && "opacity-70"
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
            ? failed
              ? "bg-[var(--color-publiora-black)] text-white rounded-tr-sm ring-2 ring-[var(--color-danger,#dc2626)]"
              : "bg-[var(--color-publiora-black)] text-white rounded-tr-sm"
            : "bg-white border border-[var(--color-publiora-border)] text-[var(--color-deep-gray)] rounded-tl-sm"
        )}
      >
        {message.role === "assistant" ? (
          <AssistantMessageContent content={message.content} />
        ) : (
          <>
            {message.content}
            {pending && (
              <span className="ml-2 text-[10px] text-white/70 italic">
                {STRATEGY_COPY_ID.sendingInline}
              </span>
            )}
            {failed && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[10px] text-red-200">
                  {STRATEGY_COPY_ID.sendError}
                </span>
                {onRetry && (
                  <button
                    type="button"
                    onClick={onRetry}
                    className="text-[11px] font-medium underline text-white hover:text-white/90"
                  >
                    {STRATEGY_COPY_ID.retrySend}
                  </button>
                )}
              </div>
            )}
          </>
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
