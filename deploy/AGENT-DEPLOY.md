# Agent notes: Publiora production deploy

> **Baca ini dulu** kalau bug “hanya di production”, AI mock masih muncul di `publiora.appvibe.biz.id`, atau user minta deploy/update VPS.

## Critical: git push ≠ production live

| Layer | What it is |
|--------|------------|
| Local `npm run dev` | PC only (e.g. `:3005`) |
| GitHub `master` | Source of truth after merge |
| **VPS Docker** `/opt/publiora` | **What users hit at https://publiora.appvibe.biz.id** |

Fixing AI / env / code **locally or only on GitHub does nothing** until the VPS image is rebuilt and recreated.

If UI still shows strategist template like *“Saya baca brief… 3 pillar yang actionable”* on **publiora.appvibe.biz.id**, assume **stale production container** (or missing `AI_*` env on server), not “mock still in master source”.

---

## Shared VPS kit (SSH + multi-app rules)

Primary handoff for **all** apps on this VPS:

| Path | Role |
|------|------|
| `D:\Coding\deploy-kit\AGENT-HANDOFF.md` | Server inventory, forbidden ops, wacrm protection |
| `D:\Coding\deploy-kit\QUICKSTART-ID.md` | SSH / ZCode Remote Connect (ID) |
| `D:\Coding\deploy-kit\MULTI-APP.md` | Ports, Caddy, layout `/opt/<app>` |
| `D:\Coding\deploy-kit\PROMPT-TEMPLATES.md` | Copy-paste prompts for agents |
| `D:\Coding\deploy-kit\CHECKLIST.md` | Deploy checklist |

**Do not** invent a second SSH story. Follow deploy-kit.

---

## This app (Publiora)

| Item | Value |
|------|--------|
| Public URL | https://publiora.appvibe.biz.id |
| VPS host | `43.228.213.148` |
| SSH user | `root` |
| SSH key (Windows) | `C:\Users\bimap\.ssh\id_ed25519` |
| SSH key (Git Bash / WSL) | `~/.ssh/id_ed25519` |
| App path on VPS | `/opt/publiora` |
| Container | `publiora-web` (compose service `web`) |
| App port (host) | `127.0.0.1:5300` → Caddy → HTTPS |
| Docker network | `wacrm_edge` (external, shared with Caddy) |
| Repo (local) | `D:\Coding\Publiora` |
| Compose file | repo root `docker-compose.yml` |
| Dockerfile | repo root `Dockerfile` (Next standalone, `PORT=5300`) |

Test SSH:

```bash
ssh -i ~/.ssh/id_ed25519 -o BatchMode=yes root@43.228.213.148 'hostname && ls /opt && docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"'
```

Windows PowerShell (OpenSSH):

```powershell
ssh -i $env:USERPROFILE\.ssh\id_ed25519 -o BatchMode=yes root@43.228.213.148 "hostname && ls /opt"
```

---

## Required production env (AI live)

Server file: **`/opt/publiora/.env`** (not committed; never rsync-overwrite blindly with empty secrets).

Must include (see `deploy/env.production.example`):

```env
USE_MOCK_API=false
NEXT_PUBLIC_USE_MOCK_API=false

AI_PROVIDER=router
AI_BASE_URL=https://9router.appvibe.web.id/v1
AI_API_KEY=<server secret>
AI_MODEL=gcli/grok-4.5-high
AI_MODEL_FALLBACKS=ag/gemini-pro-agent,ag/gemini-3.1-pro-low,cx/gpt-5.6-terra,cx/gpt-5.6-sol

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # or PUBLISHABLE_KEY
SUPABASE_SERVICE_ROLE_KEY=...
```

Verify **inside running container** (not only host `.env`):

```bash
ssh -i ~/.ssh/id_ed25519 root@43.228.213.148 \
  'docker exec publiora-web printenv | grep -E "^(AI_|USE_MOCK|NEXT_PUBLIC_USE_MOCK)" | sed "s/=.*/=***/"'
```

If `AI_API_KEY` missing → chat returns **503**, not template (after new code is deployed).  
If old code still deployed → template fallback may still appear.

