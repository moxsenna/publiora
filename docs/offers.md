# Offer Library (Produk & Penawaran)

Reusable product/offer entity for Lead Magnet, Bonus Pembelian, and Ebook Berbayar.

## Tables

- `offers` — owner-scoped product context
- `project_offer_links` — project relationship + accepted `context_snapshot`
- `published_ebooks.offer_context` — immutable publish snapshot

## Create project V3

`POST /api/projects` with `version: 3` and:

- `offer_context.mode`: `none` | `existing` | `quick_create`
- type-specific `business_context`
- atomic RPC: `create_project_with_context_v3`

V2 create remains supported.

## Sync

`POST /api/projects/:id/offers/sync` is explicit and field-selective. Never rewrites generated sections or published content.

## Agents

Strategist / Planner / Writer / CTA receive **accepted snapshot** via `loadPrimaryProjectOfferContext`, never silent live offer edits.
