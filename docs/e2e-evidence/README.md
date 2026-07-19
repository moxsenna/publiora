# E2E evidence (workflow-first)

## Auth-gated attempt — 2026-07-19

### Blocker

Authenticated Playwright happy path and workspace screenshots require a **live Supabase Auth user**.

Attempted with the in-repo demo identity from `LoginForm` (`mox@publiora.demo` / `demo1234`):

- Form filled and **Sign in** clicked
- Page remained on `/login` (no navigation to `/dashboard`)
- Playwright timeout: `waitForURL` 15s after login

Screenshot: [`auth-login-failed-desktop.png`](./auth-login-failed-desktop.png)

### Not available in agent environment

| Item | Status |
|------|--------|
| `E2E_EMAIL` / `E2E_PASSWORD` secrets | Not provided |
| Valid Supabase test user | Unknown / demo identity not accepted |
| `E2E_PROJECT_ID` | Not provided |
| Workspace desktop/mobile screenshots after login | Blocked |

### What did pass without auth

- `npm test` — 266 unit tests
- `npm run test:e2e:smoke` — 12 public-page Playwright tests
- Public baseline screenshots under `docs/baseline-*.png`

### Unblock

1. Create Supabase Auth user for e2e only.
2. Create or pick a project owned by that user.
3. Export:

```bash
export E2E_EMAIL=...
export E2E_PASSWORD=...
export E2E_PROJECT_ID=...
npm run test:e2e -- --project=chromium
```
