# PUBLIORA PRODUCTION DEPLOYMENT CHECKLIST

## ✅ PR #4 - Attribution Lifecycle & Claim Flow

**Target**: Deploy ke production Supabase `qluqhyfwpdknngxolsvi`

---

## PHASE 1: PRODUCTION DATABASE VERIFICATION

### Run these queries in Supabase SQL Editor (PRODUCTION):

```sql
-- 1. Verify profiles table has PR #4 columns
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN (
  'signup_origin', 'initial_intent', 'first_claim_link_id',
  'first_claim_ebook_id', 'first_claim_creator_id',
  'reader_activated_at', 'creator_activated_at', 'creator_subscribed_at',
  'marketing_email_consent', 'marketing_email_consent_at', 'marketing_email_consent_source'
) ORDER BY ordinal_position;

-- Expected: All 11 columns above present

-- 2. Check signup_contexts table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' AND table_name = 'signup_contexts'
);

-- Expected: true

-- 3. Check complete_signup_context_v1 function
SELECT EXISTS (
  SELECT 1 FROM pg_proc WHERE proname = 'complete_signup_context_v1'
);

-- Expected: true

-- 4. Count existing profiles (baseline)
SELECT COUNT(*) as total_profiles FROM public.profiles;
SELECT COUNT(*) as authenticated_users FROM auth.users;

-- IMPORTANT: If numbers seem high (>0), identify test artifacts first!
```

### Production Data Cleanup (IF needed):

If you find test data from previous experiments:

```sql
-- DELETE only E2E/test records (BE CAREFUL!)
DELETE FROM public.profiles 
WHERE email LIKE '%test%' OR email LIKE '%e2e%' OR created_at < NOW() - INTERVAL '30 days';

DELETE FROM public.entitlements WHERE reader_id IN (
  SELECT id FROM public.profiles WHERE email LIKE '%test%');

-- ALWAYS backup first!
-- SELECT * INTO TABLE public.profiles_backup_20260810 FROM public.profiles WHERE...
```

---

## PHASE 2: PAYCORE SECRET ROTATION

### In PayCore Dashboard → PRODUCTION environment:

1. **Revoke current secrets:**
   ```
   App Secret ID: pk_production_publiora_01
   Webhook Signing Secret: [current secret]
   ```

2. **Generate new credentials:**
   ```
   NEW_APP_SECRET = [copy from dashboard]
   NEW_WEBHOOK_SECRET = [copy from dashboard]
   ```

3. **Update VPS `/opt/publiora/.env.production`:**
   ```bash
   nano /opt/publiora/.env.production
   ```
   
   Replace:
   ```diff
   - PAYCORE_APP_SECRET=OLD_EXPOSED_VALUE
   + PAYCORE_APP_SECRET=<NEW_APP_SECRET_FROM_STEP_2>
   
   - PAYCORE_WEBHOOK_SECRET=OLD_EXPOSED_VALUE
   + PAYCORE_WEBHOOK_SECRET=<NEW_WEBHOOK_SECRET_FROM_STEP_2>
   ```

4. **Verify no secrets exposed in git history:**
   ```bash
   cd /opt/publiora
   git log --all --full-history -- "*.env*" | grep -i paycore
   ```

---

## PHASE 3: BUILD & DEPLOY TO PRODUCTION

### On VPS (`root@43.228.213.148`):

```bash
# Navigate to deployment directory
cd /opt/publiora

# Pull latest code
git pull origin master

# Build Next.js production image
docker build -t publiora-web:latest \
  --build-arg NEXT_PUBLIC_SUPABASE_URL=https://qluqhyfwpdknngxolsvi.supabase.co \
  --build-arg NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
  --build-arg NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY \
  --build-arg NEXT_PUBLIC_USE_MOCK_API=false \
  --build-arg NEXT_PUBLIC_DEMO_LOGIN=false \
  -f Dockerfile .

# Stop old container
docker stop publiora-web || true
docker rm publiora-web || true

# Start with volume-mounted secrets
docker run -d \
  --name publiora-web \
  --network wacrm_edge \
  -p 5300:5300 \
  --restart unless-stopped \
  publiora-web:latest
```

### Verify deployment:

```bash
# Check container health
docker ps | grep publiora-web

# View logs
docker logs -f publiora-web

# Test HTTPS endpoints
curl -k https://publiora.biz.id
curl -k https://app.publiora.biz.id/login
curl -k https://baca.publiora.biz.id/claim/test-token

# Should return HTTP 200 without certificate errors
```

---

## PHASE 4: PRODUCTION VALIDATION (LIVE TEST)

### Manual E2E Test (One-time):

1. **Test claim link flow:**
   ```
   Visit: https://baca.publiora.biz.id/claim/[ANY-LIVE-TOKEN]
   - Page loads? ✅
   - Login form visible? ✅
   - Can register new account? ✅
   ```

2. **Register test account:**
   ```
   Email: live-test-verification@publiora.biz.id
   Password: [secure password]
   ```

3. **Verify database updates:**
   ```sql
   -- Check profile was created
   SELECT * FROM public.profiles WHERE email = 'live-test-verification@publiora.biz.id';
   
   -- Should show signup_origin='claim_link' if claiming via token
   
   -- Check entitlement created
   SELECT * FROM public.entitlements WHERE reader_id = [profile-id];
   ```

4. **Test cross-domain session:**
   ```
   1. Login at baca.publiora.biz.id
   2. Navigate to app.publiora.biz.id/library
   3. Should NOT see login screen (session shared)
   ```

---

## PHASE 5: POST-DEPLOY MONITORING

### Watch for errors:

```bash
# Tail application logs
docker logs --tail 100 -f publiora-web | grep -i error

# Monitor Supabase connections
SELECT * FROM pg_stat_activity WHERE datname = 'postgres';

# Check payment webhook delivery
# PayCore Dashboard → Webhooks → Delivery History
```

### Performance monitoring:

```bash
# CPU/Memory usage
htop

# Disk space
df -h /var/lib/docker

# Network connections
ss -tlnp | grep -E '80|443|5300'
```

---

## 🚨 ROLLBACK PLAN

If deployment fails:

```bash
# Stop broken container
docker stop publiora-web

# Restore previous image tag (if kept)
docker run -d \
  --name publiora-web \
  --network wacrm_edge \
  -p 5300:5300 \
  --restart unless-stopped \
  publiora-web:v[previous-version]

# Or rebuild from commit before PR #4
git checkout <commit-before-pr4>
docker build ... --tag publiora-web:rollback
```

---

## ✅ SUCCESS CRITERIA

Deployment is successful when:

- ✅ Container running without errors
- ✅ HTTPS returns HTTP 200 on all subdomains
- ✅ TLS certificates valid and trusted
- ✅ Supabase connections established
- ✅ Claims redeemable (test one)
- ✅ Entitlements granted
- ✅ Sessions persist across subdomains
- ✅ No critical errors in logs

---

## ⏱️ ESTIMATED TIME

- Database verification: 5-10 minutes
- PayCore rotation: 10 minutes  
- Build & deploy: 10-15 minutes
- Live validation: 10-20 minutes

**Total: ~45 minutes for full deployment**

---

## CONTACTS

**Issues?** Check:
- Docker logs: `docker logs publiora-web`
- Supabase logs: supabase.com/dashboard/logs
- PayCore webhooks: dashboard/paycore/webhooks

**Emergency rollback**: Contact DevOps team immediately
