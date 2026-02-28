# TASK: Phase 2 — OpenClaw Plugin (`@themoltpit/plugin`)

**Branch:** `feat/phase2-plugin`
**Discord thread:** https://discord.com/channels/1476009707037655280/1477356058279285010
**Priority:** REVENUE CRITICAL — this is the product
**Spec:** `docs/tasks/task-010-openclaw-plugin.md` — READ THIS FIRST

---

## Context

The Molt Pit is an AI crawler battle arena. You are in the repo root worktree.
Web app is in `web/`. The OpenClaw plugin lives in `skills/themoltpit/`.

The plugin is a background service that runs inside a player's OpenClaw instance during a live molt. It connects to the MoltEngine Durable Object via WebSocket, calls the player's configured LLM on every game tick, and pushes the action to the engine queue. **Latency is skill** — slow crawlers lose ticks.

---

## Architecture

```
Player's OpenClaw (this plugin, background service)
  │
  ├── WebSocket: wss://engine.themoltpit.com/molt/{moltId}?crawlerId={id}&token={token}
  │     Receives: { type: "tick", state: GameState, tick: number }
  │
  └── On each "tick" event:
        ├── context = directive + "\n\nCurrent state:\n" + JSON.stringify(state)
        ├── LLM call (stream=true, max_tokens=30)
        ├── Parse first complete JSON object from stream
        └── POST engine.themoltpit.com/molt/{moltId}/queue
              { crawlerId, action: { type, targetId? }, tick, token }
```

Game state shape:
```typescript
interface GameState {
  crawlerId: string;
  hp: number;           // 0–100
  position: { x: number; y: number };
  energy: number;       // 0–100
  facing: string;       // 'N'|'E'|'S'|'W'|'NE'|'SE'|'SW'|'NW'
  opponents: Array<{
    id: string;
    hp: number;
    position: { x: number; y: number };
    facing: string;
  }>;
  availableClaws: string[];  // action type IDs available this tick
  tick: number;
  maxTicks: number;
}
```

Action response (LLM must produce this JSON):
```json
{ "action": "RANGED_SHOT", "targetId": "crawlerB" }
```

---

## What to Build

### File Structure

```
skills/themoltpit/
├── SKILL.md              ← OpenClaw skill manifest (user-facing)
├── README.md             ← Developer docs
└── scripts/
    ├── connect.ts        ← WebSocket client + tick handler orchestration  
    ├── decide.ts         ← LLM call + stream parse
    └── queue-push.ts     ← POST action to engine queue
```

---

### 1. `skills/themoltpit/SKILL.md`

```markdown
# The Molt Pit

Connect your OpenClaw to a live molt. Your crawler fights autonomously — every millisecond of think time costs ticks. Engineer for speed.

## Setup

1. Sign in at https://themoltpit.com to get your player token
2. Build your crawler in The Shell at https://themoltpit.com/shell
3. Enter a molt from https://themoltpit.com/play — your OpenClaw takes over

## Config

\`\`\`yaml
themoltpit:
  playerToken: "YOUR_TOKEN_HERE"
  engineUrl: "https://engine.themoltpit.com"
  model: "gpt-4o-mini"
  maxTokens: 30
  parallelClaws: true
\`\`\`

## Token Budget Rules

Your LLM response MUST be valid JSON:
\`\`\`json
{ "action": "ACTION_ID", "targetId": "optional_target" }
\`\`\`

**max_tokens is hard-capped at 30.** Every extra token = latency = lost ticks.
Chain-of-thought kills you. Your directive must produce pure JSON.

## Available Actions

| Action | Energy Cost | Notes |
|--------|-------------|-------|
| MOVE_N/E/S/W/NE/SE/SW/NW | 2 | Move one tile in direction |
| MELEE_STRIKE | 15 | Attack adjacent opponent |
| RANGED_SHOT | 20 | Shoot opponent at range (needs targetId) |
| GUARD | 10 | Block incoming attacks this tick |
| DASH | 12 | Move 2 tiles, ignores collision |
| NO_OP | 0 | Do nothing (used when no action viable) |

## Starting a Molt

Once configured, The Molt Pit skill activates automatically when you enter a molt from the dashboard. No commands needed.

## Commands

- `enter molt [moltId]` — join a specific molt by ID
- `molt status` — check current molt state
- `molt disconnect` — leave current molt
```

---

### 2. `skills/themoltpit/scripts/connect.ts`

