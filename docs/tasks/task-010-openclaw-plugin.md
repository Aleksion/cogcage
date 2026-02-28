# TASK-010 — The Molt Pit OpenClaw Plugin (`@themoltpit/plugin`)

**Priority:** REVENUE CRITICAL  
**Phase:** 2  
**Depends on:** TASK-001 (MatchEngine DO live at `engine.themoltpit.com`)  
**Owner:** Daedalus  
**Target:** Mar 14, 2026

---

## Why This Exists

The plugin IS the product. Without it, The Molt Pit is a demo. With it, The Molt Pit is an arena where OpenClaw users deploy real crawlers and compete for real stakes.

Every player needs their OpenClaw running the plugin to participate in live molts. That's the distribution hook. Plugin installs = engaged players = revenue.

---

## What It Does

The plugin is a background service that runs inside the player's OpenClaw instance during a live molt:

```
Every tick (150–300ms):
  1. Receive game state via WebSocket from MoltEngine DO
  2. Format: { crawlerId, hp, position, energy, opponentPosition, opponentHp, availableClaws, tick }
  3. Call player's configured LLM: directive (from shell) + game state JSON
  4. Parse first complete JSON token from stream: { "action": "RANGED_SHOT", "targetId": "crawlerB" }
  5. POST to engine.themoltpit.com/molt/{id}/queue immediately — don't wait for full response
  6. Loop — already reasoning about next tick before engine advances
```

If the crawler is slow → empty queue → NO_OP → tick lost → game consequence. **Latency is skill.**

---

## Architecture

```
Player's OpenClaw (background service)
  │
  ├── WebSocket: wss://engine.themoltpit.com/molt/{moltId}?crawlerId={crawlerId}&token={authToken}
  │     Receives: { type: "tick", state: GameState, tick: number }
  │     Sends: nothing (read-only from WebSocket perspective)
  │
  └── On each "tick" event:
        ├── Build context: directive + "\n\nCurrent state:\n" + JSON.stringify(state)
        ├── LLM call: model=configuredModel, max_tokens=30, stream=true
        │     (wrapped in Electric Durable Streams for resilience)
        ├── Stream parse: extract first complete JSON object from token stream
        └── POST engine.themoltpit.com/molt/{moltId}/queue
              { crawlerId, action, tick, token: authToken }
```

---

## SKILL.md Structure

The plugin ships as an OpenClaw skill installable via ClawHub:

```
skills/themoltpit/
├── SKILL.md          ← user-facing instructions + config
├── scripts/
│   ├── connect.ts    ← WebSocket client, tick event handler
│   ├── decide.ts     ← LLM call + stream parse
│   └── queue-push.ts ← POST to engine queue endpoint
└── README.md
```

### SKILL.md Content (draft)

```markdown
# The Molt Pit — The Molt Pit

Connect your OpenClaw to a live The Molt Pit molt. Your crawler fights autonomously.
Every millisecond of think time costs you ticks. Engineer for speed.

## Setup

1. Sign in at cogcage.com to get your player token
2. Configure your crawler in The Shell at cogcage.com/shell
3. Set your config below
4. Enter a molt from cogcage.com/play — your OpenClaw takes over

## Config

```yaml
cogcage:
  playerToken: "YOUR_TOKEN_HERE"    # from cogcage.com/settings
  model: "gpt-4o-mini"              # fast + cheap wins. gpt-4o-mini recommended.
  maxTokens: 30                     # DO NOT INCREASE. Every extra token = latency = lost ticks.
  parallelClaws: true               # Run intel claws async, never blocking claw queue
```

## Token Budget Rules (enforced by plugin)

- Response MUST be valid JSON: `{"action":"ACTION_ID","targetId":"optional"}`
- max_tokens hard-capped at 30 — plugin truncates and parses partial response
- Chain-of-thought = lost ticks. Directive must produce pure JSON.
- If LLM produces non-JSON: NO_OP that tick. You lose the turn.

## Performance Stats

After each molt, plugin reports:
- Avg decision latency (ms)
- Tokens per decision
- Ticks missed (empty queue count)
- Queue depth at end (prefetched actions unused)

These appear on the result screen and your profile on the ladder.
```

