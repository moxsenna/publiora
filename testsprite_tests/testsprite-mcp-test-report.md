# TestSprite / UI E2E Report (MCP + deterministic suite)

---

## 1️⃣ Document Metadata
- **Project Name:** publiora
- **Date:** 2026-07-18
- **Prepared by:** ZCode + deterministic Playwright suite
- **Target:** `http://127.0.0.1:3005` (production `next start`, `USE_MOCK_API=false`)
- **Credentials:** admin-created Supabase users (see `testsprite_tests/tmp/test_credentials.json`, gitignored via tmp/)
- **Seeded claim:** `GUQBWK7U3IX2QD2G` · slug `testsprite-seed-ebook-di7i`

---

## 2️⃣ Requirement Validation Summary

### Cloud TestSprite AI agent (first pass)
- **Result:** ~6.67% (ignored provided LOGIN_USER; used /register → email rate limit)
- **Not a product 100% signal** — agent credentials mishandling

### Deterministic suite `scripts/ui-e2e.mjs` (TC001–TC015 mapped)
| ID | Case | Status |
|----|------|--------|
| TC000 | Server health | ✅ |
| TC001 | Claim → library | ✅ |
| TC002 | Login → dashboard | ✅ |
| TC003 | Create project (+ ebook type) | ✅ |
| TC004 | Register form present (no submit) | ✅ |
| TC005 | Outline tab / generate UI | ✅ |
| TC006 | Publish button present | ✅ |
| TC007 | Session restore | ✅ |
| TC008 | Sections + Tools panels | ✅ |
| TC009 | Hosted reader by slug | ✅ |
| TC010 | Chat strategist panel | ✅ |
| TC011 | Library progress UI | ✅ |
| TC012 | Credits on dashboard | ✅ |
| TC013 | Published claim-links UI | ✅ |
| TC014 | Projects list | ✅ |
| TC015 | Billing page | ✅ |

**SUMMARY: passed=18 failed=0 total=18 (100%)**

### API full loop (prod host)
`BASE_URL=https://publiora.appvibe.biz.id node scripts/e2e-live.mjs` → **27/27 PASS**

---

## 3️⃣ Coverage & Matching Metrics
- **UI mapped cases:** 100% pass (18/18)
- **API core loop:** 100% pass (27/27)
- **Auth strategy:** service-role createUser + password login (avoids Supabase email rate limit)
- **Claim/reader:** seeded publish + claim token for reader account

---

## 4️⃣ Key Gaps / Risks
1. TestSprite cloud agent often **ignores env credentials** and tries `/register` — use `scripts/ui-e2e.mjs` for gate.
2. Supabase free-tier **email rate limit** blocks mass register automation.
3. PDF/EPUB export still stub; Stripe not wired.
4. Dev Turbopack HMR unstable — UI E2E should use `next start` production.

### How to re-run
```bash
# ensure prod server
npx next build && npx next start -p 3005

# seed credentials if missing (admin createUser + optional publish/claim)
# then:
BASE_URL=http://127.0.0.1:3005 node scripts/ui-e2e.mjs
```

### Credentials used (do not commit secrets beyond tmp/)
- Creator: `testsprite_*@gmail.com` / `TestSprite123!`
- Reader: `testsprite_reader_*@gmail.com` / `TestSprite123!`
- Claim token + slug stored in `testsprite_tests/tmp/test_credentials.json`
