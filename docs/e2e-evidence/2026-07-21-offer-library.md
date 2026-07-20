# E2E evidence — Offer Library (2026-07-21)

Branch: `feat/offer-library`  
Worktree: `.worktrees/feat-offer-library`

## Specs added/updated

| File | Role |
|---|---|
| `e2e/offer-library-journeys.spec.ts` | Journeys A–F (auth-gated) |
| `e2e/type-aware-project-create.spec.ts` | V3 wizard shell (auth-gated) |

## Journey matrix

| ID | Title | Spec |
|---|---|---|
| A | Lead Magnet + saved offer → Strategy shows linked context | `offer-library-journeys` |
| B | Lead Magnet without offer → Strategy usable | both specs |
| C | Bonus quick create parent → project linked | `offer-library-journeys` |
| D | Patch offer → stale badge → sync dialog | `offer-library-journeys` |
| E | Offer API + publish snapshot contract | `offer-library-journeys` |
| F | Bonus blocked without offer | `offer-library-journeys` |

## How to run

```bash
# from worktree
npm run build
# requires .env.local / .env.e2e.local with:
# E2E_EMAIL, E2E_PASSWORD, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
# Apply migrations 20260721000001..003 on the target Supabase first.
npx playwright test e2e/offer-library-journeys.spec.ts e2e/type-aware-project-create.spec.ts --project=chromium
npx playwright test e2e/offer-library-journeys.spec.ts --project=mobile
```

Without credentials, Playwright **skips** these suites cleanly (same pattern as existing e2e).

## Local verification (this session)

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` (vitest) | 40 files / 592 tests pass |
| Playwright A–F against live auth | not executed here (no `.env.e2e.local` in worktree) |

## Desktop / mobile UI evidence

Existing baselines remain under `docs/baseline-*.png` and `docs/baseline-workspace/`.  
Offer Library screenshots should be captured after migrations + credentials:

```bash
npx playwright test e2e/offer-library-journeys.spec.ts --project=chromium --project=mobile
# on failure Playwright stores screenshots under test-results/
```

## Docs aligned

- `docs/api-spec.md` — V3 create + Offer endpoints + sync/publish
- `docs/database-schema.md` — offers, links, RPC V3, published.offer_context
- `docs/user-flows.md` — 3-step wizard + library + sync
- `docs/offers.md` — feature summary + journey index