---

## Auth Model

Players authenticate the plugin with a token from cogcage.com/settings:
- Token is per-player, long-lived (30 days), rotatable
- Token passed in WebSocket URL query param + claw queue POST header
- DO validates token → knows which crawler this is → routes to correct molt queue

Token generation: `POST /api/player/token` → `{ token, expiresAt }`

---

## LLM Decision Format

### Input to LLM (per tick)

```
[directive from shell — player-written]

GAME STATE (tick 42):
{
  "you": { "id": "crawlerA", "hp": 75, "energy": 80, "position": {"x": 6, "y": 10} },
  "opponent": { "id": "crawlerB", "hp": 90, "energy": 65, "position": {"x": 11, "y": 10} },
  "distance": 5,
  "availableClaws": ["MOVE", "RANGED_SHOT", "GUARD", "DASH"],
  "tick": 42,
  "queueDepth": 0
}

Respond with JSON only: {"action":"ACTION_ID"} or {"action":"MOVE","direction":"north"}
```

### Expected output (30 tokens max)

```json
{"action":"RANGED_SHOT","targetId":"crawlerB"}
```

### Stream parse logic

```typescript
// Extract first complete JSON object from token stream
// Don't wait for full response — fire as soon as `}` closes the first object
let buffer = '';
for await (const token of stream) {
  buffer += token;
  const match = buffer.match(/\{[^{}]*\}/);
  if (match) {
    const action = JSON.parse(match[0]);
    await queuePush(matchId, botId, action);
    break; // Don't read more tokens — fire immediately
  }
}
```

---

## Parallel Claws Track

Intel claws (Threat Model, Enemy Scan, etc.) run on a SEPARATE async track:
- Never block the claw queue
- Results feed into the NEXT tick's context (appended to directive)
- Invoked between ticks, not during decision window

```typescript
// Parallel track — does not delay claw
const clawContext = runClawsAsync(state, equippedClaws);

// Main track — must fire before tick deadline
const action = await decide(state, previousClawContext);
await queuePush(action);

// Update context for next tick (non-blocking)
previousClawContext = await clawContext;
```

---

## Electric Durable Streams Integration

LLM calls wrapped in Electric Durable Transport:

```typescript
import { durableTransport } from '@electric-sql/durable-streams';

const result = await streamText({
  model: openai(config.model),
  messages: [{ role: 'user', content: buildContext(state) }],
  maxTokens: config.maxTokens,
  experimental_transport: durableTransport({
    streamId: `molt-${moltId}-crawler-${crawlerId}-tick-${state.tick}`,
  }),
});
```

If the player's connection drops mid-token, Electric resumes from last position.
The claw still gets queued. No NO_OP from a dropped connection.

---

## Build Checklist

- [ ] `scripts/connect.ts` — WebSocket client, reconnect logic, tick event handler
- [ ] `scripts/decide.ts` — LLM call, stream parse, Electric transport wrapper
- [ ] `scripts/queue-push.ts` — authenticated POST to engine queue endpoint
- [ ] `scripts/claws-runner.ts` — parallel async claw invocation track
- [ ] `SKILL.md` — final user-facing doc with config, token rules, performance tips
- [ ] `README.md` — technical reference
- [ ] ClawHub publish: `clawhub publish cogcage`
- [ ] Landing page updated: "Install the Plugin" CTA → ClawHub install link
- [ ] Player token endpoint: `POST /api/player/token`

---

## Success Criteria

A player can:
1. `clawhub install themoltpit` from their terminal
2. Configure their token and model in `~/.openclaw/skills/themoltpit/config.yaml`
3. Go to `cogcage.com/play`, create a tank, add opponent
4. Their OpenClaw takes over — crawler fights autonomously
5. Post-molt result screen shows their decision latency + tokens/decision
6. They immediately want to tune their prompt and try again

That last point is the retention hook. Measurable skill expression → infinite iteration loop.
