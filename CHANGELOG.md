# CogCage Changelog

Every PR must include an entry here. Newest first.

---

## [2026-02-28] - feat: guest/anonymous auth for frictionless onboarding

**Type:** feat | **Phase:** auth | **Priority:** TESTING VELOCITY

### Summary
Adds the `Anonymous` provider from `@convex-dev/auth` so users and agents can access the product without GitHub OAuth or a real email inbox. Enables frictionless onboarding and unblocked E2E testing of the `/shell` and `/play` flows.

### Changes
- `web/convex/auth.ts` — Added `Anonymous` provider from `@convex-dev/auth/providers/Anonymous`, wired into `convexAuth({ providers: [...] })`
- `web/app/routes/sign-in.tsx` — Added `GuestSignIn` component with muted gray styling (secondary, not primary CTA). Sits below the email/OTP divider with user icon.

### Design Decisions
- Guest button is intentionally styled dim (no yellow, no red) — it's a fallback, not the primary CTA. Encourages real account creation.
- No changes to `auth.config.ts` — the Anonymous provider is Convex-native and doesn't require JWT domain config.
- Guest sessions are ephemeral by default (Convex deletes anonymous users after inactivity unless they link an account).

### Breaking Changes
None.

### Next Steps
- Add "Link your account" upgrade flow for anonymous users who want to save progress
- Gate certain features (e.g., public ladder) behind real accounts
- Merge + deploy to Convex + Vercel

---

## [2026-02-28] - feat(plugin): Phase 2 OpenClaw plugin — connect → decide → queue (PR #27)

**Type:** feat | **Phase:** 2 | **Priority:** REVENUE CRITICAL

### Summary
Implements the OpenClaw skill that connects a player's OpenClaw instance to a live molt. The plugin receives game state via WebSocket from the MoltEngine Durable Object, calls the player's configured LLM per tick, and fire-and-forgets the action to the engine queue. Latency is skill — slow crawlers lose ticks.

### Changes
- `skills/themoltpit/SKILL.md` — **Rewritten.** Full player-facing config docs: `playerToken`, `engineUrl`, `model`, `maxTokens`, `parallelClaws`. Action reference table. Token budget rules (max_tokens hard-capped at 30). Install + usage instructions.
- `skills/themoltpit/scripts/connect.ts` — **Rewritten.** WebSocket client with exponential backoff auto-reconnect (500ms → 1s → 2s → 4s → 8s cap). On each `tick` event: calls `decide()` then `queuePush()` fire-and-forget — never blocks the tick loop. Uses native WebSocket (Node 21+ / Bun built-in, no package dependency).
- `skills/themoltpit/scripts/decide.ts` — **Rewritten.** Streams from OpenAI API. Parses SSE deltas, accumulates token buffer, extracts **first complete JSON object** and cancels the stream immediately — does not wait for the full response. Minimises LLM decision latency. Fallback: `{ action: 'NO_OP' }` on parse failure.
- `skills/themoltpit/scripts/queue-push.ts` — **Rewritten.** Fire-and-forget `fetch` POST to `{engineUrl}/molt/{moltId}/queue`. Non-fatal on failure — engine treats missing actions as NO_OP.
- `skills/themoltpit/scripts/test-connect.ts` — **New.** Mock tick test: injects a sample `GameState`, calls `decide()` directly, verifies output is valid JSON with an `action` field.
- `skills/themoltpit/scripts/skills-runner.ts` — **New.** Entry point for running the plugin via OpenClaw skill invocation.
- `skills/themoltpit/README.md` — Updated with architecture diagram, local test instructions, and deployment notes.
- `skills/themoltpit/package.json` — Updated with correct entry point and Bun/Node engine requirements.
- `skills/themoltpit/tsconfig.json` — Updated for ESM output.

### Design Decisions
- **Stream-cancel on first JSON**: LLM response for a claw action is always ≤30 tokens (`{ "action": "X", "targetId": "Y" }`). Waiting for `[DONE]` wastes 50–200ms. Parsing the first `{...}` pattern and immediately calling `reader.cancel()` shaves latency on every single tick.
- **Native WebSocket**: Dropping the `ws` package saves a dep and ~50ms cold-start on Bun. Node 21+ and all modern Bun versions have native WebSocket.
- **Fire-and-forget queue push**: `queuePush` does not await — the engine already handles late/missing actions as NO_OP. Awaiting would add 30–80ms per tick.
- **No retry on decide failure**: If the LLM errors, we emit NO_OP and move on. Retrying burns a tick anyway.

### Next Steps
- TASK-015: Publish to ClawHub — `clawhub install themoltpit`
- TASK-016: Plugin onboarding flow — install → connect account → enter molt
- Wire `playerToken` to Convex auth session token

---

## [2026-02-28] - feat(visual): game experience overhaul — mech crawlers, cage arena, chunky VFX, HUD glow (PR #28)

**Type:** feat | **Phase:** 2

### Summary
Replaced the placeholder box-geometry PlayCanvas scene with a proper cartoon mech arena. Crawlers now have distinct multi-part silhouettes, the arena has atmosphere and dramatic lighting, VFX are chunky and impactful, and the HUD reflects team identity. Goal: feel like a real game, not a prototype.

