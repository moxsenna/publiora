# auth-domains.md — Canonical domains & shared session

Publiora runs on three canonical hosts (see `.env.example` / `deploy/env.production.example`):

| Zone | Env key | Purpose |
|------|---------|---------|
| Marketing | `NEXT_PUBLIC_MARKETING_URL` | Landing page, guides, public product site |
| App | `NEXT_PUBLIC_APP_URL` | Workspace, dashboard, billing, published management — the creator product |
| Reader | `NEXT_PUBLIC_READER_URL` | Claim page (`/claim/<token>`), reading (`/read/<slug>`), reader library (`/library`) |

Book distribution only ever points to the **reader** host (`baca.publiora.biz.id` in
production), never to `window.location.origin` — the app and reader are separate
hosts and the app domain is not public.

## URL helpers — `lib/urls.ts`

| Helper | Produces |
|---|---|
| `buildDomainUrl(domain, path?)` | URL on any canonical domain |
| `buildMarketingUrl(path?)` / `buildAppUrl(path?)` / `buildReaderUrl(path?)` | Direct builders |
| `buildClaimUrl(token)` | App-side claim link helper |
| `buildPublicClaimUrl(token)` | **Distribution claim URL on the reader domain** |
| `buildPublishedReaderUrl(slug)` | Public reader URL for a published ebook |
| `buildProjectPreviewUrl(projectId)` | Creator preview (app domain, `/projects/<id>/preview`) |

Distance rule: any link that leaves the app to *readers* must use
`buildPublicClaimUrl` / `buildPublishedReaderUrl`.

## Host routing — `lib/hosts.ts`

- `detectHostKind(host)` → `marketing | app | reader | unknown`.
- `zoneOf(pathname)` + `resolveHostBoundary(...)` route each request to the
  correct zone and redirect cross-zone navigation (e.g. reader link opened on
  the app host) to the canonical host.
- Reader zone route prefixes: `/claim`, `/read`, `/library`.
- App prefixes: workspace, dashboard, projects, published, settings, billing.
- Marketing prefixes: landing page paths (not serving the app).

## Shared session across hosts

`AUTH_COOKIE_DOMAIN` / `NEXT_PUBLIC_AUTH_COOKIE_DOMAIN` (e.g. `.publiora.biz.id`)
make the Supabase session cookie valid across `app.*` and `reader.*`. Created
via `lib/supabase/cookie-options.ts`. Local development omits the domain so the
cookie stays host-local.

Login from the app is a login on the reader too (single session, no separate
reader auth). `e2e/attribution-lifecycle.spec.ts` covers the journeys; unit
coverage lives in `lib/hosts.test.ts`, `lib/urls.test.ts`,
`lib/auth/return-path.test.ts`.

## Local development

In `env` set the three `NEXT_PUBLIC_*_URL` values (may all point at localhost in
single-machine dev) and leave `AUTH_COOKIE_DOMAIN` empty. Verify with:

```bash
npm test
npm run test:e2e -- --grep "@attribution-lifecycle"
```