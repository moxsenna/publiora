# TestSprite AI Testing Report (MCP)

---

## 1️⃣ Document Metadata
- **Project Name:** publiora
- **Date:** 2026-07-18
- **Prepared by:** TestSprite AI + manual browser smoke after fixes
- **Target:** `http://127.0.0.1:3005`
- **Modes:** TestSprite on dev (HMR broken mid-run); smoke on `next start` production

---

## 2️⃣ Requirement Validation Summary

### TestSprite raw run (before auth fix fully effective)
| Status | Count | Notes |
|--------|-------|-------|
| ✅ Passed | 1 | TC001 claim path |
| ❌ Failed | 3 | login/register/session |
| BLOCKED | ~11 | cascade from auth |

**Root cause cluster**
1. Login form native GET submit → password in query string (React handlers not firing under broken Turbopack HMR / incomplete hydrate in automated runs)
2. Supabase free-tier **email rate limit** on `/register` (`over_email_send_rate_limit`)
3. Generic auth error mapping hid rate-limit message

### Fixes applied after TestSprite
| Fix | File(s) |
|-----|---------|
| Button default `type="button"` | `components/ui/Button.tsx` |
| Login/register preventDefault + button click fallback | `LoginForm.tsx`, `RegisterForm.tsx` |
| Form `method="post"` defense | auth forms |
| Richer `mapAuthError` (rate limit, codes) | `lib/supabase/errors.ts` |
| Demo login opt-in only | `LoginForm.tsx` |
| Claim dual-path live API | `app/claim/[token]/page.tsx` |
| Enhance section UI | `SectionsPanel.tsx` |
| Titles/CTAs mutations | `ToolsPanel.tsx`, `hooks.ts` |
| Ebook type create flow + migration | `projects/new`, types, API, SQL |

### Manual smoke (`next build` + `next start -p 3005`) — post-fix
| Step | Result |
|------|--------|
| Login with admin-created user | ✅ → `/dashboard`, credits **50**, plan free |
| New project (Sellable + brief) | ✅ → workspace `/projects/{id}` Chat tab |
| Dashboard stats / empty states | ✅ |
| `tsc --noEmit` | ✅ 0 errors |
| Production build | ✅ routes OK |

Outline/chat AI steps partially exercised; long AI waits timed out in automation once (server process killed mid-run). Backend E2E script previously **27/27**.

---

## 3️⃣ Coverage & Matching Metrics

- **TestSprite raw pass rate:** 6.67%
- **Post-fix auth smoke:** login + create project **PASS**
- **API cloud E2E (prior):** 27/27
- **Schema:** `ebook_type` present on Supabase cloud

| Requirement | TestSprite | Manual smoke |
|-------------|------------|--------------|
| Auth login | fail → fixed | pass |
| Register | rate-limit fail | use admin createUser for tests |
| Dashboard | blocked | pass |
| Create project + type | blocked | pass |
| Workspace AI | blocked | partial |
| Claim | pass | not re-run full |
| Billing UI | blocked | not fully re-run |
| Library | blocked | empty state OK expected |

---

## 4️⃣ Key Gaps / Risks

1. **Dev Turbopack HMR** unstable in this environment (`webpack-hmr` invalid handshake) — prefer `next build && next start` for UI E2E.
2. **Supabase email rate limit** blocks automated `/register`; seed users via service role.
3. **PDF/EPUB** still stub; **Stripe** not wired.
4. Re-run full TestSprite only with pre-seeded `LOGIN_USER` / `LOGIN_PASSWORD` (admin createUser), not public register.
5. Deploy VPS after this auth fix so prod gets password-safe forms.

### Recommended next
```bash
# seed user (service role)
# then:
npx next build && npx next start -p 3005
# smoke: login → new project → outline → section → publish → claim → library → billing
# rsync + docker compose on VPS
```