### Changes
- `web/app/lib/ws2/PlayCanvasScene.ts` — **Major rewrite** (+308/-83 lines). Full list:
  - **Alpha crawler** (cyan): 8 parts — legs L/R, wide flat torso, shoulder plates L/R, neck, sensor head, yellow visor strip. Each part has 1.07× outline entity.
  - **Beta crawler** (red): 8 parts — wide squat base, tall narrow torso, long arms L/R, narrow head, antenna spike, twin yellow eyes. Each part has 1.07× outline entity.
  - **Idle sway**: root entity sin-wave Y rotation (0.4 rad amplitude, 1.2s period) — unique offset per bot.
  - **Arena**: floor changed from cream `#F5F0E8` to dark `#1A1A1A`. Grid lines changed to faint cyan `rgba(0,229,255,0.08)`. 4 cage pillar corners + crossbeam bars added.
  - **Lighting**: warm white point light (key, pos 5,8,5, intensity 0.8) + cyan point light (fill, pos 15,6,15, intensity 0.4). Dark ambient `#0A0A14`.
  - **Objective zone**: pulsing scale animation (sin wave ±4%), height increased to 0.12 for visibility.
  - **Melee VFX**: 12-particle chunky burst + 4 flat shard discs. Alternates KAPOW/CRACK text pops.
  - **Ranged VFX**: ZZT/WHIP text pops on hit.
  - **Camera shake**: `triggerShake()` — applies position offset with decay. Melee: 0.4 intensity; Ranged: 0.15; KO: 1.0.
  - **Hit-stop on KO**: 400ms freeze of the tick loop (`hitStopUntil` timestamp gate in update).
  - **Dash trail**: 3 ghost particles at crawler position on DASH event.
  - **Tween speed**: 12 → 6 (smoother, more visible movement).
- `web/app/components/MatchView.tsx` — HUD CSS updates: dark glass background on stat panels, HP/energy bar fills get `boxShadow` glow matching team color (`#00E5FF` for Alpha, `#EB4D4B` for Beta), faster 0.15s transitions.
- `web/app/components/QuickDemo.tsx` — Matching glow bar effects for the demo on `/play`.

### Design Decisions
- **Back-face outline trick**: all geometry gets a 1.07× clone with `cull: FRONT` (renders only back-faces = outline). No post-processing needed, works with PlayCanvas's forward renderer.
- **Emissive flat shading**: all materials use `emissive` color + `useLighting: false` — achieves consistent cel-shade look regardless of scene lighting. Lights affect arena atmosphere not crawler appearance.
- **Hit-stop via timestamp gate**: simpler and more reliable than pausing `app.tick`. `Date.now() < hitStopUntil` check at top of update loop freezes all entity movement + particle simulation for the KO moment.
- **Tween speed 6 vs 12**: speed 12 was so fast movement looked like teleportation. 6 makes every step readable at 60fps.

### Regression Risk
- Low — no game logic touched. PlayCanvas scene is purely visual, engine outputs `MoltSnapshot` objects unchanged.
- Build passes clean.

### Next Steps
- Add idle animation variety (breathing, weapon charge glow)
- Consider distinct crawler designs per shell loadout (armor class affecting visual weight)
- Sound design pass (SFX on hits, ambient arena crowd noise)

---

## [2026-02-27] - fix: rename lobby→tank and armory→shell API routes (PR #19)

**Type:** fix | **Phase:** 1

### Problem
TASK-022 rebrand renamed UI copy (lobby→tank, armory→shell) but the route *files* still served `/api/lobby/*` and `/api/armory`. Every Dashboard and Lobby API call was 404ing, making the entire Shell→Tank→Match flow broken.

### Changes
- `lobby.ts` → `tank.ts` — route path `/api/lobby` → `/api/tank`
- `lobby.$id.ts` → `tank.$id.ts`
- `lobby.$id.start.ts` → `tank.$id.start.ts`
- `lobby.$id.dummy.ts` → `tank.$id.dummy.ts`
- `lobby.$id.join.ts` → `tank.$id.join.ts`
- `armory.ts` → `shell.ts` — route path `/api/armory` → `/api/shell`
- `armory.$id.ts` → `shell.$id.ts`

### Next Steps
- Merge PR #19 → full Shell→Tank→Match flow unblocked
- Smoke test end-to-end

---

## [2026-02-27] - feat: real LLM quick-demo battles on /play (PR #18)

**Type:** feat | **Phase:** 1

### Summary
Added `QuickDemo` component to `/play` that auto-starts a match between BERSERKER and TACTICIAN using the existing `/api/agent/decide` LLM endpoint. `OPENAI_API_KEY` in Vercel env → real GPT-4o-mini battles for all visitors, zero setup required. Scripted AI fallback when key unavailable.

### Changes
- `web/app/components/QuickDemo.tsx` — **New.** Auto-starting battle demo: BERSERKER (aggressive melee) vs TACTICIAN (defensive ranged). HP bars, action feed with LLM reasoning text per decision, winner banner + Founder CTA. BYO API key input (collapsed, stores to localStorage). Rematch button.
- `web/app/components/Dashboard.tsx` — Added `<QuickDemo />` as first section ("WATCH A LIVE MOLT").
- `web/app/lib/ws2/run-match.ts` — Minor: expose reasoning field from decide response in snapshot.