`NEXT_PUBLIC_*` are **build-time** for Next: change them → **rebuild image**, not only restart.

---

## Database migrations (before app code that needs new RPCs)

Apply Supabase migrations before shipping app code that depends on them.

Type-aware project creation requires:

```text
supabase/migrations/20260720000002_create_project_with_state.sql
```

This adds RPC `public.create_project_with_state` used by `POST /api/projects`. Deploy order:

```text
1. Database migration
2. Server/API code
3. Client UI
4. Smoke tests
```

API has a temporary non-RPC fallback only if the function is missing; production should apply the migration.

## Deploy / update Publiora

Canonical steps also in `deploy/VPS.md`. Prefer **git on server** if `/opt/publiora` is a clone; else **rsync from PC**.

### A) From PC — rsync + rebuild (matches VPS.md)

From `D:\Coding\Publiora` (Git Bash):

```bash
rsync -az --delete \
  --exclude node_modules --exclude .next --exclude .git \
  --exclude .wrangler --exclude .zcode --exclude .kiro \
  --exclude .env.local --exclude .env --exclude 'nul' \
  --exclude testsprite_tests \
  -e "ssh -i $HOME/.ssh/id_ed25519" \
  ./ root@43.228.213.148:/opt/publiora/

ssh -i ~/.ssh/id_ed25519 root@43.228.213.148 '
  set -e
  cd /opt/publiora
  test -f .env || cp deploy/env.production.example .env
  # ensure AI keys present before build/up (edit .env if needed)
  docker compose build --no-cache
  docker compose up -d
  docker compose ps
  curl -sI http://127.0.0.1:5300/ | head -5
'
```

**Never** rsync a local `.env` over production unless intentional; exclude `.env` as above.

### B) On VPS — git pull (if repo cloned there)

```bash
ssh -i ~/.ssh/id_ed25519 root@43.228.213.148 '
  set -e
  cd /opt/publiora
  git fetch origin && git checkout master && git pull origin master
  docker compose build --no-cache
  docker compose up -d
  docker compose ps
'
```

### After deploy smoke

1. `curl -sI https://publiora.appvibe.biz.id | head -5`
2. `curl -s https://publiora.appvibe.biz.id/api/billing/costs`
3. Logged-in: send a **new** strategist message — must **not** be the fixed “3 pillar yang actionable” template
4. Logs: `docker compose -f /opt/publiora/docker-compose.yml logs --tail=100 web`  
   Look for `[ai] model failed` / router errors, not silent mock success

Old chat rows in Supabase still show historical mock replies — that is data, not live code path.

---

## Caddy

- Snippet: `deploy/Caddyfile.snippet` → host `publiora.appvibe.biz.id` → `publiora-web:5300` (or host `127.0.0.1:5300` per current snippet)
- Shared Caddy lives with wacrm; do **not** bind Publiora to 80/443
- Reload only after snippet merge; do not wipe wacrm Caddy config

---

## Forbidden (also in deploy-kit)

- `docker compose down -v` on **wacrm** or delete `pgdata` / `baileys`
- `rm -rf /opt/wacrm`
- Commit secrets / paste root password in chat
- Expose Postgres/Redis publicly
- Assume “merged to master” = live on `publiora.appvibe.biz.id`

---

## When user says “AI still mock on site”

1. Confirm URL is **production** (`publiora.appvibe.biz.id`) vs localhost  
2. Check GitHub `master` has live AI commits  
3. SSH: container image age / `docker inspect publiora-web --format '{{.Created}}'`  
4. Check container env for `AI_API_KEY` + `USE_MOCK_API=false`  
5. Redeploy with **`--no-cache` build**  
6. User must send a **new** message after deploy  

---

## Related files in this repo

- `deploy/VPS.md` — short deploy recipe  
- `deploy/env.production.example` — env template  
- `docker-compose.yml` / `Dockerfile`  
- `docs/superpowers/specs/2026-07-19-live-ai-no-mock-design.md` — live AI design  
- `AGENTS.md` — points here + Next.js note  
