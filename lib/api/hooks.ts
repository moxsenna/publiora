// TanStack Query hooks — always live HTTP via apiFetch.

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import { apiFetch } from "./client";
import { qk } from "./keys";

import type {
  BillingPlan,
  ChatMessage,
  ClaimCreateInput,
  ClaimEvent,
  ClaimLink,
  CreditBalance,
  CreditPack,
  CreditTransaction,
  Entitlement,
  PaymentCheckout,
  ExportCreateInput,
  ExportJob,
  Template,
  Outline,
  PlanId,
  Project,
  ProjectInput,
  ProjectUpdate,
  PublishedEbook,
  OutlineGenerateInput,
  OutlineUpdateInput,
  ReadingProgress,
  Section,
  SectionUpdateInput,
  Subscription,
} from "@/types";
import type { SendMessageInput, ChatResponse } from "@/types/message";
import type { ProjectStateV2 } from "@/types/strategy";
import type { EnhancementSuggestion, EnhancementAction, CtaGenerateRequest, CtaGenerateResponse } from "@/types/ai-suggestions";
import { CREDIT_COSTS } from "@/lib/billing/plans";

const READER_ID = "reader@publiora.demo";

// Projects
export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () => apiFetch<Project[]>("/api/projects"),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: qk.project(id),
    queryFn: () => apiFetch<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      apiFetch<Project>("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: ProjectUpdate }) =>
      apiFetch<Project>(`/api/projects/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      qc.setQueryData(qk.project(data.id), data);
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.projects });
      qc.invalidateQueries({ queryKey: qk.published });
    },
  });
}

// Outline
export function useOutline(projectId: string) {
  return useQuery({
    queryKey: qk.outline(projectId),
    queryFn: () => apiFetch<Outline | null>(`/api/projects/${projectId}/outline`),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
}

export function useGenerateOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input?: OutlineGenerateInput }) =>
      apiFetch<Outline>(`/api/projects/${projectId}/outline/generate`, {
        method: "POST",
        body: JSON.stringify(input ?? {}),
      }),
    onSuccess: (data) => {
      qc.setQueryData(qk.outline(data.project_id), data);
      qc.invalidateQueries({ queryKey: qk.project(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useUpdateOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, patch }: { projectId: string; patch: OutlineUpdateInput }) =>
      apiFetch<Outline>(`/api/projects/${projectId}/outline`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      qc.setQueryData(qk.outline(data.project_id), data);
    },
  });
}

export function useApproveOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<Outline>(`/api/projects/${projectId}/outline/approve`, { method: "POST" }),
    onSuccess: (data) => {
      qc.setQueryData(qk.outline(data.project_id), data);
      qc.invalidateQueries({ queryKey: qk.project(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
    },
  });
}

// Sections
export function useSections(projectId: string) {
  return useQuery({
    queryKey: qk.sections(projectId),
    queryFn: () => apiFetch<Section[]>(`/api/projects/${projectId}/sections`),
    enabled: !!projectId,
  });
}

export function useGenerateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, outlineSectionId }: { projectId: string; outlineSectionId: string }) =>
      apiFetch<Section>(`/api/projects/${projectId}/sections/generate`, {
        method: "POST",
        body: JSON.stringify({ outline_section_id: outlineSectionId }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.outline(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.project(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useGenerateAllSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<Section[]>(`/api/projects/${projectId}/sections/generate`, {
        method: "POST",
        body: JSON.stringify({ all: true }),
      }),
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: qk.sections(projectId) });
      qc.invalidateQueries({ queryKey: qk.outline(projectId) });
      qc.invalidateQueries({ queryKey: qk.project(projectId) });
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      projectId,
      patch,
    }: {
      id: string;
      projectId?: string;
      patch: SectionUpdateInput;
    }) =>
      apiFetch<Section>(`/api/projects/${projectId}/sections/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
    },
  });
}

// Chat
export function useMessages(projectId: string) {
  return useQuery({
    queryKey: qk.messages(projectId),
    queryFn: () => apiFetch<ChatMessage[]>(`/api/projects/${projectId}/messages`),
    enabled: !!projectId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      apiFetch<ChatResponse>(`/api/projects/${input.project_id}/chat`, {
        method: "POST",
        body: JSON.stringify({ content: input.content }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.messages(data.message.project_id) });
      qc.invalidateQueries({ queryKey: qk.strategy(data.message.project_id) });
    },
  });
}

// Strategy
export interface StrategyResponse {
  state: ProjectStateV2;
  readiness_score: number;
}