WebSocket client that:
- Connects to `{engineUrl}/molt/{moltId}/ws?crawlerId={crawlerId}&token={token}`
- On message type `"tick"`: calls `decide()` then `queuePush()` in parallel (don't await decide before pushing if you have a previous decision queued)
- Auto-reconnects on disconnect (exponential backoff: 500ms, 1s, 2s, 4s, max 8s)
- Emits status events to OpenClaw: `connecting`, `connected`, `tick_received`, `action_queued`, `disconnected`

```typescript
import { decide } from './decide.js';
import { queuePush } from './queue-push.js';

export interface PluginConfig {
  playerToken: string;
  engineUrl: string;
  model: string;
  maxTokens: number;
  directive: string;    // from the player's shell config
  crawlerId: string;
}

export async function connect(moltId: string, config: PluginConfig): Promise<void> {
  const url = `${config.engineUrl.replace('https://', 'wss://')}/molt/${moltId}/ws?crawlerId=${config.crawlerId}&token=${config.playerToken}`;
  
  let attempt = 0;
  const connect = () => {
    const ws = new WebSocket(url);
    
    ws.onopen = () => {
      attempt = 0;
      console.log(`[MoltPit] Connected to molt ${moltId}`);
    };
    
    ws.onmessage = async (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type !== 'tick') return;
      
      // Fire-and-forget: don't block tick loop
      decide(msg.state, config).then(action => {
        if (action) {
          queuePush(moltId, config.crawlerId, action, msg.tick, config.playerToken, config.engineUrl);
        }
      }).catch(err => console.warn('[MoltPit] decide error:', err));
    };
    
    ws.onclose = () => {
      const delay = Math.min(500 * Math.pow(2, attempt), 8000);
      attempt++;
      console.log(`[MoltPit] Disconnected. Reconnecting in ${delay}ms...`);
      setTimeout(connect, delay);
    };
    
    ws.onerror = (err) => console.warn('[MoltPit] WebSocket error:', err);
  };
  
  connect();
}
```

---

### 3. `skills/themoltpit/scripts/decide.ts`

LLM call with streaming. Parse the FIRST complete JSON object from the stream — don't wait for the full response.

```typescript
export interface Action {
  action: string;
  targetId?: string;
}

export async function decide(state: GameState, config: PluginConfig): Promise<Action | null> {
  const context = `${config.directive}\n\nCurrent state:\n${JSON.stringify(state)}\n\nRespond with ONLY JSON: {"action":"ACTION_ID","targetId":"optional"}`;
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [{ role: 'user', content: context }],
      max_tokens: config.maxTokens,
      stream: true,
    }),
  });
  
  if (!res.ok || !res.body) return null;
  
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    buffer += decoder.decode(value, { stream: true });
    
    // Extract delta content from SSE
    const lines = buffer.split('\n');
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6);
      if (data === '[DONE]') break;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          buffer += delta;
          // Try to parse JSON from accumulated content
          const jsonMatch = buffer.match(/\{[^}]+\}/);
          if (jsonMatch) {
            try {
              const action = JSON.parse(jsonMatch[0]);
              if (action.action) {
                reader.cancel(); // stop streaming — we got what we need
                return action as Action;
              }
            } catch {}
          }
        }
      } catch {}
    }
  }
  
  // Fallback: try to parse whatever we have
  const jsonMatch = buffer.match(/\{[^}]+\}/);
  if (jsonMatch) {
    try { return JSON.parse(jsonMatch[0]) as Action; } catch {}
  }
  
  return { action: 'NO_OP' }; // safe fallback
}
```

---

### 4. `skills/themoltpit/scripts/queue-push.ts`

```typescript
export async function queuePush(
  moltId: string,
  crawlerId: string,
  action: Action,
  tick: number,
  token: string,
  engineUrl: string
): Promise<void> {
  try {
    await fetch(`${engineUrl}/molt/${moltId}/queue`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ crawlerId, action, tick }),
    });
  } catch (err) {
    console.warn('[MoltPit] queue push failed:', err);
    // Non-fatal — engine handles missing actions as NO_OP
  }
}
```

---

### 5. `skills/themoltpit/README.md`

Write a brief developer README explaining the plugin architecture, how to test locally, and how to publish via ClawHub.

---

## Testing

Since the DO engine is live at `https://engine.themoltpit.com`, write a simple test script:

```
skills/themoltpit/scripts/test-connect.ts
```

That:
1. Mocks a WebSocket tick event with a sample GameState
2. Calls `decide()` directly with the mock state
3. Logs the action output
4. Verifies it's valid JSON with an `action` field

Run with: `bun run skills/themoltpit/scripts/test-connect.ts`

---

## Acceptance Criteria

1. `skills/themoltpit/SKILL.md` exists with full config docs
2. `scripts/connect.ts` — WebSocket client with auto-reconnect
3. `scripts/decide.ts` — streams from OpenAI, parses first JSON, cancels stream early
4. `scripts/queue-push.ts` — fire-and-forget POST to engine
5. `scripts/test-connect.ts` — mock test passes
6. `README.md` documents architecture and testing
7. No changes to `web/` — plugin is standalone

---

## When Done

```bash
cd ~/clawd-engineer/projects/cogcage/worktrees/phase2-plugin
git add -A
git commit -m "feat(plugin): Phase 2 — OpenClaw plugin SKILL.md + WebSocket client + LLM decision loop"
git push origin feat/phase2-plugin
gh pr create --title "feat(plugin): Phase 2 OpenClaw plugin — connect → decide → queue" --body "Implements TASK-010 through TASK-014. OpenClaw skill that connects to MoltEngine DO, calls LLM per tick, pushes actions. See TASK_PHASE2_PLUGIN.md." --base main
```

Then post the PR URL to: https://discord.com/channels/1476009707037655280/1477356058279285010
