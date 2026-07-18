// TanStack Query hooks — mock or live HTTP per NEXT_PUBLIC_USE_MOCK_API.

"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  keepPreviousData,
} from "@tanstack/react-query";

import * as api from "@/lib/mock/api";
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
import type { SendMessageInput } from "@/types/message";
import { CREDIT_COSTS } from "@/lib/billing/plans";

const READER_ID = "reader@publiora.demo";

/** Default mock unless NEXT_PUBLIC_USE_MOCK_API=false */
function shouldUseMock() {
  return process.env.NEXT_PUBLIC_USE_MOCK_API !== "false";
}

// Projects
export function useProjects() {
  return useQuery({
    queryKey: qk.projects,
    queryFn: () =>
      shouldUseMock()
        ? api.listProjects()
        : apiFetch<Project[]>("/api/projects"),
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: qk.project(id),
    queryFn: () =>
      shouldUseMock()
        ? api.getProject(id)
        : apiFetch<Project>(`/api/projects/${id}`),
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ProjectInput) =>
      shouldUseMock()
        ? api.createProject(input)
        : apiFetch<Project>("/api/projects", {
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
      shouldUseMock()
        ? api.updateProject(id, patch)
        : apiFetch<Project>(`/api/projects/${id}`, {
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
      shouldUseMock()
        ? api.deleteProject(id)
        : apiFetch<{ ok: true }>(`/api/projects/${id}`, { method: "DELETE" }),
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
    queryFn: () =>
      shouldUseMock()
        ? api.getOutline(projectId)
        : apiFetch<Outline | null>(`/api/projects/${projectId}/outline`),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
}

export function useGenerateOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input?: OutlineGenerateInput }) =>
      shouldUseMock()
        ? api.generateOutline(projectId, input ?? {})
        : apiFetch<Outline>(`/api/projects/${projectId}/outline/generate`, {
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
      shouldUseMock()
        ? api.updateOutline(projectId, patch)
        : apiFetch<Outline>(`/api/projects/${projectId}/outline`, {
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
      shouldUseMock()
        ? api.approveOutline(projectId)
        : apiFetch<Outline>(`/api/projects/${projectId}/outline/approve`, { method: "POST" }),
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
    queryFn: () =>
      shouldUseMock()
        ? api.listSections(projectId)
        : apiFetch<Section[]>(`/api/projects/${projectId}/sections`),
    enabled: !!projectId,
  });
}

export function useGenerateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, outlineSectionId }: { projectId: string; outlineSectionId: string }) =>
      shouldUseMock()
        ? api.generateSection(projectId, outlineSectionId)
        : apiFetch<Section>(`/api/projects/${projectId}/sections/generate`, {
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
      shouldUseMock()
        ? api.generateAllSections(projectId)
        : apiFetch<Section[]>(`/api/projects/${projectId}/sections/generate`, {
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
      shouldUseMock()
        ? api.updateSection(id, patch)
        : apiFetch<Section>(`/api/projects/${projectId}/sections/${id}`, {
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
    queryFn: () =>
      shouldUseMock()
        ? api.listMessages(projectId)
        : apiFetch<ChatMessage[]>(`/api/projects/${projectId}/messages`),
    enabled: !!projectId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) =>
      shouldUseMock()
        ? api.sendMessage(input)
        : apiFetch<ChatMessage>(`/api/projects/${input.project_id}/chat`, {
            method: "POST",
            body: JSON.stringify({ content: input.content, agent: input.agent }),
          }),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.messages(data.project_id) });
    },
  });
}

// Published
export function usePublishedEbooks() {
  return useQuery({
    queryKey: qk.published,
    queryFn: () =>
      shouldUseMock()
        ? api.listPublishedEbooks()
        : apiFetch<PublishedEbook[]>("/api/published"),
  });
}

export function usePublishedEbook(id: string) {
  return useQuery({
    queryKey: qk.publishedEbook(id),
    queryFn: () =>
      shouldUseMock()
        ? api.getPublishedEbook(id)
        : apiFetch<PublishedEbook>(`/api/published/${id}`),
    enabled: !!id,
  });
}

export function usePublishedBySlug(slug: string) {
  return useQuery({
    queryKey: qk.publishedSlug(slug),
    queryFn: () =>
      shouldUseMock()
        ? api.getPublishedBySlug(slug)
        : apiFetch<PublishedEbook>(`/api/published/by-slug/${slug}`),
    enabled: !!slug,
  });
}

export function usePublishEbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { project_id: string; is_public?: boolean }) =>
      shouldUseMock()
        ? api.publishEbook(input)
        : apiFetch<PublishedEbook>(`/api/projects/${input.project_id}/publish`, {
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
    queryFn: () =>
      shouldUseMock()
        ? api.listClaimLinks(ebookId)
        : apiFetch<ClaimLink[]>(`/api/published/${ebookId}/claim-links`),
    enabled: !!ebookId,
  });
}