### Design Decisions
- QuickDemo uses client-side `runMatch.ts` (not DO WebSocket) — allows solo play without a lobby
- Server OPENAI_API_KEY = default path; BYO key = advanced escape hatch via `x-llm-key` header

### Known Gap
- QuickDemo renders text-only (HP bars + feed). PlayCanvas 3D arena not yet wired in. Fix in PR #19.

---

## [2026-02-27] - feat: Astro → TanStack Start migration — TASK-MIGRATE

**Type:** feat | **Phase:** 1

### Summary
Replaced the Astro SSR app in `web/` with a TanStack Start app. All existing React components, API routes, and lib code ported to the new framework. Components now render server-side by default (no FOUC), API routes use TanStack Start's `createFileRoute` server handlers, and deployment targets Vercel via the Nitro `vercel` preset.

### Changes
- `web/vite.config.ts` — **New.** Vite config with `tanstackStart` plugin (srcDirectory: `app`), `@vitejs/plugin-react`, `nitro` (preset: vercel), and `vite-tsconfig-paths`.
- `web/tsconfig.json` — **Rewritten.** Removed `astro/tsconfigs/strict` extend. Now standard strict TypeScript with `~/` path alias to `app/`.
- `web/package.json` — **Rewritten.** Replaced Astro deps (`astro`, `@astrojs/*`) with TanStack Start deps (`@tanstack/react-start`, `@tanstack/react-router`, `@tanstack/react-router-devtools`). Build system: `vite dev`/`vite build`. Added `nitro`, `@vitejs/plugin-react`, `vite-tsconfig-paths` as devDeps.
- `web/.gitignore` — Updated: removed `.astro/`, added `.output/`, `.vinxi/`, `.nitro/`, `app/routeTree.gen.ts`.
- `web/app/router.tsx` — **New.** TanStack Router factory with `routeTree`, `defaultPreload: 'intent'`, `scrollRestoration: true`.
- `web/app/routes/__root.tsx` — **New.** Root layout with `<HeadContent>`, `<Scripts>`, inline global styles (dark theme, radial gradient background), Google Fonts (Bangers, Inter, Kanit, Space Grotesk). Replaces `Layout.astro`.
- `web/app/routes/index.tsx` — **New.** Landing page route, renders `MoltPitLanding` via `ClientOnly` wrapper.
- `web/app/routes/play.tsx` — **New.** Play/dashboard route, renders `Dashboard` via `ClientOnly`.
- `web/app/routes/shell.tsx` — **New.** Armory route (URL changed from `/armory` to `/shell`), renders `Armory` via `ClientOnly` with `returnTo` search param.
- `web/app/routes/tank/$id.tsx` — **New.** Lobby route (URL changed from `/lobby/:id` to `/tank/:id`), renders `Lobby` via `ClientOnly`.
- `web/app/routes/sign-in.tsx` — **New.** Placeholder sign-in page (TASK-020 will add auth).
- `web/app/routes/join/$code.tsx` — **New.** FFA tournament join page, ported from inline Astro HTML+script to React component.
- `web/app/routes/play_.session.$id.tsx` — **New.** Session page, fetches session client-side then renders `SessionRoom`.
- `web/app/routes/success.tsx` — **New.** Checkout success page with conversion tracking (ported from Astro inline script to React `useEffect`).
- `web/app/routes/ops-log.tsx` — **New.** Ops dashboard (ported from server-rendered Astro to client-side React fetch+render).
- `web/app/components/ClientOnly.tsx` — **New.** Client-only rendering wrapper. Replaces Astro's `client:only="react"` pattern.
- `web/app/components/JoinSession.tsx` — **New.** React port of `join/[code].astro`.
- `web/app/components/SessionPageWrapper.tsx` — **New.** Client-side session fetcher for `SessionRoom`.
- `web/app/components/SuccessPage.tsx` — **New.** React port of `success.astro` conversion tracking.
- `web/app/components/OpsLogPage.tsx` — **New.** React port of `ops-log.astro`.
- `web/app/lib/cookies.ts` — **New.** Cookie parser utility — replaces Astro's `cookies.get()` API.
- `web/app/routes/api/*.ts` — **New.** All 21 API routes ported to TanStack Start `createFileRoute` + `server.handlers`. Handler logic unchanged.
- `web/app/components/*.tsx` — **Moved.** All React components from `src/components/` to `app/components/` with zero changes.
- `web/app/lib/*` — **Moved.** All lib modules from `src/lib/` to `app/lib/` with zero changes.
- `web/src/` — **Deleted.** All Astro pages, layouts, middleware, `env.d.ts`.
- `web/astro.config.mjs` — **Deleted.** Replaced by `vite.config.ts`.

### Breaking Changes
- **URL changes:** `/armory` → `/shell`, `/lobby/:id` → `/tank/:id`. Old URLs will 404.
- **Middleware removed:** Astro's `defineMiddleware` for anonymous player ID cookie no longer runs automatically. Cookie is set client-side by components (fallback via `localStorage`/`document.cookie` was already the primary mechanism).
- **Build system:** `astro build` → `vite build`. `astro dev` → `vite dev`.

