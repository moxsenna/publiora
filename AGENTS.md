<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Agent entrypoints (Publiora)

## Production / VPS / “AI still mock on the website”

**Read first:** [`deploy/AGENT-DEPLOY.md`](deploy/AGENT-DEPLOY.md)

- Public site: **https://publiora.appvibe.biz.id** = Docker on VPS `/opt/publiora`, **not** local `npm run dev`.
- **Git push / merge to `master` does not auto-deploy.** Rebuild container on VPS.
- Shared SSH + multi-app rules: **`D:\Coding\deploy-kit\AGENT-HANDOFF.md`** (and QUICKSTART-ID / MULTI-APP).
- SSH: `root@43.228.213.148`, key `C:\Users\bimap\.ssh\id_ed25519` (or `~/.ssh/id_ed25519`).

Short recipe also: [`deploy/VPS.md`](deploy/VPS.md).

## Live AI (source of truth after approach B)

- Spec: `docs/superpowers/specs/2026-07-19-live-ai-no-mock-design.md`
- Plan: `docs/superpowers/plans/2026-07-19-live-ai-no-mock.md`
- Server AI: `lib/ai/provider.ts` + `lib/ai/agents/*` (no template fallbacks).
- Client always hits `/api/*` — do not reintroduce `shouldUseMock` / runtime imports from `lib/mock`.
- `lib/mock/*` is legacy on disk only; see `lib/mock/README.md`.
