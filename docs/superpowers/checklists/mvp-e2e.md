# Publiora MVP E2E Checklist

> Verified **2026-07-18** on branch `feat/full-mvp-backend` against **local Supabase** + Next `http://127.0.0.1:3005` with `NEXT_PUBLIC_USE_MOCK_API=false`.

## Prerequisites
- [x] Migrations applied (docker exec psql; 7 files EXIT 0; 16 public tables + spend/grant RPCs)
- [x] `.env.local` local Supabase URL + anon + service role
- [x] `GEMINI_API_KEY` optional (agent fallbacks used)
- [x] `NEXT_PUBLIC_USE_MOCK_API=false`
- [x] `npx next build` EXIT 0 (BUILD_ID present, API routes listed)
- [x] `npx tsc --noEmit` EXIT 0
- [x] Dev server live
- [x] `node scripts/e2e-live.mjs` → **passed=27 failed=0**

## Auth
- [x] Register user A → profiles + credit_balances 50
- [x] Unauth `/api/auth/me` → 401
- [x] Auth `/api/auth/me` Bearer → 200

## Create → Generate → Publish
- [x] Create project 201
- [x] Chat strategist 2 turns
- [x] Outline generate → balance 45
- [x] Outline approve
- [x] Generate 4 sections → balance 5
- [x] 5th section 402 insufficient_credits
- [x] Top-up pack_100
- [x] 5th section after top-up 200
- [x] Publish → slug

## Distribution
- [x] Create claim link
- [x] User B claim → claimed
- [x] Library n=1
- [x] Read by slug 200
- [x] Reading progress 40

## Security
- [x] User B cannot GET user A project (404)
- [x] tsc 0 + next build 0

## Re-run
```bash
npx supabase start
for f in supabase/migrations/*.sql; do
  docker exec -i supabase_db_Publiora psql -U postgres -d postgres -v ON_ERROR_STOP=1 < "$f"
done
# .env.local live keys + NEXT_PUBLIC_USE_MOCK_API=false
npx next dev -p 3005
BASE_URL=http://127.0.0.1:3005 node scripts/e2e-live.mjs
```
