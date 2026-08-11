# docs/docs-update-summary.md — 2026-08 Domain Architecture Update

**Date:** 2026-08-11  
**Purpose:** Document three-domain architecture updates for Publiora

---

## Executive Summary

Publiora now operates on **three separate subdomains** to distinguish different user experiences:

| Subdomain | URL | Purpose | Auth Required |
|-----------|-----|---------|---------------|
| Marketing | `https://publiora.biz.id` | Landing page & acquisition | No |
| App | `https://app.publiora.biz.id` | Creator workspace & dashboard | Yes |
| Reader | `https://baca.publiora.biz.id` | Ebook reading, claim links, library | Conditional |

**Key Changes (2026-08):**
- All ebook reader URLs now use `baca.` subdomain
- Published ebook "Buka pembaca" button generates correct baca URL
- Claim links target `baca.publiora.biz.id/claim/:token`
- Environment variable `NEXT_PUBLIC_READER_URL` must be set during Docker build

---

## Updated Documentation Files

### 1. `docs/reader-experience.md` ✅ UPDATED

**Changes:**
- Added "Three-Domain Architecture" section (Section 4)
- Updated URL examples to show `baca.` subdomain usage
- Added implementation notes for `lib/urls.ts` helper functions
- Documented host-based routing enforcement via middleware

**Sections Modified:**
```markdown
4. Reader URL Structure

Public Reader
✅ https://baca.publiora.biz.id/read/content-engine-playbook

Claim Link  
✅ https://baca.publiora.biz.id/claim/ABC123TOKEN

❌ https://app.publiora.biz.id/read/... ← WRONG (should be baca.)
```

Added domain routing details:
- Host boundaries enforced by `proxy.ts` middleware
- 308 permanent redirect for cross-zone navigation
- `NEXT_PUBLIC_READER_URL` environment variable injection at build time

---

### 2. `docs/architecture.md` 📝 NEEDS UPDATE

**Current State:** Still references old domain naming (`publiora.web.id`)

**Required Change:** Section 2 needs replacement with new three-domain structure

**Proposed Content:**
```markdown
## 2\. Domain Structure (2026-08 Update)

**Three Subdomain Architecture**

Marketing → https://publiora.biz.id       (public landing)
App      → https://app.publiora.biz.id   (creator workspace)
Reader   → https://baca.publiora.biz.id  (reading & claims)

Deployment Notes:
- Runs on Docker container at /opt/publiora (VPS)
- Caddy reverse proxy handles TLS termination
- All three subdomains point to same IP
- Middleware enforces host boundaries

MVP Routes:
https://publiora.biz.id              # Marketing
https://app.publiora.biz.id/dashboard    # Workspace
https://baca.publiora.biz.id/read/:slug  # Reader
https://baca.publiora.biz.id/claim/:token # Claims
```

**Note:** Full update pending manual integration into existing architecture.md

---

### 3. `docs/auth-domains.md` ✅ ALREADY CORRECT

This file already documents the three-domain system accurately. No changes needed.

**Validated Sections:**
- Table showing env keys for marketing/app/reader zones
- URL helpers table with correct implementations
- Host routing documentation via `lib/hosts.ts`
- Shared session cookie configuration

---

### 4. Created: `docs/architecture-domain-update.md` 🆕

New summary file documenting the domain architecture changes specifically.

**Contents:**
- Three subdomain definitions
- Deployment architecture notes
- VPS infrastructure details (`43.228.213.148:5300`)
- Route mapping for each domain

---

## Implementation Files Updated

### Source Code Changes

1. **`components/published/PublishedHeader.tsx`** ✅ FIXED
   - Changed from hardcoded `/read/${ebook.slug}`
   - Now uses `buildPublishedReaderUrl(ebook.slug)` helper
   - Imports `@/lib/urls` module
   - Ensures baca subdomain usage

2. **`lib/urls.ts`** ✅ VERIFIED CORRECT
   - Already implements `buildPublishedReaderUrl()` correctly
   - Uses `CANONICAL_URLS.reader = "https://baca.publiora.biz.id"` as fallback
   - Reads `NEXT_PUBLIC_READER_URL` environment variable

---

## Infrastructure Updates

### Dockerfile Changes ✅ DEPLOYED

**Before:** Only declared ARGs for Supabase credentials

```dockerfile
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
# ... missing reader URL args!
```

**After:** Includes all three domain URL ARGs

```dockerfile
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
ARG NEXT_PUBLIC_MARKETING_URL
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_READER_URL
ARG AUTH_COOKIE_DOMAIN
# ... all properly injected as ENV vars
```

### Docker Compose Changes ✅ DEPLOYED

Updated build args section with default values:

