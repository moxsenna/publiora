# Baseline: Workflow-First Workspace (2026-07-19)

> Recorded before any production code changes for the workflow-first UI refactor.

## Environment

- **Branch:** `feat/workflow-first-workspace`
- **Commit:** `df58269` (`fix(env): treat empty env strings as unset; faster AI model timeout`)
- **Node:** v22 (inferred from lockfile/Next 16.2.6)
- **Next.js:** 16.2.6 (Turbopack)
- **React:** 19.2.4
- **Test runner:** Vitest 4.1.8

## Build Results

| Command | Result | Notes |
|---------|--------|-------|
| `npm install` | Pass | 224 packages, 3 vulnerabilities (2 moderate, 1 high) |
| `npm test` | **29 passed, 0 failed (4 test files)** | All green |
| `npm run build` | **Pass** | 52 routes compiled. First run transiently crashed during page data collection (Windows worker exit code 3221226505); second run succeeded fully. Transient crash is a known Turbopack worker issue on Windows -- reproducible but intermittent. |

### Test Details

```
__tests__/design/tokens.test.ts      — 10 tests passed
__tests__/validations/auth.property4.test.ts — 4 tests passed
__tests__/validations/auth.property1.test.ts — 11 tests passed
__tests__/ai/provider.fallback.test.ts — 4 tests passed
```

### Build Output

```
Route (app)
┌ ○ /                         (static)
├ ○ /_not-found               (static)
├ ○ /billing/return           (static)
├ ○ /dashboard                (static)
├ ○ /forgot-password          (static)
├ ○ /library                  (static)
├ ○ /login                    (static)
├ ○ /projects                 (static)
├ ○ /projects/new             (static)
├ ○ /register                 (static)
├ ○ /settings/billing         (static)
├ ƒ /projects/[id]            (dynamic)
├ ƒ /published/[id]           (dynamic)
├ ƒ /read/[slug]              (dynamic)
├ ƒ /claim/[token]            (dynamic)
└ ƒ /api/* (22 routes)        (dynamic)
```

## E2E / Playwright

- **Playwright config:** Not present (no `playwright.config.*` file).
- **E2E script in package.json:** None.
- **Action:** No E2E suite to run. Playwright is installed as a dev dependency for future testing.

## Screenshots (Landing Page)

Captured from local dev server (`npm run dev` on `http://localhost:3000`):

- `baseline-desktop-home.png` — Desktop (1440x900) landing page
- `baseline-mobile-home.png` — Mobile (375x812) landing page
- `baseline-desktop-login.png` — Desktop login page

**Limitation:** Authenticated workspace pages (dashboard, projects, library) could not be captured because the local environment lacks valid Supabase credentials in `.env.local`. The `.env.example` provides configuration templates but no actual keys for local development. These screenshots represent the unauthenticated public surface of the app.

## Next.js 16 Docs Inventory

The `node_modules/next/dist/docs/` directory is present with comprehensive documentation:

```
node_modules/next/dist/docs/
├── index.md
├── 01-app/
│   ├── 01-getting-started/     (19 files: installation, layouts, server components, data fetching, etc.)
│   ├── 02-guides/              (40+ files: auth, caching, forms, redirecting, AI agents, etc.)
│   ├── 03-api-reference/       (API reference docs)
│   └── 04-glossary.md
├── 02-pages/                   (Pages Router docs)
├── 03-architecture/            (Architecture docs)
└── 04-community/               (Community docs)
```

Key guides relevant to this refactor:
- `01-app/01-getting-started/03-layouts-and-pages.md`
- `01-app/01-getting-started/05-server-and-client-components.md`
- `01-app/01-getting-started/15-route-handlers.md`
- `01-app/02-guides/ai-agents.md`
- `01-app/02-guides/forms.md`
- `01-app/02-guides/redirecting.md`

## Security Notes

- No API keys, secrets, or tokens are present in this baseline document.
- The `.env.example` file is checked in (with placeholder values); no actual `.env.local` exists in the worktree.

## Conclusion

The baseline is clean. All tests pass, the build succeeds (with a documented transient Windows worker crash that recovers on retry), and no E2E suite exists. Ready to begin implementation.
