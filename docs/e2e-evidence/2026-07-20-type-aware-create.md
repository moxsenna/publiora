# Type-aware project creation — live API evidence

- When: 2026-07-20T16:58:24.690Z
- Base: http://127.0.0.1:3005
- Result: **51 passed / 0 failed** (51 checks)

## Checks

- PASS `server health` — 200
- PASS `create user` — typeaware_1784566696505@gmail.com
- PASS `sign in`
- PASS `reject invalid template` — status=400
- PASS `reject invalid CTA URL` — status=400
- PASS `reject type/context mismatch` — status=400
- PASS `create lead_magnet` — status=201 title=Panduan: Lead Generation B2B
- PASS `lead_magnet ebook_type` — lead_magnet
- PASS `lead_magnet title present` — Panduan: Lead Generation B2B
- PASS `lead cta_goal seeded`
- PASS `lead cta_url seeded`
- PASS `lead_magnet strategy load` — 200
- PASS `lead_magnet schema v3` — 3
- PASS `lead_magnet topic seeded` — Lead Generation B2B
- PASS `lead_magnet audience seeded` — Founder SaaS tahap awal
- PASS `lead_magnet no fabricated core_promise` — null
- PASS `lead_magnet no fabricated unique_angle` — null
- PASS `lead funnel_goal seeded` — Mengumpulkan email
- PASS `lead traffic_source seeded` — Konten organik
- PASS `lead next_offer mapped` — Audit marketing gratis
- PASS `lead_magnet readiness partial` — 71
- PASS `lead_magnet missing core_promise` — ["core_promise","unique_angle"]
- PASS `create bonus_product` — status=201 title=Panduan: Pilih produk TikTok Affiliate
- PASS `bonus_product ebook_type` — bonus_product
- PASS `bonus_product title present` — Panduan: Pilih produk TikTok Affiliate
- PASS `bonus_product strategy load` — 200
- PASS `bonus_product schema v3` — 3
- PASS `bonus_product topic seeded` — Pilih produk TikTok Affiliate
- PASS `bonus_product audience seeded` — Founder SaaS tahap awal
- PASS `bonus_product no fabricated core_promise` — null
- PASS `bonus_product no fabricated unique_angle` — null
- PASS `bonus parent product seeded` — Kelas TikTok Affiliate untuk Pemula
- PASS `bonus role seeded` — implementation_aid
- PASS `bonus usage_moment seeded` — Setelah modul riset produk
- PASS `bonus_product readiness partial` — 68
- PASS `bonus_product missing core_promise` — ["core_promise","unique_angle"]
- PASS `create sellable_ebook` — status=201 title=Panduan: Framework content engine premium
- PASS `sellable_ebook ebook_type` — sellable_ebook
- PASS `sellable_ebook title present` — Panduan: Framework content engine premium
- PASS `sellable_ebook strategy load` — 200
- PASS `sellable_ebook schema v3` — 3
- PASS `sellable_ebook topic seeded` — Framework content engine premium
- PASS `sellable_ebook audience seeded` — Founder SaaS tahap awal
- PASS `sellable_ebook no fabricated core_promise` — null
- PASS `sellable_ebook no fabricated unique_angle` — null
- PASS `sellable positioning seeded` — premium_authority
- PASS `sellable objections seeded` — ["Pembeli merasa informasi serupa tersedia gratis","Pembeli ragu ebook cukup praktis"]
- PASS `sellable_ebook readiness partial` — 69
- PASS `sellable_ebook missing core_promise` — ["core_promise","unique_angle"]
- PASS `legacy create still works` — status=201
- PASS `cleanup` — 4 projects + user

## Coverage

- Lead Magnet V2 create + Strategy V3 seed
- Bonus Pembelian V2 create + parent/role/usage seed
- Ebook Berbayar V2 create + positioning/objections seed
- Invalid template / CTA URL / type mismatch rejected
- Legacy flat create still accepted
- No fabricated core_promise / unique_angle

## Related verification (Task 18)

| Command | Result |
|---|---|
| `npm test` | **548 passed** / 34 files |
| `npx tsc --noEmit` | clean |
| `npm run build` | success (earlier this session) |
| `BASE_URL=http://127.0.0.1:3005 node scripts/verify-type-aware-create.mjs` | **51/51 PASS** (this file) |
| `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3005 npx playwright test e2e/smoke-public.spec.ts --project=chromium` | **6/6 PASS** |
| `e2e/type-aware-project-create.spec.ts` | added; **skipped** without `E2E_EMAIL`/`E2E_PASSWORD` |
| Wizard component tests | **14/14 PASS** (`components/projects/new/__tests__`) |

Journey A/B/C browser UI automation is ready in `e2e/type-aware-project-create.spec.ts` once E2E creds exist in `.env.e2e.local`. Live API script already covers create + Strategy seed for all three types without spending AI credits.
