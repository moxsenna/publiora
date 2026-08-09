# Staging Deployment Checklist

**Feature**: Attribution Lifecycle Implementation  
**PR**: #4 (CI green, 845 tests passing)

---

## Pre-Deployment Tasks

### 1. Update Environment Variables

Copy `.env.staging` to VPS:
```bash
# From local machine
scp .env.staging root@43.228.213.148:/opt/publiora/.env.staging
```

Then edit on VPS to replace placeholders:
```bash
cd /opt/publiora

# Edit file
nano .env.staging

# Replace these placeholders:
# $SUPABASE_SERVICE_ROLE_KEY → Your actual key from Supabase dashboard
# $PAYCORE_APP_SECRET → Your PayCore app secret for staging
# $PAYCORE_WEBHOOK_SECRET → Your webhook signing secret
```

Get actual values from:
- Supabase Dashboard → Settings → Database → Connection Pooler
- AppVibe PayCorp Dashboard → Settings → API Keys

---

## Test Scenario A: Claim → Signup → Entitlement Flow

**Purpose**: Verify end-to-end claim attribution lifecycle works across domains

**Setup Requirements**:
- DNS resolved: `baca.publiora.biz.id` points to staging server IP
- SSL certificate installed for baca domain
- Claim link generated (from published ebook)

**Test Steps**:

1. **Open claim link while logged-out**
   ```
   Navigate to: baca.publiora.biz.id/claim/<TOKEN>
   ```
   - Expected: Page loads with "Daftar" button visible (not query param URL)
   - No error about invalid token
   
   **Note**: Correct flow uses route-based claim link, not query parameter

2. **Complete signup form**
   - Name: "Test User"
   - Email: `test-user+claim-staging@publiora.appvibe.biz.id`
   - Password: Set temporary password
   - Submit
   
   Expected behavior:
   - Redirect to `/register?return_to=/claim/<TOKEN>`
   - Complete signup
   - Auto-redirect back to `/claim/<TOKEN>` after registration
   
   Cookie should be set: `NextAuthSession=xxx` with domain `.publiora.biz.id`

3. **Verify ebook access granted**
   - Check browser cookie: `document.cookie.split('; ').map(c => c.split('=')[0])`
     - Should show: `NextAuthSession, readerId`
   
   - Check network tab (DevTools → Network)
     - Last request should be to `/api/internal/claim_ebook_access_v2` returning `{claim_result_json}`

4. **Database verification**
   Connect via psql or Supabase SQL Editor:
   ```sql
   -- Check profiles has correct attribution from claim link
   SELECT 
       id,
       signup_origin,
       initial_intent,
       first_claim_link_id,
       first_claim_ebook_id,
       reader_activated_at
   FROM profiles
   WHERE email = 'test-user+claim-staging@publiora.appvibe.biz.id'
   ORDER BY created_at DESC
   LIMIT 1;
   ```
   
   Expected result:
   ```
   signup_origin: 'claim_link'
   initial_intent: 'reader'
   first_claim_link_id: <UUID of claim_link record>
   first_claim_ebook_id: <UUID of ebook from claim> (or NULL)
   reader_activated_at: <timestamp set by trigger>
   ```

5. **Entitlement & claim_link verification**
   ```sql
   -- Verify entitlement created from claim flow
   SELECT * FROM entitlements WHERE reader_id = '<profile-id>';
   
   -- Expected: 1 row with ebook_id matching the claimed ebook
   
   -- Verify claim_link was used (used_count incremented)
   SELECT id, used_count 
   FROM claim_links 
   WHERE token = '<TOKEN>' OR link = '/claim/<TOKEN>';
   
   -- Expected: used_count should be >= 1 after first use
   ```
   
**Pass Criteria**: ✅ All steps complete successfully, no errors in logs  
**Database Assertions Required**:
- `profiles.signup_origin = 'claim_link'`
- `profiles.first_claim_link_id` IS NOT NULL
- `reader_activated_at IS NOT NULL`
- At least 1 row in `entitlements` table
- `claim_links.used_count` incremented by 1

**Fail Scenarios**:
- Token invalid/error page → Check `signup_contexts` table for expired/invalid hash
- Cookie not set → Check `AUTH_COOKIE_DOMAIN` value, third-party cookie settings
- Signup origin shows 'landing_page' instead of 'claim_link' → Verify claim_ebook_access_v2 RPC returns correct source
- `/read/?claim=` URL pattern detected → Should be `/claim/{token}`, check frontend routing

---

## Test Scenario B: Cross-Domain Shared Session

**Purpose**: Prove shared cookies work automatically WITHOUT manual cookie manipulation

**Setup**: Fresh browser or incognito window with cookies cleared

**Correct Test Method (Automatic)**:

1. **Login at baca.publiora.biz.id**
   - Use test account created in Scenario A
   - Enter credentials → Submit login form
   