export function useStrategy(projectId: string) {
  return useQuery({
    queryKey: qk.strategy(projectId),
    queryFn: () =>
      apiFetch<StrategyResponse>(`/api/projects/${projectId}/strategy`),
    enabled: !!projectId,
  });
}

export function usePatchStrategy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      strategy_patch,
    }: {
      projectId: string;
      strategy_patch: Record<string, unknown>;
    }) =>
      apiFetch<StrategyResponse>(`/api/projects/${projectId}/strategy`, {
        method: "PATCH",
        body: JSON.stringify({ strategy_patch }),
      }),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: qk.strategy(variables.projectId) });
    },
  });
}

// Published
export function usePublishedEbooks() {
  return useQuery({
    queryKey: qk.published,
    queryFn: () => apiFetch<PublishedEbook[]>("/api/published"),
  });
}

export function usePublishedEbook(id: string) {
  return useQuery({
    queryKey: qk.publishedEbook(id),
    queryFn: () => apiFetch<PublishedEbook>(`/api/published/${id}`),
    enabled: !!id,
  });
}

export function usePublishedBySlug(slug: string) {
  return useQuery({
    queryKey: qk.publishedSlug(slug),
    queryFn: () => apiFetch<PublishedEbook>(`/api/published/by-slug/${slug}`),
    enabled: !!slug,
  });
}

export function usePublishEbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { project_id: string; is_public?: boolean }) =>
      apiFetch<PublishedEbook>(`/api/projects/${input.project_id}/publish`, {
        method: "POST",
        body: JSON.stringify({ is_public: input.is_public }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.published });
      qc.invalidateQueries({ queryKey: qk.projects });
    },
  });
}

// Claim links
export function useClaimLinks(ebookId: string) {
  return useQuery({
    queryKey: qk.claimLinks(ebookId),
    queryFn: () => apiFetch<ClaimLink[]>(`/api/published/${ebookId}/claim-links`),
    enabled: !!ebookId,
  });
}

export function useCreateClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClaimCreateInput) =>
      apiFetch<ClaimLink>(`/api/published/${input.ebook_id}/claim-links`, {
        method: "POST",
        body: JSON.stringify(input),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.claimLinks(data.ebook_id) });
    },
  });
}

export function useRevokeClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ClaimLink>(`/api/claim-links/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "revoke" }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.claimLinks(data.ebook_id) });
      qc.invalidateQueries({ queryKey: qk.claimEvents(data.id) });
    },
  });
}

export function useDeleteClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: true }>(`/api/claim-links/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["published"] });
    },
  });
}

export function useClaimEvents(linkId: string) {
  return useQuery({
    queryKey: qk.claimEvents(linkId),
    queryFn: () => apiFetch<ClaimEvent[]>(`/api/claim-links/${linkId}/events`),
    enabled: !!linkId,
  });
}

export type ResolveClaimResult =
  | { status: "claimed"; ebook: { slug: string }; entitlement?: unknown }
  | { status: "already_owned"; ebook: { slug: string } }
  | { status: "expired" }
  | { status: "revoked" }
  | { status: "limit_reached" }
  | { status: "not_found" };

export function useResolveClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
    }: {
      token: string;
      reader_id?: string;
    }): Promise<ResolveClaimResult> => {
      return apiFetch<ResolveClaimResult>(`/api/claim/${token}`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["library"] });
      qc.invalidateQueries({ queryKey: ["reading-progress"] });
    },
  });
}

// Library
export function useLibrary() {
  return useQuery({
    queryKey: qk.library(READER_ID),
    queryFn: () => apiFetch<Entitlement[]>("/api/library"),
  });
}

export function useReadingProgress() {
  return useQuery({
    queryKey: qk.readingProgress(READER_ID),
    queryFn: () => apiFetch<ReadingProgress[]>("/api/reading-progress"),
  });
}

export function useUpdateReadingProgress() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      ebook_id,
      patch,
    }: {
      ebook_id: string;
      patch: { progress?: number; current_section?: number };
    }) =>
      apiFetch<ReadingProgress>("/api/reading-progress", {
        method: "PATCH",
        body: JSON.stringify({ ebook_id, ...patch }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reading-progress"] });
    },
  });
}

