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
  ClaimCreateInput,
  CreditBalance,
  CreditPack,
  CreditTransaction,
  ExportCreateInput,
  PlanId,
  Project,
  ProjectInput,
  ProjectUpdate,
  OutlineGenerateInput,
  OutlineUpdateInput,
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
    queryFn: () => api.getOutline(projectId),
    enabled: !!projectId,
    placeholderData: keepPreviousData,
  });
}

export function useGenerateOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, input }: { projectId: string; input?: OutlineGenerateInput }) =>
      api.generateOutline(projectId, input ?? {}),
    onSuccess: (data) => {
      qc.setQueryData(qk.outline(data.project_id), data);
      qc.invalidateQueries({ queryKey: qk.project(data.project_id) });
    },
  });
}

export function useUpdateOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, patch }: { projectId: string; patch: OutlineUpdateInput }) =>
      api.updateOutline(projectId, patch),
    onSuccess: (data) => {
      qc.setQueryData(qk.outline(data.project_id), data);
    },
  });
}

export function useApproveOutline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.approveOutline(projectId),
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
    queryFn: () => api.listSections(projectId),
    enabled: !!projectId,
  });
}

export function useGenerateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ projectId, outlineSectionId }: { projectId: string; outlineSectionId: string }) =>
      api.generateSection(projectId, outlineSectionId),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.outline(data.project_id) });
      qc.invalidateQueries({ queryKey: qk.project(data.project_id) });
    },
  });
}

export function useGenerateAllSections() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (projectId: string) => api.generateAllSections(projectId),
    onSuccess: (_data, projectId) => {
      qc.invalidateQueries({ queryKey: qk.sections(projectId) });
      qc.invalidateQueries({ queryKey: qk.outline(projectId) });
      qc.invalidateQueries({ queryKey: qk.project(projectId) });
    },
  });
}

export function useUpdateSection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: SectionUpdateInput }) =>
      api.updateSection(id, patch),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.sections(data.project_id) });
    },
  });
}

// Chat
export function useMessages(projectId: string) {
  return useQuery({
    queryKey: qk.messages(projectId),
    queryFn: () => api.listMessages(projectId),
    enabled: !!projectId,
  });
}

export function useSendMessage() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendMessageInput) => api.sendMessage(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.messages(data.project_id) });
    },
  });
}

// Published
export function usePublishedEbooks() {
  return useQuery({
    queryKey: qk.published,
    queryFn: api.listPublishedEbooks,
  });
}

export function usePublishedEbook(id: string) {
  return useQuery({
    queryKey: qk.publishedEbook(id),
    queryFn: () => api.getPublishedEbook(id),
    enabled: !!id,
  });
}

export function usePublishedBySlug(slug: string) {
  return useQuery({
    queryKey: qk.publishedSlug(slug),
    queryFn: () => api.getPublishedBySlug(slug),
    enabled: !!slug,
  });
}

export function usePublishEbook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { project_id: string; is_public?: boolean }) =>
      api.publishEbook(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.published });
    },
  });
}

// Claim links
export function useClaimLinks(ebookId: string) {
  return useQuery({
    queryKey: qk.claimLinks(ebookId),
    queryFn: () => api.listClaimLinks(ebookId),
    enabled: !!ebookId,
  });
}

export function useCreateClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClaimCreateInput) => api.createClaimLink(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.claimLinks(data.ebook_id) });
    },
  });
}

export function useRevokeClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.revokeClaimLink(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: qk.claimLinks(data.ebook_id) });
      qc.invalidateQueries({ queryKey: qk.claimEvents(data.id) });
    },
  });
}

export function useDeleteClaimLink() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteClaimLink(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["published"] });
    },
  });
}

export function useClaimEvents(linkId: string) {
  return useQuery({
    queryKey: qk.claimEvents(linkId),
    queryFn: () => api.listClaimEvents(linkId),
    enabled: !!linkId,
  });
}

export function useResolveClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ token, reader_id }: { token: string; reader_id: string }) =>
      api.resolveClaim(token, reader_id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.library(READER_ID) });
      qc.invalidateQueries({ queryKey: qk.readingProgress(READER_ID) });
    },
  });
}

// Library
export function useLibrary() {
  return useQuery({
    queryKey: qk.library(READER_ID),
    queryFn: () => api.listLibrary(READER_ID),
  });
}

export function useReadingProgress() {
  return useQuery({
    queryKey: qk.readingProgress(READER_ID),
    queryFn: () => api.listReadingProgress(READER_ID),
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
    }) => api.updateReadingProgress(READER_ID, ebook_id, patch),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.readingProgress(READER_ID) });
    },
  });
}

// Exports
export function useExports(ebookId: string) {
  return useQuery({
    queryKey: qk.exports(ebookId),
    queryFn: () => api.listExports(ebookId),
    enabled: !!ebookId,
  });
}

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ExportCreateInput) => api.createExport(input),
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
// Templates
export function useTemplates() {
  return useQuery({ queryKey: qk.templates, queryFn: api.listTemplates });
}

// Title / CTA agents
export function useGenerateTitles(projectId: string) {
  return useQuery({
    queryKey: qk.titles(projectId),
    queryFn: () => api.generateTitles(projectId),
    enabled: false, // manual trigger
  });
}

export function useGenerateCtas(projectId: string) {
  return useQuery({
    queryKey: qk.ctas(projectId),
    queryFn: () => api.generateCtas(projectId),
    enabled: false, // manual trigger
  });
}

export { READER_ID };
