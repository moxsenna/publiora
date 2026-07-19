# Publiora

AI-assisted marketing ebook creation: **Strategy → Outline → Write → Review → Publish**.

## Stack

- Next.js 16 (App Router) + React 19
- Supabase Auth / Postgres
- Vitest + Playwright
- Docker production deploy (`/opt/publiora` on VPS)

## Setup

```bash
cp .env.example .env.local
# fill NEXT_PUBLIC_SUPABASE_URL, ANON/SERVICE keys, AI_* provider vars
npm install
npm run dev
```

### Database

Apply Supabase migrations under `supabase/migrations/` (including CTA fields migration `20260719000001_workflow_review_cta.sql`).

### Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local Next dev server |
| `npm test` | Unit tests (Vitest) |
| `npm run build` | Production build |
| `npm run test:e2e:smoke` | Playwright public smoke |
| `npm run test:e2e` | Full Playwright (needs `E2E_EMAIL` / `E2E_PASSWORD`) |
| `node scripts/seed-e2e-workflow-project.mjs` | Seed multi-stage e2e project |

### E2E auth

Playwright injects Supabase session cookies (`@supabase/ssr` format). See `e2e/helpers/auth.ts` and `docs/e2e-evidence/README.md`.

### Docs

- `docs/prd.md` / `docs/mvp-scope.md` — product scope
- `docs/user-flows.md` — workflow-first UX
- `docs/ai-prompts.md` — agent contracts
- `deploy/AGENT-DEPLOY.md` — VPS rebuild (git push ≠ live)

## License

Private.
