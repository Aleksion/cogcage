# CogCage Changelog

Every PR must include an entry here. Newest first.

---

## [2026-02-27] - fix: Redis import.meta.env → process.env for serverless runtime

**Type:** fix

### Summary
All API routes using Redis were silently crashing on Vercel with a module-level `throw` because `import.meta.env` is stripped for non-PUBLIC vars at Vite build time. Vercel serverless functions must use `process.env` for secrets at runtime.

### Root Cause
`web/src/lib/redis.ts` used `import.meta.env.UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`. In Astro's hybrid/SSR mode with the `@astrojs/vercel` adapter, Vite only inlines `PUBLIC_*` vars into the bundle — all other `import.meta.env` reads return `undefined` in production. The module-level guard threw immediately, crashing every API route that imported Redis. The fetch call in the client caught this as `"Network error"` (not a JSON error response), which is why it was invisible.

### Changes
- `web/src/lib/redis.ts` — Changed credential resolution to `process.env` with fallback to `import.meta.env` for local dev server compatibility.

### Breaking Changes
- None. Behavior is identical in local dev (Astro dev server populates `import.meta.env` from `.env.local`). Production now correctly reads `process.env`.

### Notes
- **Required Vercel env vars** (must be set in Vercel dashboard, no PUBLIC_ prefix):
  - `UPSTASH_REDIS_REST_URL`
  - `UPSTASH_REDIS_REST_TOKEN`
  - `OPENAI_API_KEY`
- Pattern rule going forward: **secrets always use `process.env` as primary, `import.meta.env` as dev fallback**. Never `import.meta.env` alone for server-side secrets.
- `decide.ts` already had the correct `import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY` pattern — the Redis module missed it.

---

## [2026-02-27] - feat(skills): agent skills — LLM tool-use for CogCage bots

**Type:** feat

### Summary
Added LLM tool-use skill system for CogCage bots. Bots can now invoke typed skills (intel, attack, defense) as discrete LLM tool calls, with results feeding back into decision context. Armory wired to skill selection.

### Changes
- `web/src/lib/skills.ts` — Skill definitions and registry (intel, combat, utility types)
- `web/src/lib/armory.ts` — Extended to store/retrieve skill selections per loadout
- `web/src/lib/lobby.ts` — `BotSnapshot` now includes `skills` field resolved from loadout
- `web/src/pages/api/armory/index.ts` — Skill persistence on save/load
- `web/src/pages/api/agent/decide.ts` — LLM tool-use invocation for equipped skills
- `web/src/lib/ws2/match-runner.ts` — Skill invocation threaded into match tick loop
- `web/src/components/MatchView.tsx` — Skill event display in battle log
- `web/src/components/Lobby.tsx` — Bot snapshot shows equipped skills
- `web/src/components/Armory.tsx` — Skill selection UI in loadout builder

### Breaking Changes
- None. Skills are optional — bots without skills fall back to base action set.

### Notes
- Skills run on a parallel async track. They do NOT block the action queue (by design — see `docs/core-thesis.md`).
- Max 3 skills per loadout enforced in `saveLoadout()`.

---

## [2026-02-27] - docs: core thesis — engine ticks independent of agent think time

**Type:** docs

### Summary
Documented the immutable core design principle: engine ticks at fixed rate (150–300ms), agents push to a queue asynchronously. Agent latency is skill expression, not a constraint to engineer around.

### Changes
- `web/docs/core-thesis.md` — Created. Defines queue architecture, OpenClaw plugin pattern, stats that matter (decision latency, tokens/decision, ticks missed).

### Breaking Changes
- None. Docs only.

### Notes
- **Implementation gap**: The current match engine (`web/src/lib/ws2/match-runner.ts`) runs client-side, synchronously polling LLM decisions. It does NOT yet implement the fixed-tick queue architecture described in `core-thesis.md`. This is the highest-priority engineering gap. See roadmap.

---

## [2026-02-27] - fix(theme): unified #1A1A1A bg across lobby/dashboard/armory

**Type:** fix

### Summary
Fixed inconsistent background colors across game screens. All game UI now uses `#1A1A1A` as the canonical dark background. Added resilient poll error handling in lobby.

### Changes
- `web/src/components/Dashboard.tsx` — Background unified to `#1A1A1A`
- `web/src/components/Lobby.tsx` — Background unified; poll failures now silent (don't block UI)
- `web/src/components/Armory.tsx` — Background unified to `#1A1A1A`

### Breaking Changes
- None.

---

## [2026-02-27] - feat(dashboard): dashboard + lobby flow

**Type:** feat

### Summary
Added full Dashboard → Create Lobby → Lobby → Arena flow. Players can now create or join lobbies, add a dummy bot for solo testing, and launch a match directly from the lobby screen.

### Changes
- `web/src/components/Dashboard.tsx` — New component. Shows player's active bot, open lobbies, create/join actions.
- `web/src/components/Lobby.tsx` — New component. Lobby state polling, dummy-bot support, start-match flow.
- `web/src/pages/api/lobby/index.ts` — Create and list open lobbies.
- `web/src/pages/api/lobby/[id].ts` — Get/delete lobby by ID.
- `web/src/pages/api/lobby/[id]/start.ts` — Start match from ready lobby.
- `web/src/pages/api/lobby/[id]/join.ts` — Join an open lobby.
- `web/src/pages/api/lobby/[id]/dummy.ts` — Add dummy guest to solo-test a lobby.
- `web/src/lib/lobby.ts` — Lobby CRUD (Redis-backed), `resolveSnapshot`, `startLobbyMatch`.
- `web/src/pages/play.astro` — Updated to render Dashboard.
- `web/src/pages/lobby/[id].astro` — New page, renders Lobby component with lobby ID.

### Breaking Changes
- `/play` now renders Dashboard (not legacy Play component).

### Notes
- Lobby TTL: 2 hours in Redis.
- `resolveSnapshot` resolves a player's loadout from armory Redis data at match-start time. If the player has no saved loadout, match start will fail with "Could not resolve loadouts". Players must visit `/armory` first.

---

## PR Changelog Rules (read before every PR)

```
## [YYYY-MM-DD] - TYPE: Short title

**Type:** feat | fix | refactor | cleanup | docs | test | chore

### Summary
[1-2 sentences: what changed and why]

### Changes
- `path/to/file.ts` — Description of change

### Breaking Changes
- [explicit list, or "None"]

### Notes
- [migration steps, known issues, context for reviewers]
```

**Rules:**
1. Append at the TOP (newest first)
2. List EVERY modified file with a description
3. Flag breaking changes — never omit this section
4. Reference Linear issue if one exists (`PREC-XXXX`)
5. If the PR fixes a bug — document the root cause, not just the symptom