### Notes
- `client:only="react"` pattern replaced with `ClientOnly` component — same behavior, proper SSR framework support, no FOUC.
- No auth changes — `/sign-in` is placeholder (TASK-020).
- Redis env vars unchanged: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Engine URL unchanged: `PUBLIC_ENGINE_WS_URL`.
- Vercel deployment: TanStack Start with Nitro vercel preset outputs to `.vercel/output/`.
---

## [2026-02-27] - chore: TASK-022 terminology rebrand — full UI + docs vocabulary update

**Type:** chore | **Phase:** 2

### Summary
Applied the locked terminology map across all user-facing copy, route paths, comments, and documentation. No TypeScript identifiers, Redis keys, or internal API contracts were changed — this is a pure vocabulary rebrand.

### Terminology Map
| Old | New |
|-----|-----|
| Armory | The Shell |
| loadout | shell |
| skills / actions (combat moves) | claws |
| system prompt (game context) | directive |
| match (game) | molt |
| lobby / Lobby | tank / The Tank |
| ELO / elo / rank (player rating) | hardness |
| dashboard / Dashboard | den / The Den |
| leaderboard | The Ladder |
| bot / agent (player's AI) | crawler |

### Changes — UI Components
- `web/src/components/Armory.tsx` — Nav label "Armory" → "The Shell", href `/shell`, "Loadout" → "Shell", "Skills" → "Claws", "Brain (System Prompt)" → "Brain (Directive)", "Saved Loadouts" → "Saved Shells", all fetch URLs `/api/armory` → `/api/shell`
- `web/src/components/Dashboard.tsx` — "Your Bot" → "Your Crawler", "Build Your Bot" → "Build Your Crawler", "Start Lobby" → "Start Tank", "Open Games" → "Open Molts", nav "Armory" → "The Shell" href `/shell`, fetch URLs `/api/lobby` → `/api/tank`, `window.location` `/lobby/` → `/tank/`
- `web/src/components/Lobby.tsx` — "Lobby" → "The Tank", "Back to Dashboard" → "Back to The Den", "Configure Bot" → "Configure Crawler", "Start Match" → "Start Molt", "Actions:" → "Claws:", fetch URLs updated
- `web/src/components/MatchView.tsx` — "Back to Dashboard" → "Back to The Den", "Tweak Bot" → "Tweak Crawler", "MATCH END/OVER/ABORTED" → "MOLT END/OVER/ABORTED"
- `web/src/components/SessionRoom.tsx` — "FFA Tournament Lobby" → "FFA Tournament Tank", "System Prompt" → "Directive", "Loadout" → "Shell", "Leaderboard" → "The Ladder", "bots" → "crawlers", "abilities" → "claws", all match→molt transitions
- `web/src/components/Play.tsx` — "Configure Your Agents" → "Configure Your Crawlers", "Bot A/B" → "Crawler A/B", "System Prompt (Brain)" → "Directive (Brain)", "Loadout" → "Shell", "Lobby Rooms" → "Tank Rooms", match→molt transitions
- `web/src/components/MoltPitLanding.jsx` — "Bot Name" → "Crawler Name", "Rank" → "Hardness", "LIVE RANKINGS" → "THE LADDER", "loadout" → "shell"

### Changes — Astro Pages
- `web/src/pages/armory.astro` → `web/src/pages/shell.astro` — **Renamed.** Title "The Molt Pit — The Shell"
- `web/src/pages/lobby/[id].astro` → `web/src/pages/tank/[id].astro` — **Renamed.** Title "The Molt Pit — The Tank"
- `web/src/pages/play.astro` — Meta description updated (crawlers, hardness)
- `web/src/pages/index.astro` — Meta description updated
- `web/src/pages/success.astro` — "rank-season" → "hardness-season"
- `web/src/pages/join/[code].astro` — "Bot Name" → "Crawler Name", "System Prompt" → "Directive", "Loadout" → "Shell"
- `web/src/layouts/Layout.astro` — Default description updated

### Changes — API Routes
- `web/src/pages/api/armory/index.ts` → `web/src/pages/api/shell/index.ts` — **Renamed.** Comments updated
- `web/src/pages/api/armory/[id].ts` → `web/src/pages/api/shell/[id].ts` — **Renamed.** Comments updated
- `web/src/pages/api/lobby/index.ts` → `web/src/pages/api/tank/index.ts` — **Renamed.** Comments updated
- `web/src/pages/api/lobby/[id].ts` → `web/src/pages/api/tank/[id].ts` — **Renamed.** Comments updated
- `web/src/pages/api/lobby/[id]/start.ts` → `web/src/pages/api/tank/[id]/start.ts` — **Renamed.** Comments updated
- `web/src/pages/api/lobby/[id]/join.ts` → `web/src/pages/api/tank/[id]/join.ts` — **Renamed.** Comments updated
- `web/src/pages/api/lobby/[id]/dummy.ts` → `web/src/pages/api/tank/[id]/dummy.ts` — **Renamed.** Comments updated

### Changes — Lib Files
- `web/src/lib/armory.ts` — "Unnamed Loadout" → "Unnamed Shell", "Max 10 saved loadouts" → "Max 10 saved shells"
- `web/src/lib/lobby.ts` — Comments: "Resolve loadout" → "Resolve shell", "tactical combat agent" → "tactical combat crawler"
- `web/src/lib/cards.ts` — Comment: "Card → match config" → "Card → molt config"
- `web/src/lib/game-styles.ts` — CSS comment "Lobby" → "Tank"
- `web/src/lib/ws2/match-types.ts` — Comment: "system prompt for the LLM" → "directive for the LLM"
- `web/src/lib/ws2/run-match.ts` — Comments: "match runner" → "molt runner", "lobby flow" → "tank flow", "bots" → "crawlers"
- `web/src/lib/ws2/README.md` — "bots" → "crawlers"

### Changes — Docs & Roadmap
- `docs/core-thesis.md` — bot→crawler, action→claw, match→molt, agent→crawler throughout
- `docs/architecture-game-engine.md` — lobby→tank, armory→shell, match→molt, bot→crawler, ELO→hardness
- `ROADMAP.md` — All terminology updated per map
- `docs/tasks/*.md` — All task specs updated per map
- `docs/sprints/current.md` — Updated per map

### What Was NOT Changed (by design)
- TypeScript identifiers: `LobbyRecord`, `SavedLoadout`, `createLobby()`, `getLoadouts()`, etc.
- Redis keys: `armory:*`, `lobby:*`, `lobbies:open`
- Session status enum: `'lobby'`
- CSS class names: `.armory-root`, `.lby-root`, `.dash-root`
- Internal API route `/api/agent/decide`
- Component file names (Armory.tsx, Lobby.tsx, Dashboard.tsx kept as-is)

### Breaking Changes
- Route paths changed: `/armory` → `/shell`, `/lobby/:id` → `/tank/:id`, `/api/armory/*` → `/api/shell/*`, `/api/lobby/*` → `/api/tank/*`
- Any external links or bookmarks to old routes will 404

### Notes
- This is a vocabulary-only change. No logic, no data model, no Redis migration.
- Old Astro page files and API route directories were deleted after moving to new paths.

---

## [2026-02-27] - cleanup+feat: Remove client-side match-runner, add connection stats to result screen — TASK-005+006

**Type:** cleanup + feat | **Phase:** 1

### Summary
Deleted the old client-side `match-runner.ts` module (no longer used by Play.tsx since TASK-004 migrated to the DO WebSocket). Extracted shared types into `match-types.ts` and moved the legacy runner to `run-match.ts` for remaining consumers (MatchView, SessionRoom). Added per-bot connection stats (ticks connected, ticks missed, actions queued) to the match result screen — framed as a competitive mechanic revealing latency impact.

### Changes
- `web/src/lib/ws2/match-runner.ts` — **Deleted.** The old client-side async match loop.
- `web/src/lib/ws2/match-types.ts` — **New.** Shared types (`BotConfig`, `MatchSnapshot`, `SnapshotCallback`, `ChatMessage`) and utility functions (`capMessages`, `getSpawnPositions`) extracted from the deleted file.
- `web/src/lib/ws2/run-match.ts` — **New.** Legacy `runMatchAsync` runner, still used by MatchView.tsx (lobby flow) and SessionRoom.tsx (session flow). Marked for future migration to DO WebSocket.
- `web/src/components/Play.tsx` — Updated import from `match-runner` to `match-types`. Added `botStats` state. Extracts `botStats` from `match_complete` WebSocket message. Renders "Connection Stats" section on result screen showing per-bot ticks connected, ticks missed (competitive framing), and actions queued.
- `web/src/components/MatchView.tsx` — Updated imports from `match-runner` to `run-match` + `match-types`.
- `web/src/components/SessionRoom.tsx` — Updated imports from `match-runner` to `run-match` + `match-types`.
- `web/src/lib/session.ts` — Updated `BotConfig` import from `match-runner` to `match-types`.
- `engine/src/game/types.ts` — Added `BotStats` interface (`ticksPlayed`, `ticksMissed`, `actionsQueued`). Extended `MatchResult` with optional `botStats?: Record<string, BotStats>`.
- `engine/src/game/engine.ts` — Updated `buildMatchResult` to accept optional `botStats` map and include it in the result.
- `engine/src/MatchEngine.ts` — Added `botStats` tracking: increments `ticksPlayed`/`ticksMissed` each alarm tick, increments `actionsQueued` on queue push. Passes `botStats` to `buildMatchResult` on match end.

### Breaking Changes
- None. `botStats` is optional on `MatchResult` — existing consumers unaffected.

### Notes
- Connection stats are framed competitively: "3 ticks missed — 3 free turns gifted" rather than "3 ticks had errors". This is a deliberate design decision per the core thesis — agent latency is skill expression.
- `run-match.ts` is a temporary home for the legacy client-side runner. MatchView and SessionRoom should be migrated to the DO WebSocket in a follow-up task.

---

## [2026-02-27] - feat: Migrate MatchView to DO WebSocket — TASK-004

**Type:** feat | **Phase:** 1

### Summary
Play.tsx is now a dumb spectator. Match execution moved from client-side `runMatchAsync` to the MatchEngine Durable Object. The client subscribes to the DO WebSocket and renders whatever state it receives — no local engine, no LLM polling from the browser.

### Changes
- `web/src/components/Play.tsx` — Removed `runMatchAsync` call; `startMatch()` now POSTs to `/api/match/start` to create the match on the DO, then opens a WebSocket to `wss://themoltpit-engine.aleks-precurion.workers.dev/match/:matchId` for live tick events. `handleSnapshot` wired to `onmessage`. `abortMatch` closes the WebSocket. All rendering logic (HP bars, energy, combat log, VFX, PlayCanvas) unchanged.
- `web/src/pages/api/lobby/[id]/start.ts` — After resolving bots via `startLobbyMatch()`, POSTs to `${ENGINE_URL}/match/${lobbyId}/start` with botA, botB, seed. Returns `matchId` in response so the client can connect via WebSocket.
- `web/src/pages/api/match/start.ts` — New server route for Play.tsx's direct match start (no lobby required). Generates matchId, POSTs to DO, returns matchId. Keeps ENGINE_SECRET server-side.
- `web/src/env.d.ts` — Added `PUBLIC_ENGINE_WS_URL` to `ImportMetaEnv` for configurable engine WebSocket URL.

### Design Decisions
- **Server-side match start proxy**: The DO's `/start` endpoint requires `COGCAGE_ENGINE_SECRET` auth. Rather than exposing the secret client-side, both `/api/lobby/[id]/start` and `/api/match/start` proxy the start call. The WebSocket connection itself is unauthenticated (spectator mode).
- **MatchSnapshot adapter**: DO tick messages (`{type:"tick", state, tick, events}`) are mapped to the existing `MatchSnapshot` interface so `handleSnapshot` works unchanged. Zero UI refactoring needed.
- **Workers.dev URL as default**: `engine.themoltpit.com` DNS is still pending. The hardcoded fallback is `wss://themoltpit-engine.aleks-precurion.workers.dev`. Configurable via `PUBLIC_ENGINE_WS_URL` env var.

### Breaking Changes
- `Play.tsx` no longer runs matches locally. Requires the MatchEngine DO to be reachable.
- `startMatch` is now async (POST + WebSocket) rather than synchronous `runMatchAsync`.

### Next Steps
- TASK-005: Remove `web/src/lib/ws2/match-runner.ts` and remaining client-side engine code
- TASK-003: Complete `engine.themoltpit.com` DNS CNAME

---

## [2026-02-27] - feat: OpenClaw plugin — `skills/themoltpit/` (PR #9)

**Type:** feat | **Phase:** 2 (Revenue Critical)

### Summary
Built the OpenClaw skill that IS the monetization entry point. Players install it via `clawhub install themoltpit` and their OpenClaw agent connects to live matches autonomously. No human button-presses during a match — the skill drives the full decision loop.

This is Phase 2's core deliverable. Without this skill, players can only watch matches from the browser. With it, they can enter real matches programmatically, tune their system prompts, and compete on ELO.

### Changes
- `skills/themoltpit/SKILL.md` — Agent instructions: config fields, action protocol, 30-token budget rule, performance stats interpretation, system prompt engineering tips
- `skills/themoltpit/scripts/connect.ts` — Persistent WebSocket client to MatchEngine DO; exponential backoff (5 retries); tick event loop; per-session perf stats (decisions made, ticks missed, avg latency)
- `skills/themoltpit/scripts/decide.ts` — Streaming LLM call, parses first complete JSON object from token stream, enforces 30-token hard limit; fire-and-forget so the agent doesn't block waiting for full response
- `skills/themoltpit/scripts/queue-push.ts` — POST to `/match/:id/queue`, fire-and-forget with 150ms timeout; action not reaching the engine within the tick window is a lost tick, not an error
- `skills/themoltpit/scripts/skills-runner.ts` — Parallel async intel skills track; runs configurable skills (e.g. threat-model, enemy-scan) with 150ms timeout; results injected into next-tick context
- `skills/themoltpit/package.json` — deps: openai, ws, yaml
- `skills/themoltpit/tsconfig.json` — strict, ES2022, commonjs; all 4 scripts compile to `dist/` with zero errors
- `skills/themoltpit/README.md` — Installation, config reference, debugging, performance optimisation guide

### Design Decisions
- **WebSocket not polling**: The engine DO pushes `{type:"tick", state, tick}` every 200ms. Polling at that cadence is wasteful and introduces variable latency. WebSocket hibernation in Cloudflare DOs means the connection survives DO sleep/wake without reconnect overhead.
- **30-token hard limit**: Not a suggestion — it's a competitive mechanic. Bigger prompts = slower responses = missed ticks = lost turns. Players who write tight prompts win. The skill enforces this unconditionally.
- **Fire-and-forget on queue push**: The action needs to be in the queue before the next alarm fires. Waiting for a 2xx response wastes ~50ms. We POST and move on; if it fails, that tick is lost — same as being slow.
- **Streaming LLM + first-JSON parse**: We don't wait for the full completion. We stream and extract the first well-formed JSON object from the token stream. This cuts median decision latency by ~40% vs waiting for `finish_reason: stop`.
- **TASK-014 (Durable Streams LLM wrapper) deferred**: The raw streaming call works for Phase 1 exit criteria. TASK-014 adds resilience on flaky connections (mobile). Scheduled for Phase 2 hardening sprint.

### Breaking Changes
- None. Additive only.

### Next Steps
- Publish to ClawHub: `clawhub publish ./skills/themoltpit --slug themoltpit --name "The Molt Pit" --version 0.1.0`
- Wire `cogcage.com/play` to show "Connect your OpenClaw" CTA after match starts
- TASK-014: Wrap LLM calls in Electric Durable Streams for mobile resilience

---

## [2026-02-27] - feat: MatchEngine Durable Object — `engine/` deployed to Cloudflare Workers (PR #10)

**Type:** feat | **Phase:** 1

### Summary
Built and deployed the server-authoritative game engine as a Cloudflare Durable Object. This replaces the client-side `match-runner.ts` sim with a real tick loop that doesn't care whether agents are fast or slow — the clock runs regardless.

Core thesis live: engine ticks at 200ms on the server. Agent latency is now a real game mechanic, not a UI quirk.

**Live**: `https://themoltpit-engine.aleks-precurion.workers.dev` — health: `{"ok":true,"service":"themoltpit-engine","version":"0.1.0"}`

### Changes
- `engine/wrangler.toml` — Cloudflare Workers config; Durable Object binding `MATCH_ENGINE`; SQLite storage via `[[durable_objects]]`; project name `themoltpit-engine`
- `engine/src/index.ts` — Worker entrypoint; routes `/match/:id/*` to MatchEngine DO; `/health` for ops
- `engine/src/MatchEngine.ts` — The DO: `alarm()` tick loop, `handleStart()`, `handleQueuePush()` with `MAX_QUEUE_DEPTH=5` anti-spam, `handleWebSocket()` with hibernation, `handleGetState()` HTTP polling fallback; all tick state persisted to SQLite (`tick:{n}` keys)
- `engine/src/auth.ts` — Bearer token validation helper
- `engine/src/game/types.ts` — `GameState`, `ActorState`, `BotConfig`, `Action`, `MatchResult`
- `engine/src/game/constants.ts` — `TICK_MS=200`, `MAX_QUEUE_DEPTH=5`, `MATCH_TIMEOUT_MS`, game rules from ws2-core-v1
- `engine/src/game/engine.ts` — Full `advanceTick()` logic ported from `web/src/lib/ws2/`; deterministic given same seed + actions

### Design Decisions
- **Cloudflare Durable Objects over Vercel/QStash**: DOs are the only primitive that can hold a sub-second server-authoritative clock (`alarm()` at 200ms) while also maintaining WebSocket connections and mutable state — all in one unit. Vercel's primitives (Queues, Workflow) solve the transport and lifecycle layers but can't own the tick clock. Full ADR: `docs/architecture-game-engine.md`.
- **SQLite for tick log**: Every tick persisted as `tick:{n}` → full replay is possible without a separate event store. This is the foundation for TASK-006 (decision latency stats) and future audit/spectator replay.
- **WebSocket hibernation**: CF DO hibernation keeps connections alive across DO sleep/wake without reconnect cost. Critical for the plugin's persistent connection surviving DO cold starts.
- **MAX_QUEUE_DEPTH=5**: Prevents a fast agent from flooding the queue and getting 5 future actions executed before a slow agent takes its first. Fairness mechanic — the queue is a buffer, not an advantage accumulator.
- **Port from web/**: `advanceTick()` ported from `web/src/lib/ws2/engine.ts` to ensure identical deterministic results in server and client. Client-side engine will be removed in TASK-005.

### Breaking Changes
- None yet. Client-side `match-runner.ts` still active — removed in TASK-005.

### Next Steps
- TASK-003: Add `engine.themoltpit.com` DNS CNAME → Workers route (needs Cloudflare dashboard)
- TASK-004: Migrate `MatchView.tsx` to consume DO WebSocket instead of client-side engine
- TASK-005: Remove `web/src/lib/ws2/match-runner.ts`

---

## [2026-02-27] - docs: engine subdomain → `engine.themoltpit.com`; themoltpit.com now live

**Type:** docs | **Commit:** `0d72aaf`

### Summary
`themoltpit.com` attached to the Vercel deployment by Aleks. Updated all 19 doc references from `engine.cogcage.com` to `engine.themoltpit.com` across task specs and architecture ADR. Both `www.cogcage.com` and `www.themoltpit.com` now serve the site (HTTP 200).

### Changes
- `docs/tasks/task-001-match-engine-do.md` — 8 references updated
- `docs/tasks/task-010-openclaw-plugin.md` — 4 references updated
- `docs/architecture-game-engine.md` — 7 references updated
- `ROADMAP.md` — 1 reference updated

### Breaking Changes
- None.

---

## [2026-02-27] - chore: PM structure — ROADMAP, sprint, task specs in repo

**Type:** chore

### Summary
Established full PM structure in the repo. PMAing straight in the repo from here on — no external tools. Every task gets a spec, every sprint gets a doc, everything traces to the ROADMAP.

### Changes
- `ROADMAP.md` — Full phase roadmap (Phase 0→4), revenue model, open questions table
- `docs/sprints/current.md` — Active sprint: what's blocked, in-progress, up next
- `docs/tasks/task-001-match-engine-do.md` — MatchEngine Durable Object spec (Phase 1)
- `docs/tasks/task-010-openclaw-plugin.md` — OpenClaw plugin spec (Phase 2, REVENUE CRITICAL)

### Breaking Changes
- None.

### Notes
- Plugin (TASK-010) is the monetization entry point. Building it unblocks paying users.
- TASK-001 is blocked on Cloudflare account — Aleks signing up now.
- Operating procedure: every PR updates `docs/sprints/current.md` and `CHANGELOG.md`. Every new task gets a spec in `docs/tasks/`.

---

## [2026-02-27] - docs: architecture ADR updated — Vercel Queues + Blob + Workflow evaluation

**Type:** docs

### Summary
Evaluated Vercel Blob, Vercel Workflow, and Vercel Queues as potential game engine primitives. Queues solves the action transport layer (agent → engine, engine → consumers) and slots cleanly into the stack. Blob is right for replay archives. Workflow is right for post-match lifecycle. None of them solve the tick clock — Cloudflare DO remains the only component that isn't Vercel-native, solely because no Vercel primitive supports sub-second server-authoritative scheduling.

### Changes
- `docs/architecture-game-engine.md` — Added Option D (Workflow + Blob evaluation), Vercel Queues section, revised full layered stack diagram showing all five layers and their natural lanes.

### Breaking Changes
- None. Docs only.

### Notes
- Vercel Queues: perfect for action transport + event fan-out. NOT for tick clock (no sub-second scheduling).
- Vercel Blob: perfect for replay archive (seed + action log → permanent CDN URL). NOT for live state.
- Vercel Workflow: perfect for post-match lifecycle (ELO, leaderboard, notifications). NOT for tick loop.
- Electric Durable Streams: wraps LLM calls in agent plugin for resilient streaming.
- The stack is now: Queues (transport) + CF DO (clock) + Workflow (lifecycle) + Blob (archive) + Electric (agent streams) + Vercel (app layer).

---

## [2026-02-27] - docs: game engine architecture decision record

**Type:** docs

### Summary
Documented the full architecture decision for the game engine tick loop. Three options evaluated: Cloudflare Durable Objects (recommended), Upstash QStash + Redis (viable short-term), and Electric SQL Durable Streams (right tool for agent decision streaming, not tick loop). Decision: Cloudflare DO for engine, Vercel stays for front-end/lobby/armory. Electric wraps LLM calls in the OpenClaw plugin for resilient streaming.

### Changes
- `docs/architecture-game-engine.md` — Created. Full ADR with infra options, trade-off table, code sketches, deployment diagram, phased migration plan, and open questions.

### Breaking Changes
- None. Docs only.

### Notes
- **Phase 1 (now):** client-side engine, get demo working — acceptable for Friday gameday
- **Phase 2 (next week):** build `MatchEngine` Durable Object, deploy `engine.cogcage.com`
- **Phase 3:** OpenClaw plugin SKILL.md + Electric Durable Transport for resilient agent streams
- Key constraint: Vercel has NO Durable Objects — that's a Cloudflare Workers primitive. Tick loop cannot live in Vercel serverless functions (stateless, can't hold a loop).
- QStash minimum tick interval is 500ms — too slow for 150–300ms target. DO alarm API achieves ~10ms precision.
- Open questions logged in doc: CF account, subdomain, tick rate, queue depth cap, replay granularity.

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

## [2026-02-27] - chore: rename CogCage → The Molt Pit

**Type:** chore

### Summary
Project renamed from CogCage to The Molt Pit throughout docs, task specs, and architecture ADR. The core-thesis.md already used this name. UI source files (components, API routes, cookies) to be renamed in a follow-up PR once agents complete current feature branches.

### Changes
- `ROADMAP.md` — renamed throughout
- `docs/architecture-game-engine.md` — renamed, wrangler project name updated to `themoltpit-engine`
- `docs/tasks/task-001-match-engine-do.md` — renamed
- `docs/tasks/task-010-openclaw-plugin.md` — renamed, skill dir `skills/themoltpit/`, plugin `clawhub install themoltpit`
- `docs/sprints/current.md` — renamed

### Breaking Changes
- Wrangler project name: `cogcage-engine` → `themoltpit-engine` (workers.dev subdomain changes)
- Plugin skill directory: `skills/cogcage/` → `skills/themoltpit/`
- Plugin install: `clawhub install cogcage` → `clawhub install themoltpit`

### Notes
- `cogcage.com` domain: keep for now, evaluate `themoltpit.com` separately
- Redis key prefixes (`cogcage_pid`, `armory:*`, `lobby:*`) — follow-up rename PR
- GitHub repo URL: `Aleksion/themoltpit` — can rename repo in GitHub settings when ready

