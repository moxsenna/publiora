# STAGING DNS CONFIGURATION REQUIRED

## Current Status
✅ Docker container deployed and healthy on VPS  
✅ Staging environment variables correctly configured  
✅ Application responds HTTP 200 on localhost:5300  
❌ **BLOCKER**: External DNS not configured for `*.staging.publiora.biz.id`

---

## Required DNS Records

Configure these **A records** at your domain registrar (Cloudflare/Nameservers):

```
Type: A
Name: staging.publiora.biz.id
Value: 43.228.213.148

Type: A
Name: app.staging.publiora.biz.id
Value: 43.228.213.148

Type: A
Name: baca.staging.publiora.biz.id
Value: 43.228.213.148
```

**Or as a wildcard record** (if supported):
```
Type: A
Name: *.staging.publiora.biz.id
Value: 43.228.213.148
```

---

## Post-DNS Configuration Test Steps

Once DNS propagates (can take minutes to hours globally), execute **Flow E2E tests**:

### Quick Verification Command
```bash
curl -skL https://baca.staging.publiora.biz.id/login -w "\nHTTP_CODE:%{http_code}\n" --max-time 10
```
Expected: HTTP 200 + HTML login page

### Full Flow Tests (Playwright)
After DNS resolves, run:
```bash
cd /d/Coding/Publiora
npm run test:e2e -- --grep "claim"
```

Or manually follow **STAGING-DEPLOY-CHECKLIST.md** flows A through E.

---

## Evidence Collected So Far

| Component | Status | Evidence |
|-----------|--------|----------|
| Git CI | ✅ Green | Commit `4304bcf` all checks pass |
| Docker Build | ✅ Success | `.9router` placeholder added, no build errors |
| Container Health | ✅ Up 40s+ | `docker compose ps` shows healthy |
| Env Config | ✅ Correct | Auth cookie domain = `.staging.publiora.biz.id`, PayCore staging keys |
| App Responding | ✅ HTTP 200 | Homepage accessible via localhost with Host header |
| DNS Resolution | ❌ BLOCKED | `dig staging.publiora.biz.id` fails globally |

---

## What Happens After DNS Is Configured

1. Wait for global DNS propagation (~5-60 minutes typically)
2. Verify with: `ping baca.staging.publiora.biz.id` → should resolve to `43.228.213.148`
3. Run browser automation tests or manual E2E verification
4. If **all 5 flows pass**, output `STAGING GO`
5. If any flow fails, fix defect → commit → push → rebuild → retest

---

## Contact for DNS Update

**External action required** - Domain owner/admin must configure DNS records. This cannot be automated from code repository.

**VPS Infrastructure already ready** - Once DNS points to `43.228.213.148`, application is live and serving traffic.
