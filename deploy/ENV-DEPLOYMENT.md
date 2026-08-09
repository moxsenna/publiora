# Publiora Environment Deployment Guide

## Overview

This document describes how to deploy environment variables to staging and production servers for the Attribution Lifecycle feature.

**Feature Branch**: `feat/attribution-lifecycle`  
**PR**: https://github.com/moxsenna/publiora/pull/4  
**CI Status**: ✅ Green (845 tests passing)

---

## Generated Configuration Files

Two environment files have been created in project root:

| File | Purpose | Domain Prefixes |
|------|---------|-----------------|
| `.env.staging` | Staging/pre-production testing | `biz.id` subdomains |
| `.env.production` | Live production environment | Same as staging |

Both files share the same SIGNUP_CONTEXT_SECRET value for cross-environment cookie compatibility.

---

## Key Configuration Values

### Canonical Domains (Cross-Domain Session Sharing)

```
NEXT_PUBLIC_MARKETING_URL=https://publiora.biz.id          # Landing/marketing pages
NEXT_PUBLIC_APP_URL=https://app.publiora.biz.id            # Project creation/dashboard
NEXT_PUBLIC_READER_URL=https://baca.publiora.biz.id        # Ebook reading/claim flow
```

**Cookie Domain Setting:**
```
AUTH_COOKIE_DOMAIN=.publiora.biz.id   # Parent domain allows subdomain inheritance
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.publiora.biz.id
```

**Important Notes:**
- All domains use `.biz.id` parent for cookie sharing while Reader uses `.biz.id` (legacy domain)
- The shared cookie works because `.biz.id` is parent of all reader subdomains
- Marketing app needs explicit cookie sharing setup with JavaScript
- Cross-domain E2E test must verify session persists across these domains

### Signup Context Secret

**Generated Value** (already in both env files):
```
SIGNUP_CONTEXT_SECRET=5cf27c09fa2347fa88b93a2bb04b7bc1ce39105a6c32c66df19435e65e9d8711
```

**Usage:**
- Server-side only (never exposed to browser)
- Encrypts signup context JWT tokens
- MUST be identical between staging and production for seamless user transition
- If regenerated, ALL existing signup contexts will become invalid

### Supabase Database

**Current Instance** (from `.env.local`):
```
NEXT_PUBLIC_SUPABASE_URL=https://qluqhyfwpdknngxolsvi.supabase.co
```

⚠️ **Action Required**: Replace placeholder values in generated env files with:
- Actual `SUPABASE_SERVICE_ROLE_KEY` from Supabase dashboard → Settings → API keys
- Actual `NEXT_PUBLIC_SUPABASE_ANON_KEY` from Supabase dashboard

### PayCore Payment Integration

**Staging URLs:**
```
PAYCORE_BASE_URL=https://pay-staging.appvibe.biz.id
PAYCORE_RETURN_URL=http://localhost:3005/billing/return
```

**Production URLs:**
```
PAYCORE_BASE_URL=https://pay-production.appvibe.biz.id
PAYCORE_RETURN_URL=https://app.publiora.biz.id/billing/return
```

**Required Credentials** (replace placeholders):
- `PAYCORE_APP_SECRET`
- `PAYCORE_WEBHOOK_SECRET`
- `PAYCORE_MERCHANT_PROFILE_ID` (production vs staging may differ)

---

## Deployment Checklist

### Pre-Deployment (Staging First)

