# signup-attribution.md — Attribution, lifecycle, consent & segments

Acquisition source and reader→creator lifecycle for every profile, plus the
internal (service-role-only) audience segmentation and its exporting tooling.

## 1. `signup_origin` — final, immutable

Stored on `profiles.signup_origin`. Allowed values:

```text
unattributed   — new profile before any context completes (transient default)
landing_page   — signed up from the marketing landing context
claim_link     — signed up from a claim (ebook bonus) context
direct_app     — signed up directly on the app, no context
legacy_unknown — historical profile backfilled before this feature (never inferred)
admin_created  — admin/ops created row
```

Rules (enforced in `public.complete_signup_context_v1`):

- **Immutable**: once set to anything ≠ `unattributed`, no app path overwrites it.
- Normal client code **cannot** update it (only the security-definer RPC moves
  origin off `unattributed`, and only when the context hash is valid).
- Project creation, claim, subscription, marketing-consent toggles **never**
  change origin (tested in `app/api/profile/marketing-preferences/route.test.ts`).

## Signup contexts — hash only, one-time

`public.signup_contexts` carries a short-lived token from landing/claim pages
through signup. The DB only ever stores `token_hash` = **SHA-256 of the token** —
the raw token never reaches the DB (`lib/auth/signup-context.ts` hashing + tests).
A context is usable once (`consumed_by_user_id` / `consumed_at`), expires, and
completes via `complete_signup_context_v1` as soon as a session exists.

## Lifecycle timestamps (one-shot, DB triggers)

| Column | Set when | Rule |
|---|---|---|
| `reader_activated_at` | first entitlement insert | `coalesce(existing, new)` |
| `creator_activated_at` | first project insert | `coalesce(existing, new)` |
| `creator_subscribed_at` | first `creator`/`pro` subscription in `active`/`trialing` | cancel does not erase history |

All three use DB triggers (`migrations/20260807000001_...sql`) so every writer
(API, tests, admin) activates once, in order.

## Marketing consent

- Default **unchecked**; checkbox optional at signup.
- Source in `('landing_signup','claim_signup','account_settings','admin_import')`.
- `PATCH /api/profile/marketing-preferences` toggles opt-in/out from
  **Settings → Tagihan** — never touches origin/lifecycle columns.
- Non-consent users are **never included** in audience exports (see below).

## Internal segmentation — `public.internal_user_audience_v1`

One row per user. **Revoked from `anon`/`authenticated`; service role only.**
Columns: identity, attribution, lifecycle, counts (entitlements, projects,
publications), current plan/subscription, consent, `last_known_activity_at`,
and `derived_segment` — no content, briefs, AI conversations, payment
credentials, or reading text.

`derived_segment` priority (top wins):

| Priority | Condition | Segment |
|---|---|---|
| 1 | claim + paid creator | `claim_reader_became_paid_creator` |
| 2 | claim + creator | `claim_reader_became_creator` |
| 3 | claim origin (incl. not yet activated) | `claim_reader_only` |
| 4 | landing + creator | `landing_creator_active` |
| 5 | landing (no activation) | `landing_creator_prospect` |
| 6 | `direct_app` origin | `direct_creator` |
| 7 | everything else | `legacy_unclassified` |

Type mirror: `types/audience.ts`. Contract test keeps SQL priority, literal
set and export script in sync (`supabase/__tests__/internal-audience-view.test.mjs`).

## Export script

```bash
node scripts/export-audience.mjs --segment claim_reader_only --format csv --output .local/audience/claim-reader-only.csv
```

Options: `--segment` (required, 7 canonical values), `--format csv|json`
(default csv), `--output` (default stdout), `--count-only` (all users in the
segment, number only — **never emails**).

Safety:

- requires `SUPABASE_SERVICE_ROLE_KEY`; refuses to run without it;
- **default export filters `marketing_email_consent = true`**;
- the key is never logged or echoed in errors;
- output directory `.local/` is git-ignored;
- invalid segment / missing segment rejected before any query.

## Verification

- Unit: `app/api/auth/me/route.test.ts`, `scripts/export-audience.test.mjs`,
  `supabase/__tests__/internal-audience-view.test.mjs`, `lib/auth/*.test.ts`.
- E2E: `e2e/attribution-lifecycle.spec.ts` (preview journey, reader-domain claim
  links), `e2e/premium-ui.spec.ts` (dashboard surface).
- DB matrix (origins, contexts, lifecycle, claim, view) lives in
  `docs/superpowers/plans/publiora-creator-preview-claim-attribution-lifecycle-implementation-plan.md` §22.