export function useCreateClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClaimCreateInput) =>
      shouldUseMock()
        ? api.createClaimLink(input)
        : apiFetch<ClaimLink>(`/api/published/${input.ebook_id}/claim-links`, {
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
      shouldUseMock()
        ? api.revokeClaimLink(id)
        : apiFetch<ClaimLink>(`/api/claim-links/${id}`, {
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
      shouldUseMock()
        ? api.deleteClaimLink(id)
        : apiFetch<{ ok: true }>(`/api/claim-links/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["published"] });
    },
  });
}

export function useClaimEvents(linkId: string) {
  return useQuery({
    queryKey: qk.claimEvents(linkId),
    queryFn: () =>
      shouldUseMock()
        ? api.listClaimEvents(linkId)
        : apiFetch<ClaimEvent[]>(`/api/claim-links/${linkId}/events`),
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
      reader_id,
    }: {
      token: string;
      reader_id: string;
    }): Promise<ResolveClaimResult> => {
      if (shouldUseMock()) {
        return (await api.resolveClaim(token, reader_id)) as ResolveClaimResult;
      }
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
    queryFn: () =>
      shouldUseMock()
        ? api.listLibrary(READER_ID)
        : apiFetch<Entitlement[]>("/api/library"),
  });
}

export function useReadingProgress() {
  return useQuery({
    queryKey: qk.readingProgress(READER_ID),
    queryFn: () =>
      shouldUseMock()
        ? api.listReadingProgress(READER_ID)
        : apiFetch<ReadingProgress[]>("/api/reading-progress"),
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
      shouldUseMock()
        ? api.updateReadingProgress(READER_ID, ebook_id, patch)
        : apiFetch<ReadingProgress>("/api/reading-progress", {
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
    queryFn: () =>
      shouldUseMock()
        ? api.listExports(ebookId)
        : apiFetch<ExportJob[]>(`/api/published/${ebookId}/exports`),
    enabled: !!ebookId,
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExportCreateInput) =>
      shouldUseMock()
        ? api.createExport(input)
        : apiFetch<ExportJob>(`/api/published/${input.ebook_id}/exports`, {
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
    queryFn: () =>
      shouldUseMock()
        ? api.getCreditBalance()
        : apiFetch<CreditBalance>("/api/billing/balance"),
  });
}

export function useCreditTransactions() {
  return useQuery({
    queryKey: qk.billing.txns,
    queryFn: () =>
      shouldUseMock()
        ? api.listCreditTransactions()
        : apiFetch<CreditTransaction[]>("/api/billing/transactions"),
  });
}

export function usePlans() {
  return useQuery({
    queryKey: qk.billing.plans,
    queryFn: () =>
      shouldUseMock()
        ? api.listPlans()
        : apiFetch<BillingPlan[]>("/api/billing/plans"),
  });
}

export function useCreditPacks() {
  return useQuery({
    queryKey: qk.billing.packs,
    queryFn: () =>
      shouldUseMock()
        ? api.listCreditPacks()
        : apiFetch<CreditPack[]>("/api/billing/packs"),
  });
}

export function useSubscription() {
  return useQuery({
    queryKey: qk.billing.subscription,
    queryFn: () =>
      shouldUseMock()
        ? api.getSubscription()
        : apiFetch<Subscription>("/api/billing/subscription"),
  });
}

export function useCreditCosts() {
  return useQuery({
    queryKey: qk.billing.costs,
    queryFn: () =>
      shouldUseMock()
        ? api.getCreditCosts()
        : apiFetch<typeof CREDIT_COSTS>("/api/billing/costs"),
  });
}

export function useChangePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (plan_id: PlanId) =>
      shouldUseMock()
        ? api.changePlan(plan_id)
        : apiFetch<{ subscription: Subscription; balance: CreditBalance }>(
            "/api/billing/change-plan",
            {
              method: "POST",
              body: JSON.stringify({ plan_id }),
            }
          ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

export function usePurchaseCreditPack() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (pack_id: string) =>
      shouldUseMock()
        ? api.purchaseCreditPack(pack_id)
        : apiFetch<{ balance: CreditBalance; txn: CreditTransaction }>(
            "/api/billing/purchase-pack",
            {
              method: "POST",
              body: JSON.stringify({ pack_id }),
            }
          ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing"] });
    },
  });
}

// Templates
export function useTemplates() {
  return useQuery({
    queryKey: qk.templates,
    queryFn: () =>
      shouldUseMock()
        ? api.listTemplates()
        : apiFetch<Template[]>("/api/templates"),
  });
}

// Title / CTA agents
export function useGenerateTitles() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      shouldUseMock()
        ? api.generateTitles(projectId)
        : apiFetch<string[]>(`/api/projects/${projectId}/titles`, {
            method: "POST",
          }),
    onSuccess: (data, projectId) => {
      qc.setQueryData(qk.titles(projectId), data);
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useGenerateCtas() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) =>
      shouldUseMock()
        ? api.generateCtas(projectId)
        : apiFetch<string[]>(`/api/projects/${projectId}/ctas`, {
            method: "POST",
          }),
    onSuccess: (data, projectId) => {
      qc.setQueryData(qk.ctas(projectId), data);
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export function useEnhanceSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      projectId,
      sectionId,
    }: {
      projectId: string;
      sectionId: string;
    }) => {
      if (shouldUseMock()) {
        // Mock: soft polish via update path not available — no-op return current section
        const sections = await api.listSections(projectId);
        const section = sections.find((s) => s.id === sectionId);
        if (!section) throw new Error("Section not found");
        return section;
      }
      return apiFetch<Section>(
        `/api/projects/${projectId}/sections/${sectionId}/enhance`,
        { method: "POST" }
      );
    },
    onSuccess: (data) => {
      if (data?.project_id) {
        qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
      }
      qc.invalidateQueries({ queryKey: qk.billing.balance });
    },
  });
}

export { READER_ID };
