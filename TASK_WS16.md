# WS16 — BYO OpenClaw Agent

## Decision (Aleks, Mar 1 2026)
The real product is BYO agent. Players bring their own OpenClaw instance as the decision engine. Platform manages weapons/addons (Shell, Claws, Trait) — stat modifiers + context injected into every game state payload. Directive slot is replaced by webhook config for BYO users. Platform GPT-4o-mini is the fallback for users without their own agent.

## What Already Exists
- `web/app/routes/api/agent.external.ts` — proxy endpoint: receives `{webhookUrl, payload}`, forwards to player's URL, returns action. HTTPS only, 4s timeout, falls back to NO_OP.
- `runMatchAsync` in `run-match.ts` — accepts `apiBase` param, supports per-bot headers via `llmHeaders`
- `BotConfig` in `match-types.ts` — has `systemPrompt`, `loadout`, `armor`, `brainPrompt`

## What Needs Building

### 1. `BotConfig` extension — add `webhookUrl?: string`
In `web/app/lib/ws2/match-types.ts`, add optional `webhookUrl` field to `BotConfig`.

### 2. `run-match.ts` — route BYO decisions through `agent.external.ts`
In `fetchDecision`, if `bot.webhookUrl` is set:
- Call `/api/agent/external` with `{ webhookUrl: bot.webhookUrl, payload: { gameState, actorId, opponentIds, mold: { shell, claws, trait }, validActions } }`
- Otherwise call the existing `apiBase` (decide-stream) as today

```ts
// In fetchDecision, add webhookUrl param
async function fetchDecision(
  apiBase: string,
  gameState: any,
  actorId: string,
  opponentId: string,
  systemPrompt: string,
  loadout: string[],
  timeoutMs: number,
  extraHeaders?: Record<string, string>,
  brainPrompt?: string,
  skills?: string[],
  webhookUrl?: string,  // NEW
)

// At top of function body:
if (webhookUrl) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const res = await fetch('/api/agent/external', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        webhookUrl,
        payload: {
          gameState,
          actorId,
          opponentIds: opponentId ? [opponentId] : [],
          loadout,
          validActions: loadout,
        },
      }),
      signal: controller.signal,
    })
    clearTimeout(timer)
    if (!res.ok) return { type: 'NO_OP' }
    const data = await res.json()
    return data?.action ?? { type: 'NO_OP' }
  } catch {
    clearTimeout(timer)
    return { type: 'NO_OP' }
  }
}
// else fall through to existing decide-stream logic
```

Also pass `webhookUrl` through from `runMatchAsync` → `fetchDecision` via `botMap`.

### 3. `parts.ts` — add `composeMold` webhook support
In `composeMold`, add optional `webhookUrl` param. If provided, set it on the returned BotConfig.

### 4. `MoldBuilder.tsx` — BYO agent connection UI

Add at the **top** of the MoldBuilder, above the slot rows:

```
┌─────────────────────────────────────────────────────┐
│  ⚡ YOUR AGENT  (optional)                           │
│  ┌─────────────────────────────────────────────────┐│
│  │ https://your-openclaw-instance.com/agent/decide ││
│  └─────────────────────────────────────────────────┘│
│  Connect your OpenClaw instance to pilot this        │
│  crawler. Leave empty to use Molt Pit's AI.          │
└─────────────────────────────────────────────────────┘
```

Style: cyan border `rgba(0,229,255,0.4)`, dark bg, mono font (IBM Plex Mono). Input placeholder: `https://your-openclaw.com/agent/decide`.

**When webhook URL is entered and valid:**
- Hide the DIRECTIVE row entirely (your agent IS the directive)
- Show a green "AGENT CONNECTED" badge next to the section header
- Brief description: "Your agent receives game state JSON every decision tick and returns an action."

**When webhook URL is empty:**
- Show DIRECTIVE row as normal (platform fallback)

**Pass webhookUrl through `onConfirm`:**
```ts
interface MoldBuilderProps {
  onConfirm: (
    playerMold: Part[],
    opponentMold: Part[],
    playerName: string,
    webhookUrl?: string,  // NEW
  ) => void
}
```

