// Query keys + helpers for TanStack Query.

export const qk = {
  projects: ["projects"] as const,
  project: (id: string) => ["projects", id] as const,
  outline: (projectId: string) => ["projects", projectId, "outline"] as const,
  sections: (projectId: string) => ["projects", projectId, "sections"] as const,
  messages: (projectId: string) => ["projects", projectId, "messages"] as const,
  strategy: (projectId: string) => ["projects", projectId, "strategy"] as const,
  published: ["published"] as const,
  publishedEbook: (id: string) => ["published", id] as const,
  publishedSlug: (slug: string) => ["published", "slug", slug] as const,
  claimLinks: (ebookId: string) => ["published", ebookId, "claim-links"] as const,
  claimEvents: (linkId: string) => ["claim-links", linkId, "events"] as const,
  library: (reader_id: string) => ["library", reader_id] as const,
  readingProgress: (reader_id: string) => ["reading-progress", reader_id] as const,
  exports: (ebookId: string) => ["published", ebookId, "exports"] as const,
  billing: {
    balance: ["billing", "balance"] as const,
    txns: ["billing", "txns"] as const,
    plans: ["billing", "plans"] as const,
    packs: ["billing", "packs"] as const,
    subscription: ["billing", "subscription"] as const,
    costs: ["billing", "costs"] as const,
  },
  templates: ["templates"] as const,
  templatesByType: (ebookType: string) =>
    ["templates", ebookType] as const,
  me: ["auth", "me"] as const,
  titles: (projectId: string) => ["projects", projectId, "titles"] as const,
  ctas: (projectId: string) => ["projects", projectId, "ctas"] as const,
};
