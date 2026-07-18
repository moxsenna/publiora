# Publiora MVP E2E Checklist

## Cloud verified (2026-07-18)
- Project: `qluqhyfwpdknngxolsvi.supabase.co`
- Next: `http://127.0.0.1:3005` with `USE_MOCK_API=false` + `NEXT_PUBLIC_USE_MOCK_API=false`
- AI: 9router `gcli/grok-4.5-high` (fallback `ag/gemini-pro-agent`)
- Script: `node scripts/e2e-live.mjs` → **passed=27 failed=0**

## Prerequisites
- [x] Migrations applied on **cloud** (profiles/projects/credits REST 200)
- [x] `.env.local`: URL + publishable + **service_role** + AI router key
- [x] Mock flags **false**
- [x] `npx tsc --noEmit` 0
- [x] `npx next build` 0 (earlier on branch)
- [x] Live E2E 27/27 cloud

## Auth
- [x] Admin createUser + password grant (bypass email rate limit)
- [x] Free plan grant 50 credits on signup trigger
- [x] `/api/auth/me` 401 unauth / 200 auth

## Core loop
- [x] Create project 201
- [x] Chat strategist ×2
- [x] Outline generate → balance 45
- [x] Outline approve
- [x] Sections ×4 → balance 5
- [x] 5th section → 402 insufficient_credits
- [x] Top-up pack_100
- [x] 5th section after top-up
- [x] Publish slug
- [x] Claim link → user B claimed
- [x] Library / read slug / reading progress
- [x] B cannot access A project (404)

## Still for public prod host
- [ ] Deploy Cloudflare Pages (`npm run deploy`) + env on host
- [ ] Supabase Auth Site URL + Redirect URLs = prod domain
- [ ] Optional: anon JWT + rotate service_role/AI keys (exposed in chat)
- [ ] Optional: Stripe real payments (`CREDITS_MOCK_TOPUP=false`)