### 5. `demo.tsx` — pass webhookUrl into CinematicBattle
```tsx
const [webhookUrl, setWebhookUrl] = useState<string | undefined>()

// In onConfirm handler:
setWebhookUrl(url)

// Pass to CinematicBattle:
<CinematicBattle
  seed={seed}
  playerMold={playerMold}
  opponentMold={opponentMold}
  playerName={playerName}
  webhookUrl={webhookUrl}  // NEW
/>
```

### 6. `CinematicBattle.tsx` — pass webhookUrl into bot config
```tsx
interface Props {
  seed?: number
  playerMold?: Part[] | null
  opponentMold?: Part[] | null
  playerName?: string
  webhookUrl?: string  // NEW
}

// In component:
const playerBot = composeMold(
  playerMold ?? DEFAULT_PLAYER_MOLD,
  'botA',
  playerName ?? 'YOUR CRAWLER',
  { x: 4, y: 10 },
  0.8,
  webhookUrl,  // NEW param
)
```

### 7. BrainStream — show CONNECTED state for BYO
When `webhookUrl` is set for a bot, the left brain panel should show:
- Header: "⚡ YOUR AGENT" (instead of "BERSERKER BRAIN")  
- Status dot: cyan pulse
- Reasoning text: show the raw action returned by webhook (e.g., "→ MOVE E") rather than LLM streaming text
- History: show action log per tick

## Payload Contract (what your OpenClaw agent receives)

```json
{
  "gameState": {
    "tick": 42,
    "actors": {
      "botA": { "hp": 85, "position": {"x": 6, "y": 10}, "facing": "E" },
      "botB": { "hp": 60, "position": {"x": 14, "y": 10}, "facing": "W" }
    },
    "events": [...last 10 events],
    "ended": false
  },
  "actorId": "botA",
  "opponentIds": ["botB"],
  "loadout": ["MOVE", "MELEE_STRIKE", "DASH", "GUARD"],
  "validActions": ["MOVE", "MELEE_STRIKE", "DASH", "GUARD"]
}
```

Your agent must return:
```json
{"action": {"type": "MOVE", "dir": "E"}}
// or
{"action": {"type": "MELEE_STRIKE", "targetId": "botB"}}
// or
{"action": {"type": "GUARD"}}
// or
{"action": {"type": "DASH", "dir": "NE"}}
```

## OpenClaw Integration Notes
Add a helper text block below the webhook input explaining how to set up your OpenClaw agent. Keep it brief:

```
HOW TO CONNECT
1. In OpenClaw, create a new skill that handles POST /agent/decide
2. It receives game state JSON each turn
3. Return {"action":{"type":"MOVE","dir":"E"}}
4. Your Shell/Claws/Trait still apply as stat modifiers
```

Or link to docs (placeholder URL for now: `https://docs.cogcage.com/byo-agent`).

## Success Criteria
1. MoldBuilder shows "YOUR AGENT" input at top — entering a valid URL hides Directive row, shows CONNECTED badge
2. Empty URL → Directive row visible, platform LLM runs (existing behavior unchanged)
3. With a valid webhook URL → `run-match.ts` routes decisions through `agent.external.ts`
4. Brain panel shows "⚡ YOUR AGENT" label + action log when BYO is active
5. Screenshot-verify both states (no webhook, and webhook connected) before pushing PR
6. Build must pass: `npm --prefix web run build`

## Branch
```bash
# In ws15 worktree (already on main after rebase):
git checkout -b feat/ws16-byo-agent
```

## Dev Setup
```bash
cd web
# .env.local already present
npm install
npm run dev
# Visit http://localhost:3000/demo
# Test BYO by pointing webhook at a local echo server:
# node -e "require('http').createServer((req,res)=>{res.end(JSON.stringify({action:{type:'MOVE',dir:'E'}}))}).listen(9999)"
# Use ngrok or similar to expose localhost:9999 as HTTPS
```

## Visual Verification (MANDATORY)
```bash
# Screenshot 1: MoldBuilder with no webhook (Directive row visible)
agent-browser open http://localhost:3000/demo
agent-browser screenshot --full /tmp/ws16-no-webhook.png

# Screenshot 2: MoldBuilder with webhook URL entered (Directive hidden, CONNECTED badge)
# (use browser actions to fill the input then screenshot)
agent-browser screenshot --full /tmp/ws16-webhook-connected.png
```