// Exports
export function useExports(ebookId: string) {
  return useQuery({
    queryKey: qk.exports(ebookId),
    queryFn: () => apiFetch<ExportJob[]>(`/api/published/${ebookId}/exports`),
    enabled: !!ebookId,
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExportCreateInput) =>
      apiFetch<ExportJob>(`/api/published/${input.ebook_id}/exports`, {
        method: "POST",
        body: JSON.stringify({ format: input.format }),
      }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.exports(data.ebook_id) });
    },
  });
}

// Billing / credits
export function useCreditBalance() {
  return useQuery({
    queryKey: qk.billing.balance,
    queryFn: () => apiFetch<CreditBalance>("/api/billing/balance"),
  });
}

export function useCreditTransactions() {
  return useQuery({
    queryKey: qk.billing.txns,
    queryFn: () => apiFetch<CreditTransaction[]>("/api/billing/transactions"),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: qk.billing.plans,
    queryFn: () => apiFetch<BillingPlan[]>("/api/billing/plans"),
  });
}

export function useCreditPacks() {
  return useQuery({
    queryKey: qk.billing.packs,
    queryFn: () => apiFetch<CreditPack[]>("/api/billing/packs"),
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: qk.billing.subscription,
    queryFn: () => apiFetch<Subscription>("/api/billing/subscription"),
  });
}

export function useCreditCosts() {
  return useQuery({
    queryKey: qk.billing.costs,
    queryFn: () => apiFetch<typeof CREDIT_COSTS>("/api/billing/costs"),
  });
}

export type ChangePlanResult =
  | { subscription: Subscription; balance: CreditBalance; mock?: boolean }
  | PaymentCheckout;

export type PurchasePackResult =
  | { balance: CreditBalance; txn: CreditTransaction; mock?: boolean }
  | PaymentCheckout;

export function isPaymentCheckout(
  v: ChangePlanResult | PurchasePackResult
): v is PaymentCheckout {
  return (
    typeof v === "object" &&
    v !== null &&
    "checkout_url" in v &&
    typeof (v as PaymentCheckout).checkout_url === "string"
  );
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      plan_id: PlanId;
      payment_method?: string;
    }): Promise<ChangePlanResult> => {
      return apiFetch<ChangePlanResult>("/api/billing/change-plan", {
        method: "POST",
        body: JSON.stringify({
          plan_id: input.plan_id,
          payment_method: input.payment_method,
        }),
      });
    },
    onSuccess: (data) => {
      if (!isPaymentCheckout(data)) {
        qc.invalidateQueries({ queryKey: ["billing"] });
      }
    },
  });
}

export function usePurchaseCreditPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      pack_id: string;
      payment_method?: string;
    }): Promise<PurchasePackResult> => {
      return apiFetch<PurchasePackResult>("/api/billing/purchase-pack", {
        method: "POST",
        body: JSON.stringify({
          pack_id: input.pack_id,
          payment_method: input.payment_method,
        }),
      });
    },
    onSuccess: (data) => {
      if (!isPaymentCheckout(data)) {
        qc.invalidateQueries({ queryKey: ["billing"] });
      }
    },
  });
}

// Templates
export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: () => apiFetch<Template[]>("/api/templates"),
  });
}

// Title / CTA agents
export function useGenerateTitles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      apiFetch<{ suggestions: import("@/types").TitleSuggestion[] }>(`/api/projects/${projectId}/titles`, {
        method: "POST",
      }),
    onSuccess: (data, projectId) => {
      qc.setQueryData(qk.titles(projectId), data.suggestions);
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useGenerateCtas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      request,
    }: {
      projectId: string;
      request: CtaGenerateRequest;
    }) =>
      apiFetch<CtaGenerateResponse>(`/api/projects/${projectId}/ctas`, {
        method: "POST",
        body: JSON.stringify(request),
      }),
    onSuccess: (data, variables) => {
      qc.setQueryData(qk.ctas(variables.projectId), data.suggestions);
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useEnhanceSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      projectId,
      sectionId,
      action,
      selection_html,
      instruction,
    }: {
      projectId: string;
      sectionId: string;
      action: EnhancementAction;
      selection_html?: string | null;
      instruction?: string | null;
    }) =>
      apiFetch<{ suggestion: EnhancementSuggestion }>(
        `/api/projects/${projectId}/sections/${sectionId}/enhance`,
        {
          method: "POST",
          body: JSON.stringify({ action, selection_html, instruction }),
        },
      ),
    onSuccess: () => {
      // Do NOT invalidate sections — enhancement is non-destructive and
      // does not persist to ebook_sections.  Only invalidate billing balance.
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export { READER_ID };