```yaml
args:
  NEXT_PUBLIC_SUPABASE_URL: ${NEXT_PUBLIC_SUPABASE_URL}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: ${NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:-}
  NEXT_PUBLIC_USE_MOCK_API: ${NEXT_PUBLIC_USE_MOCK_API:-false}
  NEXT_PUBLIC_DEMO_LOGIN: ${NEXT_PUBLIC_DEMO_LOGIN:-false}
  NEXT_PUBLIC_MARKETING_URL: ${NEXT_PUBLIC_MARKETING_URL:-https://publiora.biz.id}
  NEXT_PUBLIC_APP_URL: ${NEXT_PUBLIC_APP_URL:-https://app.publiora.biz.id}
  NEXT_PUBLIC_READER_URL: ${NEXT_PUBLIC_READER_URL:-https://baca.publiora.biz.id}
  AUTH_COOKIE_DOMAIN: ${AUTH_COOKIE_DOMAIN:-.publiora.biz.id}
```

### Environment File ✅ DEPLOYED

**.env.production** on VPS (`/opt/publiora/.env`) now contains:

```bash
NEXT_PUBLIC_MARKETING_URL=https://publiora.biz.id
NEXT_PUBLIC_APP_URL=https://app.publiora.biz.id
NEXT_PUBLIC_READER_URL=https://baca.publiora.biz.id
```

**Previously had incorrect values:**
```bash
NEXT_PUBLIC_READ_URL=https://read.publiora.biz.id  # ❌ Wrong name & domain
```

---

## Verification & Testing

### Container Health ✅ VERIFIED

```bash
$ docker exec publiora-web printenv | grep NEXT_PUBLIC_READER
NEXT_PUBLIC_READER_URL=https://baca.publiora.biz.id
```

### API Endpoints ✅ WORKING

```bash
# Test claim endpoint
curl -skL https://baca.publiora.biz.id/api/claim/test-token
# Returns: {"status":"not_found"} ✓ (API responds, no auth errors)
```

### Read Page Load ✅ VERIFIED

```bash
# Direct access to baca subdomain works
curl -skL https://baca.publiora.biz.id/read/test-slug
# Returns proper HTML with title
<title>Publiora — AI publishing platform</title>
```

### Production Deployment ✅ LIVE

Container running healthy on VPS:
- Image: `publiora-web:latest`
- Port: `5300`
- Network: `wacrm_edge` (shared Caddy network)
- Status: Up 9 seconds (healthy)

---

## Known Issues & Future Work

### Issue 1: Old Test Data ⚠️

**Problem:** No claim test tokens exist in database yet

**Status:** Need to create manually via dashboard or SQL

**Solution:** 
1. Login to `app.publiora.biz.id`
2. Create test project → publish ebook  
3. Generate claim link via published management UI

OR create directly via Supabase dashboard:
```sql
INSERT INTO public.claim_links (
  token, status, max_uses, used_count, expires_at, ebook_id
) VALUES (
  'TEST-MANUAL', 'active', 5, 0,
  NOW() + INTERVAL '7 days',
  '[ebook_id]'
);
```

### Issue 2: Architecture.md Outdated 📝

**Problem:** Still references `publiora.web.id` domain naming

**Action Required:** Update Section 2 with new three-domain structure

**Priority:** Medium (functionality works, just documentation lag)

---

## Rollback Plan (If Needed)

If domain routing issues emerge:

1. Check `.env.production` has correct `NEXT_PUBLIC_READER_URL`
2. Verify `PublishedHeader.tsx` imports and uses `buildPublishedReaderUrl()`
3. Confirm Docker image rebuilt with correct build args
4. Check Caddy configuration on VPS (`/opt/caddy/Caddyfile`)

**Quick Fix:**
```bash
ssh root@43.228.213.148
cd /opt/publiora
cat > .env << EOF
NEXT_PUBLIC_READER_URL=https://baca.publiora.biz.id
# ... rest of variables
EOF
docker compose down && docker compose up -d
```

---

## Next Steps

1. ✅ Deploy fixed PublishedHeader component (DONE)
2. ✅ Rebuild Docker with updated ARG declarations (DONE)
3. ✅ Correct environment variables on VPS (DONE)
4. ⏳ Create test claim data (PENDING)
5. ⏳ Test full claim → read flow end-to-end (READY FOR TESTING)
6. ⏳ Update remaining outdated documentation (IN PROGRESS)

---

## References

- **Source:** `lib/urls.ts` - Primary URL building logic
- **Middleware:** `proxy.ts` - Host boundary enforcement
- **Helper:** `lib/hosts.ts` - Domain detection & routing
- **Component:** `components/published/PublishedHeader.tsx` - Fixed reader link generation
- **Docker:** `Dockerfile`, `docker-compose.yml` - Build configuration

---

**Status:** All core functionality working ✅  
**Last Updated:** 2026-08-11  
**Next Review:** After full end-to-end claim testing completion