2. **Verify cookies set correctly**
   In DevTools Application tab → Cookies → baca.publiora.biz.id:
   - `NextAuthSession` domain = `.publiora.biz.id` (parent domain!)
   - Check flags: `Secure`, `SameSite=Lax`
   
3. **Without closing browser**, navigate to app.publiora.biz.id
   - Click "My Library" or `/library` route
   - Should display user profile data WITHOUT re-login prompt
   
4. **Cross-check from reverse direction**
   - Clear browser state again (incognito)
   - Login at app.publiora.biz.id/library
   - Navigate to baca.publiora.biz.id/library
   - Should remain authenticated

**Pass Criteria**: ✅ Automatic session persistence across subdomains
               ✅ No manual cookie export/import required
               ✅ Same user ID visible at both domains

**Fail Scenarios**:
- Login prompt appears on second domain → Cookie domain mismatch
  * Verify `AUTH_COOKIE_DOMAIN=.publiora.biz.id` matches all subdomains
- CORS error → Disable Safari Intelligent Tracking Prevention for testing
- Third-party cookie blocked → Chrome may require --disable-site-isolation-trials flag

**What NOT to Do**: ❌ Never manually copy/paste cookies between domains
                   ❌ Never use extensions like EditThisCookie for testing
                   ❌ Never inspect individual cookie values in console

Cookie sharing must work via browser's native HTTP layer, not manual manipulation!

---

## Test Scenario C: Creator Project Preview (Reader Mode)

**Purpose**: Ensure reader preview NEVER publishes to public distribution

**Terminology Correction**: This is NOT "claim link" - it's a **reader mode preview** for creators to test how their content appears to readers before publishing.

**Setup**:
- Login as creator at `app.publiora.biz.id`
- Existing account with paid subscription OR trial status
- Project must have at least 1 generated section

**Test Steps**:

1. **Create draft project with content**
   - Click "New Project" 
   - Enter title: "Draft Preview Test [Staging]"
   - Generate at least one section via AI
   
2. **Enter reader preview mode**
   - Look for button labeled: **"Pratinjau sebagai pembaca"** or "Preview Reader Mode"
   - Click it → Opens new tab at `app.publiora.biz.id/projects/<PROJECT_ID>/preview`
   - NOT baca domain, NOT claim flow
   
3. **Verify preview behavior**
   - Content displays correctly (title, outline, sections) in reader view
   - NO purchase/download prompts visible
   - NO "Publish" buttons available
   - No analytics tracking calls fired (check DevTools Network tab)
   - User remains authenticated at app domain throughout
   
4. **Database verification**
   ```sql
   -- Verify NO insert happened in published_ebooks
   SELECT count(*) FROM published_ebooks 
   WHERE owner_id = '<creator-profile-id>'
     AND title LIKE '%[Staging]%';
   
   -- Expected: 0 rows (draft preview does not publish)
   
   -- Verify entitlement NOT created during preview
   SELECT count(*) FROM entitlements 
   WHERE ebook_id IN (
     SELECT id FROM projects WHERE owner_id = '<creator-profile-id>'
   );
   
   -- Expected: 0 rows (no entitlement without actual publish)
   
   -- Verify reading_progress NOT created
   SELECT count(*) FROM reading_progress 
   WHERE user_id = <current-user-id>;
   
   -- Expected: 0 (no progress tracked during preview mode)
   ```

**Pass Criteria**: ✅ Preview renders reader view correctly
                ✅ Zero published_ebooks rows created
                ✅ Zero entitlement rows created
                ✅ No reading progress tracked
                ✅ Never leaves app subdomain

**Fail Scenarios**:
- Creates published_ebooks row → Bug in preview mode; fix immediately
- Analytics firing during preview → Privacy violation
- Claims entitlement without actual read/purchase → Double-delivery risk
- Navigates to baca domain → Wrong flow; should stay at app domain

**Important**: Preview ≠ Claim Link
- Preview is internal testing tool for creators
- Claim link is external marketing conversion funnel
- They use different endpoints, different logic, different database tables

---

## Continue to Production Deployment?

After completing all scenarios above:

**Review Checklist**:
- [ ] Scenario A passed (claim → signup → entitlement)
- [ ] Scenario B passed (cross-domain session persistence)
- [ ] Scenario C passed (preview doesn't publish)
- [ ] No critical errors in application logs
- [ ] No increase in support ticket volume
- [ ] Performance metrics stable (same as baseline)

If YES to all:
→ Proceed to production deployment using `.env.production` file

If NO to any:
→ Debug issue first; DO NOT proceed to production until all scenarios pass

---

## Rollback Plan (If Critical Issues Found)

**Emergency commands**:
```bash
cd /opt/publiora

# Stop containers
docker-compose down

# Revert git branch
git checkout master

# Redeploy previous version
git pull origin master
docker-compose up -d
```

Monitor for 15 minutes after rollback, then investigate issues before retrying deployment.

---

**Last Updated**: 2026-08-09 (staging deployment phase)
**Contact**: moxsenna (developer), root@43.228.213.148 (VPS admin)
