# Publiora ↔ PayCore

Pembayaran **tidak** lewat Stripe. Gateway = **PayCore** (Duitku di belakang).

## Alur

```text
User klik Beli / Pilih plan
  → POST /api/billing/purchase-pack | change-plan
  → insert payment_orders (pending)
  → signed POST PayCore /v1/orders
  → redirect checkout_url (Duitku)
User bayar
  → Duitku → PayCore only
  → PayCore POST /api/internal/payment-events (signed)
  → fulfillPaidOrder (credits / plan) idempotent
  → user return_url /billing/return (UX only)
```

## Env

Lihat `.env.example` / `deploy/env.production.example`.

| Var | Role |
|-----|------|
| `PAYCORE_BASE_URL` | staging atau production PayCore |
| `PAYCORE_APP_ID` | slug app di PayCore (`publiora`) |
| `PAYCORE_KEY_ID` | key id mapping secret |
| `PAYCORE_APP_SECRET` | HMAC outbound |
| `PAYCORE_WEBHOOK_SECRET` | verifikasi event inbound |
| `PAYCORE_RETURN_URL` | allowlist return browser |
| `CREDITS_MOCK_TOPUP` | `true` = mock grant; `false` = wajib PayCore |

## Onboarding ke maintainer PayCore

Kirim:

- `app_id`: `publiora`
- `order_prefix`: usulan `PUB`
- `webhook_url`: `https://publiora.appvibe.biz.id/api/internal/payment-events`
- `return_url`: `https://publiora.appvibe.biz.id/billing/return`
- Product keys:
  - `publiora_pack_100` / `publiora_pack_500` / `publiora_pack_1500`
  - `publiora_plan_creator` / `publiora_plan_pro`
- Amounts IDR (MVP): pack 79k / 299k / 749k · plan 299k / 749k

## Migration

```text
supabase/migrations/20260718000009_paycore_orders.sql
```

Apply di cloud sebelum live PayCore.

## Test

1. Staging PayCore + `CREDITS_MOCK_TOPUP=false` + secrets set.
2. Beli pack → dapat `checkout_url`.
3. Bayar sandbox Duitku.
4. Webhook grant credits; `/billing/return` poll status `paid`.
5. Replay event_id → no double grant.

## Docs PayCore

`D:\Coding\paycore\docs\external\` — integration-guide, app-authentication, payment-events.