- [ ] Copy `.env.staging` to staging server (VPS `/opt/publiora/.env`)
- [ ] Review all `$VARIABLE` placeholders and replace with actual values
- [ ] Verify Supabase connection: can you run SQL queries via psql?
- [ ] Verify PayCore credentials: get test payment working
- [ ] DNS records configured: `publiora.biz.id`, `app.publiora.biz.id`, `baca.publiora.biz.id` point to staging server IP
- [ ] SSL certificates installed for all domains (Let's Encrypt recommended)

### Migration Verification

After deploying `.env.staging`:

1. Connect to Supabase cloud instance
2. Run verification queries from `scripts/verify-migration.sql`
3. Check results:
   - ✅ Tables: `profiles` has new columns (`signup_origin`, `reader_activated_at`, etc.)
   - ✅ Table: `signup_contexts` exists with proper structure
   - ✅ Functions: `complete_signup_context_v1`, `claim_ebook_access_v2` exist
   - ✅ View: `internal_user_audience_v1` accessible via service role

### Test Flows (Cross-Domain E2E)

Execute these test scenarios after staging deployment:

#### **Test A: Claim → Signup → Entitlement Flow**
```
1. Open baca.publiora.biz.id → Click "Buka Ebook" while logged-out
2. Decode token from URL → Fill signup form → Submit
3. Observe redirect back to baca with reader_id cookie set
4. Verify ebook access granted without re-login
5. Check database: signed_up_users origin = 'claim_link'
```

**Expected Result**: Seamless flow across claim link → signup → ebook access

#### **Test B: Baca Login → App Session Persistence**
```
1. Login at baca.publiora.biz.id (email/password)
2. Copy session cookies from browser DevTools
3. Import cookies to app.publiora.biz.id browser session
4. Visit app.publiora.biz.id/profile
```

**Expected Result**: Profile loads without re-authentication; same user data

#### **Test C: Creator Project Preview**
```
1. Login as creator at app.publiora.biz.id
2. Create new draft project → Enter content
3. Click "Preview as Claim Link" button
4. Opens baca.publiora.biz.id in new tab
5. Verify preview shows WITHOUT published_ebooks insert
6. Check network tab: no POST to /api/internal/publish routes
```

**Expected Result**: Preview works but never publishes to public

#### **Test D: Publish Creates Claim URL**
```
1. Publish draft ebook from app → creates published_ebooks row
2. Click "Generate Claim Link" button → caches URL on baca
3. Open claim link while logged-out → triggers signup modal
4. Complete signup → redirects to ebook with reader_id
5. Verify claim_link origin preserved through funnel
```

**Expected Result**: Full attribution chain intact

#### **Test E: Reader Becomes Creator Entitlement**
```
1. Complete signup flow from claim link
2. Login to app.publiora.biz.id with same credentials
3. Verify "New Project" button enabled (no paywall)
4. Create first project → check creator_activated_at timestamp set
```

**Expected Result**: Claim readers automatically gain creator permissions

---

## Production Deployment Steps

Only proceed after staging E2E tests pass!

### 1. Environment Variable Sync

Ensure production uses IDENTICAL SIGNUP_CONTEXT_SECRET:
```bash
cd /opt/publiora

# On production VPS
cat .env.production | grep SIGNUP_CONTEXT_SECRET
# Must match exactly: 5cf27c09fa2347fa88b93a2bb04b7bc1ce39105a6c32c66df19435e65e9d8711
```

If different, update `.env.production` immediately!

### 2. Deploy to Production VPS

```bash
# From local machine (using SSH key)
scp .env.production root@43.228.213.148:/opt/publiora/.env

# Rebuild Docker container with new config
docker-compose build --no-cache
docker-compose up -d

# Verify health check
curl http://localhost:3000/api/health
```

### 3. Post-Deployment Verification

Run these checks:

```bash
# Check container logs
docker-compose logs -f publiora-web | tail -50

# Verify environment variables loaded
docker exec <container-id> printenv | grep NEXT_PUBLIC_

# Test Supabase connection
docker exec <container-id> psql -h db.publiora.supabase.co -U postgres -c "SELECT 1;"
```

### 4. Monitoring & Rollback Plan

**Monitor for 24 hours:**
- Error rates in Sentry/logs
- Claim conversion rate changes
- Signup funnel abandonment spikes
- Cross-domain cookie failures

**Rollback command (if critical issues):**
```bash
git checkout master
docker-compose build --no-cache
docker-compose up -d
```

---

## Troubleshooting Common Issues

### Issue 1: Cross-Domain Cookie Not Working

**Symptoms**: User logged into baca.publiora.biz.id but not recognized at app.publiora.biz.id

**Diagnosis**:
```javascript
// In browser console:
document.cookie.split('; ').map(c => c.split('=')[0]).join(', ')
// Should show: NextAuthSession=xxx, readerId=yyy
```

**Fix**:
- Verify `AUTH_COOKIE_DOMAIN=.publiora.biz.id` is set correctly
- Ensure browser accepts third-party cookies (disable Safari Intelligent Tracking Prevention for testing)
- Check CORS headers allow `Access-Control-Allow-Credentials=true`

### Issue 2: Sign-Up Token Invalid After Redirect

**Symptoms**: User completes signup but gets "Token expired or invalid" error

**Diagnosis**:
```bash
# Check signup_contexts table
psql -h db.publiora.supabase.co -U postgres -c "SELECT * FROM signup_contexts ORDER BY created_at DESC LIMIT 5;"
```

**Common causes**:
- Token expires too quickly (default: 1 hour)
- Hash mismatch due to wrong secret key
- Query string modified during redirect

### Issue 3: Preview Generates Published Ebook

**Symptoms**: Draft previews create entries in `published_ebooks`

**Debug**:
```typescript
// In code review:
// Preview flow should use getClaimPreviewCopy() which:
// - NEVER inserts into published_ebooks
// - DOES generate cached_claim_url
// - DOES return reader_id but doesn't track progress

// Verify with query:
SELECT count(*) FROM published_ebooks WHERE status='draft_preview';
-- Should return 0
```

### Issue 4: Claim Link Origin Lost in Funnel

**Symptoms**: New user appears as "landing_page" instead of "claim_link"

**Database query**:
```sql
SELECT 
    id, 
    signup_origin, 
    initial_intent,
    created_at
FROM profiles 
WHERE signup_origin != 'claim_link' 
  AND signup_origin IS NOT NULL
ORDER BY created_at DESC 
LIMIT 10;
```

**Possible fixes**:
- Verify `claim_ebook_access_v2` RPC returns `claimed` result correctly
- Check frontend passes correct `source_creator_id` to signup flow
- Ensure profile trigger sets default `signup_origin='unattributed'` before claiming

---

## Support References

### Documentation Links
- [Plan Implementation](docs/superpowers/plans/publiora-creator-preview-claim-attribution-lifecycle-implementation-plan.md)
- [Design Spec](docs/superpowers/specs/2026-07-19-live-ai-no-mock-design.md)
- [Migration SQL Files](supabase/migrations/)
- [E2E Test Plan](tests/e2e/claims-attribution.spec.ts)

### Architecture Diagram
See `docs/architecture/claim-attribution-flow.svg` (todo: create)

### Security Guardrails Checklist
- [x] SHA-256 hash stored only (never raw tokens)
- [x] Query strings cleared after decode
- [x] No public reading modes/new roles
- [x] Preview never publishes (no published_ebooks insert)
- [x] User audience view hidden from users (service-role only)
- [x] Exports default to non-consent
- [x] No outreach engines built (intentionally excluded)

---

## Post-Merge Actions (GitHub PR #4)

Once approved and merged to master:

1. ✅ CI triggers automatically (tsc, vitest, build)
2. ⏳ Apply 4 migrations to Supabase cloud (manual step)
3. ⏳ Deploy staging environment (this guide)
4. ⏳ Run cross-domain E2E tests (this guide)
5. ⏳ Merge to master + deploy production

---

## Contact & Escalation

For deployment issues or urgent escalations:
- Lead Developer: @moxsenna
- VPS Admin: `root@43.228.213.148` (SSH key: `C:\Users\bimap\.ssh\id_ed25519`)
- Supabase Support: Access dashboard at `https://supabase.com/dashboard/project/db.publiora.supabase.co`

Last updated: 2026-08-09 (after PR #4 created, CI green)
