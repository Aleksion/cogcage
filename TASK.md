# Task: Real LLM Quick-Demo Battle on /play

## Context
The Molt Pit (cogcage.com) — AI agent battle game. Framework: TanStack Start (Vite + Nitro).
Repo: `~/clawd-engineer/projects/cogcage/repo` — work in worktree (current dir).
Web app: `web/` subdirectory. Run `cd web && bun install` first.

## What Exists (DO NOT REWRITE)
- `web/app/routes/api/agent.decide.ts` — POST endpoint, real LLM calls (OpenAI/Anthropic/Groq/OpenRouter), scripted AI fallback
- `web/app/lib/ws2/run-match.ts` — client-side match runner, calls /api/agent/decide per tick
- `web/app/components/Play.tsx` — full battle view UI (grid, HP bars, action feed) — uses DO WebSocket
- `web/app/components/MatchView.tsx` — another battle view using run-match.ts
- `web/app/components/Dashboard.tsx` — what /play renders now (bot management)
- `web/app/lib/ws2/match-types.ts` — BotConfig, MatchSnapshot types

## What to Build

### 1. QuickDemo component (`web/app/components/QuickDemo.tsx`)
A self-contained battle demo component that:
- Auto-starts a match on mount between two pre-configured bots (no lobby needed)
- Uses `runMatch()` from `run-match.ts` 
- Shows: grid map, HP bars for both bots, scrolling action feed with reasoning
- Bot configs with cool names + distinct strategies:
  - Bot A: "BERSERKER" — aggro, melee-focused, "Rush the enemy. Attack at every opportunity. Never retreat."
  - Bot B: "TACTICIAN" — defensive, ranged, "Maintain optimal range. Use GUARD when low energy. Snipe from distance."
- Action feed shows each decision with reasoning: e.g. "⚔️ BERSERKER: MELEE_STRIKE — 'Enemy in range, press the advantage'"
- At match end: show winner banner + "Rematch" button + Founder Pack CTA
- If OPENAI_API_KEY not set server-side → scripted AI (still shows reasoning from pattern matching)

### 2. BYO API Key input
- Small collapsible section: "🔑 Use your own AI key"
- Single text input for OpenAI API key, stored to localStorage as `moltpit_llm_key`
- When set, passes `x-llm-key` + `x-llm-provider: openai` headers to /api/agent/decide calls
- Shows green badge "AI-powered" when key is active, gray "Scripted AI" when not

### 3. Wire into Dashboard.tsx
- Add `<QuickDemo />` as the FIRST section in Dashboard, above "Your Crawler"
- Put a divider between QuickDemo and the "Your Crawler" management section
- Section title: "WATCH A LIVE MOLT"

### 4. Reasoning display
In run-match.ts (or in QuickDemo), capture the `reasoning` field from each /api/agent/decide response.
The response is: `{ action: { type, dir, targetId, reasoning }, skillUsed, skillResult }`
Show reasoning in the action feed as quoted text under each action.

## Key Types (for reference)
```ts
interface BotConfig {
  id: string;
  name: string;
  systemPrompt: string;
  loadout: string[];
  armor: 'light' | 'medium' | 'heavy';
  position: { x: number; y: number };
  temperature?: number;
  llmHeaders?: Record<string, string>;
  brainPrompt?: string;
  skills?: string[];
}
```

Valid loadout actions: `MOVE`, `MELEE_STRIKE`, `RANGED_SHOT`, `GUARD`, `DASH`, `UTILITY`

## Implementation Notes
- Client-side only (use ClientOnly wrapper if needed for SSR)
- Don't touch landing page, API routes, or existing battle views
- Keep styles consistent: Bangers/Kanit fonts, #FFD600 yellow, #EB4D4B red, #00E5FF cyan, #1A1A1A dark
- Mobile-first
- The grid in Play.tsx is complex — for QuickDemo, a simple text-based feed + HP bars is fine (no need to reimplement the full grid). Use existing MatchView.tsx if it's simpler.

## Check MatchView.tsx first
Read `web/app/components/MatchView.tsx` — it may already have everything needed. If it's close to what we want, just wire it into Dashboard instead of building QuickDemo from scratch.

## Success Criteria
- `/play` shows a live battle auto-starting between two bots
- Action feed shows each bot's reasoning text
- "Rematch" button works
- BYO API key input → battles use real LLM
- No TypeScript errors (`cd web && bun run build` passes)
- Commit to current branch

## Finish
When done:
1. `cd web && bun run build` — must pass cleanly
2. `git add -A && git commit -m "feat: real LLM quick-demo battles on /play"`
3. `git push origin feat/llm-quick-battles`
4. `gh pr create --title "feat: real LLM quick-demo battles on /play" --body "Adds auto-starting battle demo with LLM reasoning display. BYO API key support. Closes the gameday demo gap." --base main`
5. Run: `openclaw system event --text "Done: LLM quick-demo battles built — PR open for review" --mode now`
