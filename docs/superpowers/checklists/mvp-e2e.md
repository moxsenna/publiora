# Publiora MVP E2E Checklist

## Prerequisites
- [ ] `supabase db push` (migrations 01-07 applied)
- [ ] `.env.local` real Supabase URL + anon + service role
- [ ] `GEMINI_API_KEY` set (or rely on agent fallbacks)
- [ ] `NEXT_PUBLIC_USE_MOCK_API=false`
- [ ] `npm run dev`

## Auth
- [ ] Register user A → profiles + credit_balances 50
- [ ] Logout → /dashboard redirects /login
- [ ] Login → session persists after reload

## Create → Generate → Publish
- [ ] Create project
- [ ] Chat strategist ≥ 2 turns
- [ ] Generate outline → credits 45
- [ ] Edit outline + approve
- [ ] Generate all sections → credits decrease by 10×N
- [ ] Edit one section TipTap + save
- [ ] Title + CTA generate
- [ ] Preview OK
- [ ] Publish → published row + slug

## Distribution
- [ ] Create claim link
- [ ] User B register → claim → library has ebook
- [ ] Read /read/[slug] → progress saves
- [ ] User A sees claim event + reader count

## Billing
- [ ] Top-up mock pack increases balance
- [ ] Change plan updates grant
- [ ] Set balance 0 → generate returns insufficient_credits + UI toast path

## Security
- [ ] User B cannot GET user A project by id
- [ ] No SERVICE_ROLE in client bundle (`grep -r SERVICE_ROLE app components` empty)
- [ ] `npx tsc --noEmit` exit 0
- [ ] `npx next build` exit 0
