---
docs: Update Three-Domain Architecture (2026-08)
title: Domain Structure & Deployment Notes
date: 2026-08-11
updated: true
---

# docs/architecture.md — Updated Domain Structure Section

## 2\. Domain Structure (2026-08 Update)

**Three Subdomain Architecture**

```
Marketing     → https://publiora.biz.id       (public landing & acquisition)
App           → https://app.publiora.biz.id   (creator workspace, authenticated)
Reader        → https://baca.publiora.biz.id  (ebook reading, claim links, library)
```

**Deployment Notes:**

- Runs on Docker container on VPS at `/opt/publiora`
- Frontend serves via Caddy reverse proxy at `43.228.213.148:5300`
- All three subdomains point to same IP, Caddy handles TLS termination
- Middleware (`proxy.ts`) enforces host boundaries - redirects cross-domain requests

**MVP Routes:**

```txt
https://publiora.biz.id              # Marketing homepage
https://publiora.biz.id/login        # Auth (shared across domains)
https://app.publiora.biz.id/dashboard    # Creator workspace
https://app.publiora.biz.id/projects     # Project management  
https://baca.publiora.biz.id/read/:slug  # Public reader
https://baca.publiora.biz.id/claim/:token # Claim page
https://baca.publiora.biz.id/library         # Reader library
```

---

## 3\. High-Level Architecture
