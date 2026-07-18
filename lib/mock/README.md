# lib/mock (legacy / offline)

This tree is **not used by the live app runtime**.

- Client hooks always call `/api/*` via `apiFetch`.
- AI agents call `lib/ai/provider` (router), not `lib/mock/ai`.
- Do **not** import these modules from `app/`, `components/`, or `lib/api/`.

Kept on disk for historical reference and possible isolated tests only.
Approach C (full purge) may delete this directory later.
