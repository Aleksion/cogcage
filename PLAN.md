# The Molt Pit — Active Plan
_Last updated: 2026-02-27 22:20 ET_

## North Star
Full playable loop: `/shell` → build crawler → `/play` → Start Tank → 3D match with LLM bots → winner → Founder CTA.

---

## Current Status

### ✅ Done
| What | Notes |
|---|---|
| cogcage.com live (HTTP 200) | TanStack Start on Vercel |
| Landing page | Locked copy, Founder CTA, DREADCLAW hero (PR #20 pending) |
| `/shell` bot builder | Card/claw selection, brain prompt, armor — saves to localStorage |
| `/play` Dashboard | Shows "Your Crawler", "Start Tank", Open Molts list |
| `/tank/:id` Lobby | Polls lobby state, Add AI Dummy, Start Molt |
| MatchView | Full 3D PlayCanvas arena + LLM runner — wired to runMatch.ts |
| PlayCanvasScene | 3D bots, movement tweening, VFX (bolts, bursts, KAPOW!/ZZT!) |
| agent.decide endpoint | Real LLM via OpenAI/Anthropic/Groq/OpenRouter, scripted AI fallback |
| DO game engine | themoltpit-engine.aleks-precurion.workers.dev — alive |
| QuickDemo on /play | Auto-starting BERSERKER vs TACTICIAN (text-only, 3D wiring in progress) |
| OPENAI_API_KEY in Vercel | Server-side LLM battles, zero user setup needed |

### 🔴 BLOCKERS (must merge before full flow works)
| PR | What | Why Critical |
|---|---|---|
| **#19** | Rename lobby→tank, armory→shell API routes | Every `/api/tank/*` and `/api/shell` call 404s — kills Shell + Tank flow entirely |

### 🟡 In Progress
| What | Agent | Branch |
|---|---|---|
| PlayCanvas 3D in QuickDemo | cc-quickdemo-3d | feat/quickdemo-3d (in PR #19) |
| DREADCLAW BattleHero on landing | (done) | feat/molt-battle-hero (PR #20) |

### ⏳ Next Up
| Task | Priority | Notes |
|---|---|---|
| End-to-end smoke test | P0 | After PR #19 merges: full flow Shell→Tank→Match |
| QuickDemo: replace text feed with MatchView | P0 | QuickDemo should use MatchView directly (has 3D + LLM already wired) |
| Tank dummy bot prompt | P1 | Dummy bot uses a default system prompt — make it interesting |
| Hardness (ELO) display | P1 | Show score on dashboard after match |
| TASK-020: Auth | P2 | Gate behind gameday — not needed for demo |
| Bot persistence (server-side) | P2 | Currently localStorage only |
| Convex for profiles + leaderboard | P3 | Post-auth |

---

## Full Flow (once PR #19 is merged)

```
User → cogcage.com/shell
  → picks claws (loadout cards)
  → writes brain prompt (strategy)
  → saves crawler

User → cogcage.com/play
  → sees "Your Crawler" card
  → clicks "Start Tank"
  → POST /api/tank → creates lobby → /tank/:id

User → /tank/:id
  → clicks "Add AI Dummy" (solo play)
  → POST /api/tank/:id/dummy → adds scripted/LLM bot
  → clicks "Start Molt"
  → POST /api/tank/:id/start → registers with DO engine
  → MatchView renders with PlayCanvas 3D arena
  → Both bots LLM-driven via /api/agent/decide
  → Real-time battle, VFX, winner screen
  → "Join Founder Pack" CTA
```

---

## Open PRs
| # | Title | Merge? |
|---|---|---|
| #19 | fix: API routes + PlayCanvas in QuickDemo | ✅ Merge ASAP |
| #20 | feat: DREADCLAW BattleHero | 👀 Review |

---

## Architecture
| Layer | Tech | Status |
|---|---|---|
| Frontend | TanStack Start (Vite + Nitro) | ✅ |
| Game engine (in-match) | Cloudflare DO | ✅ |
| LLM decisions | /api/agent/decide → OpenAI | ✅ |
| Match runner (client) | run-match.ts | ✅ |
| 3D renderer | PlayCanvas | ✅ |
| Storage (signups/intents) | Upstash Redis + SQLite | ✅ |
| Storage (bot configs) | localStorage | 🟡 temporary |
| Auth | Not built | ⏳ TASK-020 |
| Profiles + leaderboard | Not built | ⏳ post-auth |

---

## Env Vars (Vercel)
| Key | Status | Used For |
|---|---|---|
| OPENAI_API_KEY | ✅ Set | LLM battles |
| ENGINE_URL | ? Verify | DO engine URL |
| MOLTPIT_ENGINE_SECRET | ? Verify | DO engine auth |
| UPSTASH_REDIS_REST_URL | ✅ Set | Redis storage |
| UPSTASH_REDIS_REST_TOKEN | ✅ Set | Redis storage |
| PUBLIC_STRIPE_FOUNDER_URL | ❌ Not set | Founder Pack Stripe checkout |
