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

## Onboarding status (staging)

Sudah di PayCore staging:

| Item | Value |
|------|--------|
| `app_id` | `publiora` |
| `order_prefix` | `PUB` |
| Merchant | `mp_appvibe_duitku_v2` (`api_variant=v2`) |
| `webhook_url` | `https://publiora.appvibe.biz.id/api/internal/payment-events` |
| return allowlist | prod + `http://127.0.0.1:3005/billing/return` |
| Secrets Worker | `PUBLIORA_APP_KEY_ID` / `APP_SECRET` / `WEBHOOK_SECRET` |
| Key id staging | `pk_staging_publiora_01` |

Product keys (body order):

- `publiora_pack_100` / `publiora_pack_500` / `publiora_pack_1500`
- `publiora_plan_creator` / `publiora_plan_pro`

Amounts IDR (MVP): pack 79k / 299k / 749k · plan 299k / 749k

### Duitku V2 vs POP

- App default = **Duitku V2** → create order **wajib** `payment_method`.
- Merchant code + API key **sama** untuk POP dan V2 (env global PayCore).
- Smoke 2026-07-18:
  - HMAC app auth OK
  - POP createInvoice **201**
  - V2 + **`BR` / `NQ`** **SUCCESS** + `checkout_url`
  - V2 + **`SQ` (Nusapay)** gagal di sandbox ini — channel tidak available
- Publiora default method: **`BR`** (BRI VA). Override: `PAYCORE_DEFAULT_PAYMENT_METHOD=NQ` untuk QRIS Nobu.
- Customer `phone` selalu dikirim (fallback `081234567890`) agar halaman V2 sandbox tidak NRE.

### Sandbox UI: "Object reference not set to an instance of an object."

Ini sering **bug halaman demo Duitku**, bukan gagal create order di PayCore.

**Order tetap valid jika:**
- Muncul **Virtual Account Number** (contoh BRI `1308…`)
- PayCore `payment_status=pending` + ada `checkout_url`

**Cara lanjut di sandbox VA:**
1. Abaikan banner Object reference kalau nomor VA sudah tampil.
2. Cari tombol **simulate payment / bayar / success** di area demo (bukan cuma lihat nomor).
3. Callback harus ke PayCore: staging `…/webhooks/duitku` atau prod `https://pay.appvibe.biz.id/webhooks/duitku`.
4. Saldo Publiora naik **setelah webhook** — bukan dari halaman return saja.

Kalau **tidak ada nomor VA sama sekali** → cek method (`BR`/`NQ`, bukan `SQ`) dan merchant sandbox.

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
