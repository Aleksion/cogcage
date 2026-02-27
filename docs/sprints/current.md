# Current Sprint — Phase 2

*Updated: 2026-02-27. Daedalus owns this. Update daily.*

---

## Sprint Goal

**Ship user accounts, fix multiplayer ownership, terminology rebrand, then publish to ClawHub.**

The plugin is already built. Auth unlocks the player token flow that makes it actually work end-to-end. Fixing ownership makes multiplayer real. Rebrand cements the world. ClawHub publish is the money moment.

---

## Phase 1 — DONE ✅

| Task | Status |
|---|---|
| TASK-001: MatchEngine Durable Object | ✅ Deployed to themoltpit-engine.aleks-precurion.workers.dev |
| TASK-003: DNS | ✅ workers.dev in use; custom domain deferred (CF DNS transfer needed) |
| TASK-004: MatchView → DO WebSocket | ✅ Merged |
| TASK-005: Remove client-side engine from Play | ✅ Merged |
| TASK-006: Connection stats on result screen | ✅ Merged |
| PR #9: OpenClaw skill skills/themoltpit/ | ✅ Merged |
| PR #10: MatchEngine DO | ✅ Merged |
| PR #11: MatchView WebSocket migration | ✅ Merged |
| PR #13: match-runner cleanup + connection stats | ✅ Merged |

---

## Phase 2 — In Progress

### Blocked On Aleks

| Item | What's needed |
|---|---|
| TASK-020 env vars | GITHUB_ID/SECRET, GOOGLE_ID/SECRET, AUTH_RESEND_KEY, AUTH_SECRET → add to Vercel |
| Terminology: "Hardness" vs "Temper" | One word decision (ELO rank label) — see GTM thread |
| CF DNS transfer | Move themoltpit.com to Cloudflare DNS to unlock engine.themoltpit.com custom domain |

### In Progress

| Task | Agent | Status |
|---|---|---|
| TASK-020: User accounts (Auth.js) | Spawning | 🟢 Active |
| TASK-021: Multiplayer ownership | Spawning | 🟢 Active |

### Up Next

| Task | Spec | Blocked On |
|---|---|---|
| TASK-022: Terminology rebrand | Not yet written | Hardness/Temper decision |
| TASK-023: Player profile + molt history | Not yet written | TASK-020 |
| TASK-024: Publish to ClawHub | skills/themoltpit/ ready | TASK-020 (player token) |
| TASK-025: Challenge system | Not yet written | TASK-021 |

---

## Auth Decision Log

- **Clerk** — rejected: per-MAU billing, unsuitable for consumer product at scale
- **Auth.js (NextAuth v5)** — selected: self-hosted, zero per-user cost, Redis sessions, email + OAuth

## Terminology Decision Log

| Term | Decision | Notes |
|---|---|---|
| Armory | → **The Shell** | ✅ Locked |
| Loadout | → **Shell** | ✅ Locked |
| Skills/actions | → **Claws** | ✅ Locked |
| System prompt | → **Directive** | ✅ Locked |
| Match | → **Molt** | ✅ Locked |
| Lobby | → **The Tank** | ✅ Locked |
| ELO/Rank | → **Hardness** or **Temper** | ⏳ Pending Aleks decision |
| Dashboard | → **The Den** | ✅ Locked |
| Leaderboard | → **The Ladder** | ✅ Locked |
| Bot/agent | → **Crawler** | ✅ Locked |
