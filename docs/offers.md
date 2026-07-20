# Offer Library (Produk & Penawaran)

Reusable product/offer entity for Lead Magnet, Bonus Pembelian, and Ebook Berbayar.

## Product outcome

Users define what they sell once. Publiora reuses that context for onboarding, Strategy, Planner, Writer, CTA, and publish — without a long product form.

## Domain

| Concept | Notes |
|---|---|
| Offer | Internal name; UI label **Produk & Penawaran** |
| Ownership | `owned` \| `affiliate` \| `client` |
| Types | digital_product, course, service, saas, membership, webinar, physical_product, affiliate_product, other |
| Relationships | promotes, bonus_for, bundle_component, upsells_to, cross_sells_to |
| Snapshot | Server-built `OfferContextSnapshot` v1 on each project link; project context is stable until explicit sync |

## Tables / migrations

1. `20260721000001_offers_and_project_links.sql` — `offers`, `project_offer_links`, RLS, indexes
2. `20260721000002_create_project_context_v3.sql` — RPC `create_project_with_context_v3`
3. `20260721000003_published_offer_context.sql` — `published_ebooks.offer_context`

See `docs/database-schema.md` for DDL summary and `docs/api-spec.md` for endpoints.

## Create project V3

`POST /api/projects` with `version: 3`:

- `offer_context.mode`: `none` | `existing` | `quick_create`
- type-specific `business_context`
- atomic project + state + optional offer + primary link

V2 remains supported; free-text `next_offer` / `parent_product` are not auto-migrated to Offer rows.

## Sync semantics

`POST /api/projects/:id/offers/sync` is explicit and field-selective.

- May update link snapshot, Strategy fields, project niche/CTA
- Never rewrites generated HTML, outline, titles, or published content
- Stale badge is informational; not a publish blocker

## Agents

Strategist / Planner / Writer / CTA receive **accepted snapshot** via `loadPrimaryProjectOfferContext`.

- Affiliate/client wording rules in prompts
- No silent use of newer live offer data
- No fabricated product features

## E2E journeys

Playwright (auth required): `e2e/offer-library-journeys.spec.ts`

| Journey | Coverage |
|---|---|
| A | Lead + saved offer |
| B | Lead without offer |
| C | Bonus quick create |
| D | Offer patch → stale → sync dialog |
| E | Offer API + publish snapshot contract |
| F | Bonus blocked without offer |

Also: `e2e/type-aware-project-create.spec.ts` (V3 shell).

## UI routes

- `/offers` — library
- `/offers/new` — full create
- `/offers/[offerId]` — detail / edit / archive / shortcuts
- Components under `components/offers/*`
