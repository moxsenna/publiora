# Offer Library — mobile E2E, screenshots, cloud migration status

Date: 2026-07-21  
Branch: `feat/offer-library`  
Local app: `http://127.0.0.1:3005`  
Local Supabase: `http://127.0.0.1:54321` (migrations applied via `supabase db reset`)

## Playwright results

### Chromium (desktop)

```text
npx playwright test e2e/offer-library-journeys.spec.ts e2e/type-aware-project-create.spec.ts --project=chromium
→ 11 passed
```

### Mobile (Pixel 5 project)

```text
npx playwright test e2e/offer-library-journeys.spec.ts e2e/type-aware-project-create.spec.ts --project=mobile
→ 11 passed (21.3s)
```

Includes Journeys A–F and V3 wizard shell. Mobile strategy assertions open **Lihat brief** sheet so offer context is visible (desktop rail is `hidden` on mobile).

### Screenshots

Captured by `e2e/capture-offer-library-screenshots.spec.ts`:

| File | Surface |
|---|---|
| `docs/e2e-evidence/offer-library-2026-07-21/desktop-offers-list.png` | Offer library list |
| `docs/e2e-evidence/offer-library-2026-07-21/desktop-offers-new.png` | Offer create form |
| `docs/e2e-evidence/offer-library-2026-07-21/desktop-wizard-tujuan.png` | Wizard type step |
| `docs/e2e-evidence/offer-library-2026-07-21/desktop-wizard-ide-produk.png` | Wizard Ide & Produk |
| `docs/e2e-evidence/offer-library-2026-07-21/mobile-offers-list.png` | Mobile offer list |
| `docs/e2e-evidence/offer-library-2026-07-21/mobile-offers-new.png` | Mobile offer create |
| `docs/e2e-evidence/offer-library-2026-07-21/mobile-wizard-tujuan.png` | Mobile wizard type |
| `docs/e2e-evidence/offer-library-2026-07-21/mobile-wizard-ide-produk.png` | Mobile Ide & Produk |

## Cloud / VPS migration status

Cloud project used by production container: `qluqhyfwpdknngxolsvi.supabase.co`  
(`docker exec publiora-web printenv NEXT_PUBLIC_SUPABASE_URL`)

### Final cloud schema verification (after migration confirmed)

Service role probe on `qluqhyfwpdknngxolsvi.supabase.co`:

| Object | Status |
|---|---|
| `public.offers` | **ok** |
| `public.project_offer_links` | **ok** |
| `published_ebooks.offer_context` | **ok** |
| `create_project_with_context_v3` | **present** (returns `not_authenticated` without session — expected) |
| OpenAPI paths | includes `/offers` and `project_offer_links` |

Authenticated production smoke (ephemeral user, cleaned up):

```text
POST /api/offers → 201
POST /api/projects (V3 lead + existing offer) → 201
GET  /api/projects/:id/offers → 200
  links_count=1
  relationship=promotes
  snapshot_name set
  source_is_newer=false
```

Conclusion: **Offer Library is fully live on production DB + VPS app.**

### VPS app deploy status

| Item | Status |
|---|---|
| Code on `/opt/publiora` | `feat/offer-library` (incl. `/offers` routes) |
| Container | `publiora-web` healthy |
| `GET /offers` | 200 |
| `GET /api/offers` unauth | 401 |
| `GET/POST /api/offers` authed | 500 until migration applied |

### Package ready to apply

`scripts/apply-offer-migrations-cloud.sql` (452 lines) concatenates:

1. `20260721000001_offers_and_project_links.sql`
2. `20260721000002_create_project_context_v3.sql`
3. `20260721000003_published_offer_context.sql`

Uploaded on VPS as `/tmp/apply-offer-migrations-cloud.sql`.

### Why not auto-applied

- `SUPABASE_SERVICE_ROLE_KEY` cannot run DDL / `psql` (documented in `scripts/apply-migrations-remote.md`).
- No `SUPABASE_ACCESS_TOKEN` / `supabase link` session available in this agent environment.
- No database password / `DATABASE_URL` in `.env` or VPS `/opt/publiora/.env`.

### Operator apply (required for production)

**Option A — SQL Editor (recommended)**

1. Open https://supabase.com/dashboard/project/qluqhyfwpdknngxolsvi/sql/new
2. Paste `scripts/apply-offer-migrations-cloud.sql` → Run
3. Verify Table Editor shows `offers`, `project_offer_links`, and `published_ebooks.offer_context`

**Option B — CLI**

```bash
npx supabase login
npx supabase link --project-ref qluqhyfwpdknngxolsvi
npx supabase db push
```

**Option C — psql with database password**

```bash
psql "<connection-string>" -f scripts/apply-offer-migrations-cloud.sql
```

### Deploy note

Git merge ≠ live VPS. After cloud migrations:

1. Ship app container from `feat/offer-library` (see `deploy/AGENT-DEPLOY.md`)
2. Smoke `/offers`, create Lead/Bonus with offer, strategy stale/sync, publish

## CI

No remote CI run was available from this workspace. Local gates:

| Gate | Result |
|---|---|
| `npm test` | 592 pass |
| Playwright chromium offer suite | 11 pass |
| Playwright mobile offer suite | 11 pass |
| Screenshot capture chromium+mobile | 2 pass / 8 PNGs |
