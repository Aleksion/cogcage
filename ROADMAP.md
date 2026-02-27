# The Molt Pit Roadmap

*This is the source of truth for what we're building and why. Updated as strategy evolves.*
*Engineering decisions: `docs/architecture-game-engine.md` | Changelog: `CHANGELOG.md` | Active sprint: `docs/sprints/current.md`*

---

## North Star

**The Molt Pit earns money by being the arena where OpenClaw users prove their agent engineering skill.**

The monetization flywheel:
1. Players install the The Molt Pit OpenClaw plugin to enter live matches
2. Better agents = better ELO = status = more players want to compete
3. Prize pools attract serious players → premium tiers → revenue
4. Plugin distribution via ClawHub drives OpenClaw adoption (cross-sells)

**The plugin is the product.** Everything else — the engine, the UI, the armory — exists to make the plugin worth installing.

---

## Phase 0 — Foundation ✅ (Feb 27, 2026)

**Goal:** Working demo for gameday. Site live. Core loop playable.

- [x] cogcage.com live (HTTP 200)
- [x] Armory — build and save loadouts
- [x] Dashboard → Lobby → Arena flow
- [x] LLM bot decisions (`/api/agent/decide`)
- [x] Agent skills system (tool-use)
- [x] 3D cel-shade visuals (PlayCanvas mechs, bolt VFX)
- [x] Redis fix — all API routes working in production
- [x] Waitlist (Redis-backed)
- [x] Founder Pack CTA wired to Stripe
- [x] Architecture ADR committed
- [x] CHANGELOG + PM structure in repo

---

## Phase 1 — Real Engine (Target: Mar 7, 2026)

**Goal:** Server-authoritative tick loop. Engine doesn't wait for agents. Core thesis live.

See task specs: `docs/tasks/phase1-*.md`

- [ ] **TASK-001** — Cloudflare `MatchEngine` Durable Object
- [ ] **TASK-002** — Vercel Queues: action transport + event fan-out
- [ ] **TASK-003** — `engine.themoltpit.com` subdomain + wrangler deploy
- [ ] **TASK-004** — `MatchView.tsx` migrated to WebSocket consumer (no client-side engine)
- [ ] **TASK-005** — Remove client-side `match-runner.ts` (replaced by DO)
- [ ] **TASK-006** — Decision latency + tokens/decision stats on result screen

**Exit criteria:** Two OpenClaw instances can connect to a live match, push actions via queue, and lose ticks if they're too slow.

---

## Phase 2 — OpenClaw Plugin (Target: Mar 14, 2026) ⚡ REVENUE CRITICAL

**Goal:** Publish `@themoltpit/plugin` skill to ClawHub. Players install it and run their bot from their OpenClaw. This is the monetization entry point.

See task specs: `docs/tasks/phase2-*.md`

- [ ] **TASK-010** — Plugin SKILL.md spec: connect to match stream, decision loop, queue push
- [ ] **TASK-011** — WebSocket client in plugin (persistent connection to DO)
- [ ] **TASK-012** — LLM decision loop: game state → system prompt + state → stream → parse JSON → push action (max_tokens: 30 enforced)
- [ ] **TASK-013** — Model selection in SKILL.md (gpt-4o-mini default, user-swappable)
- [ ] **TASK-014** — Electric Durable Streams wrapping LLM calls (resilient on mobile)
- [ ] **TASK-015** — Publish to ClawHub: `clawhub install themoltpit`
- [ ] **TASK-016** — Plugin onboarding flow: install → connect wallet/account → enter match

**Exit criteria:** A player installs `clawhub install themoltpit`, runs their OpenClaw, and their bot fights in a live match against another player's bot. Fully autonomous — human never touches a button during the fight.

---

## Phase 3 — Monetization + Lifecycle (Target: Mar 21, 2026)

**Goal:** Revenue flowing. ELO live. Prize pools with sponsor funding.

- [ ] **TASK-020** — Vercel Workflow: post-match lifecycle (ELO compute → leaderboard → notify)
- [ ] **TASK-021** — Vercel Blob: replay archive (permanent shareable URL per match)
- [ ] **TASK-022** — Leaderboard page (`/leaderboard`) — top agents by ELO, tokens/decision, decision latency
- [ ] **TASK-023** — Season pass / credits model (pay per match entry or monthly cap)
- [ ] **TASK-024** — Sponsor prize pool infrastructure (first pool: Precurion internal)
- [ ] **TASK-025** — Match history page per player (`/profile/{id}`)
- [ ] **TASK-026** — Replay viewer (`/replay/{matchId}`) — CDN-served, deterministic playback

**Exit criteria:** A player can pay to enter a prize pool match, watch a replay of any past match, and see their ELO on the leaderboard.

---

## Phase 4 — Scale + Community (Target: Apr, 2026)

- [ ] Tournaments (bracket, scheduled, prized)
- [ ] Spectator betting (skill-based, jurisdiction-gated)
- [ ] Team matches (2v2, guild vs guild)
- [ ] Agent analytics dashboard (where am I losing ticks? why?)
- [ ] Plugin marketplace (third-party skill modules for bots)
- [ ] Discord integration (live match results → Discord)

---

## Revenue Model

| Stream | When | Notes |
|---|---|---|
| Founder Pack ($29) | Now | One-time early access |
| Match credits | Phase 3 | Pay-per-match-entry |
| Season pass | Phase 3 | Monthly cap on entries |
| Sponsor prize pools | Phase 3 | Sponsor pays pool, we take % |
| Premium plugin features | Phase 2+ | Advanced models, parallel skill tracks |
| Tournament entry | Phase 4 | % rake from prize pool |

---

## Open Questions

Track these — they block execution:

| # | Question | Blocks | Status |
|---|---|---|---|
| OQ-001 | Cloudflare account credentials / wrangler login | TASK-001, 003 | Aleks signing up |
| OQ-002 | Vercel Queues access confirmed on current plan? | TASK-002 | Check vercel.com/docs/queues/quickstart |
| OQ-003 | Target tick rate: 150ms / 200ms / 250ms? | TASK-001 | Open |
| OQ-004 | Queue depth cap per bot (max prefetched actions)? | TASK-001 | Open — recommend 3 |
| OQ-005 | Match entry fee model: credits vs. direct payment? | TASK-023 | Open |
| OQ-006 | Electric SQL account for Durable Streams? | TASK-014 | Not yet — Phase 2 |
