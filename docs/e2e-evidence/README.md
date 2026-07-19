# E2E evidence (workflow-first)

## Auth-gated suite — 2026-07-19 (updated)

### Final result

| Suite | Result |
|-------|--------|
| Unit `npm test` | **266 passed** |
| Smoke `e2e/smoke-public.spec.ts` (chromium) | **6 passed** |
| Auth-gated happy path + workspace shell (chromium) | **17 passed** |
| Workspace screenshots @screenshots | **10 images** under `docs/baseline-workspace/` |

### Earlier failures (resolved)

1. **No E2E credentials** — created ephemeral Supabase Auth user via service role (credentials only in gitignored `.env.e2e.local`).
2. **UI form login stayed on `/login`** — demo identity not a live Auth user; also form path flaky under Playwright.
3. **localStorage session injection failed** — app uses `@supabase/ssr` `createBrowserClient`, which persists **chunked cookies** (`base64-` JSON), not plain localStorage.
4. **`next dev` OOM** on constrained Windows agent — switched Playwright `webServer` to production `npm run start` after `npm run build`.

### Working auth recipe

```ts
// e2e/helpers/auth.ts
// 1) signInWithPassword via @supabase/supabase-js
// 2) createChunks(storageKey, `base64-${stringToBase64URL(JSON.stringify(session))}`)
// 3) context.addCookies(...) for sb-<projectRef>-auth-token[.N]
// 4) page.goto('/dashboard') then /projects/:id
```

### Unblock / re-run locally

```bash
# create user + project (service role) or use existing
export E2E_EMAIL=...
export E2E_PASSWORD=...
export E2E_PROJECT_ID=...

npm run build
npm run start -- --hostname 127.0.0.1 --port 3000

npx playwright test --project=chromium \
  e2e/workflow-happy-path.spec.ts \
  e2e/workspace-shell.spec.ts

npx playwright test --project=chromium \
  e2e/capture-workspace-screenshots.spec.ts
```

### Artifacts

- Failed UI login (historical): `auth-login-failed-desktop.png`
- Authenticated workspace: `../baseline-workspace/desktop-*.png`, `mobile320-*.png`
