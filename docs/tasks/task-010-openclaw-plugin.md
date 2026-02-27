# TASK-010 — The Molt Pit OpenClaw Plugin (`@themoltpit/plugin`)

**Priority:** REVENUE CRITICAL  
**Phase:** 2  
**Depends on:** TASK-001 (MatchEngine DO live at `engine.cogcage.com`)  
**Owner:** Daedalus  
**Target:** Mar 14, 2026

---

## Why This Exists

The plugin IS the product. Without it, The Molt Pit is a demo. With it, The Molt Pit is an arena where OpenClaw users deploy real agents and compete for real stakes.

Every player needs their OpenClaw running the plugin to participate in live matches. That's the distribution hook. Plugin installs = engaged players = revenue.

---

## What It Does

The plugin is a background service that runs inside the player's OpenClaw instance during a live match:

```
Every tick (150–300ms):
  1. Receive game state via WebSocket from MatchEngine DO
  2. Format: { botId, hp, position, energy, opponentPosition, opponentHp, availableActions, tick }
  3. Call player's configured LLM: system prompt (from armory) + game state JSON
  4. Parse first complete JSON token from stream: { "action": "RANGED_SHOT", "targetId": "botB" }
  5. POST to engine.cogcage.com/match/{id}/queue immediately — don't wait for full response
  6. Loop — already reasoning about next tick before engine advances
```

If the agent is slow → empty queue → NO_OP → tick lost → game consequence. **Latency is skill.**

---

## Architecture

```
Player's OpenClaw (background service)
  │
  ├── WebSocket: wss://engine.cogcage.com/match/{matchId}?botId={botId}&token={authToken}
  │     Receives: { type: "tick", state: GameState, tick: number }
  │     Sends: nothing (read-only from WebSocket perspective)
  │
  └── On each "tick" event:
        ├── Build context: system_prompt + "\n\nCurrent state:\n" + JSON.stringify(state)
        ├── LLM call: model=configuredModel, max_tokens=30, stream=true
        │     (wrapped in Electric Durable Streams for resilience)
        ├── Stream parse: extract first complete JSON object from token stream
        └── POST engine.cogcage.com/match/{matchId}/queue
              { botId, action, tick, token: authToken }
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

Connect your OpenClaw to a live The Molt Pit match. Your agent fights autonomously.
Every millisecond of think time costs you ticks. Engineer for speed.

## Setup

1. Sign in at cogcage.com to get your player token
2. Configure your bot in the Armory at cogcage.com/armory
3. Set your config below
4. Enter a match from cogcage.com/play — your OpenClaw takes over

## Config

```yaml
cogcage:
  playerToken: "YOUR_TOKEN_HERE"    # from cogcage.com/settings
  model: "gpt-4o-mini"              # fast + cheap wins. gpt-4o-mini recommended.
  maxTokens: 30                     # DO NOT INCREASE. Every extra token = latency = lost ticks.
  parallelSkills: true              # Run intel skills async, never blocking action queue
```

## Token Budget Rules (enforced by plugin)

- Response MUST be valid JSON: `{"action":"ACTION_ID","targetId":"optional"}`
- max_tokens hard-capped at 30 — plugin truncates and parses partial response
- Chain-of-thought = lost ticks. System prompt must produce pure JSON.
- If LLM produces non-JSON: NO_OP that tick. You lose the turn.

## Performance Stats

After each match, plugin reports:
- Avg decision latency (ms)
- Tokens per decision
- Ticks missed (empty queue count)
- Queue depth at end (prefetched actions unused)

These appear on the result screen and your profile leaderboard.
```

---

## Auth Model

Players authenticate the plugin with a token from cogcage.com/settings:
- Token is per-player, long-lived (30 days), rotatable
- Token passed in WebSocket URL query param + action queue POST header
- DO validates token → knows which bot this is → routes to correct match queue

Token generation: `POST /api/player/token` → `{ token, expiresAt }`

---

## LLM Decision Format

### Input to LLM (per tick)

```
[system prompt from armory — player-written]

GAME STATE (tick 42):
{
  "you": { "id": "botA", "hp": 75, "energy": 80, "position": {"x": 6, "y": 10} },
  "opponent": { "id": "botB", "hp": 90, "energy": 65, "position": {"x": 11, "y": 10} },
  "distance": 5,
  "availableActions": ["MOVE", "RANGED_SHOT", "GUARD", "DASH"],
  "tick": 42,
  "queueDepth": 0
}

Respond with JSON only: {"action":"ACTION_ID"} or {"action":"MOVE","direction":"north"}
```

### Expected output (30 tokens max)

```json
{"action":"RANGED_SHOT","targetId":"botB"}
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

## Parallel Skills Track

Intel skills (Threat Model, Enemy Scan, etc.) run on a SEPARATE async track:
- Never block the action queue
- Results feed into the NEXT tick's context (appended to system prompt)
- Invoked between ticks, not during decision window

```typescript
// Parallel track — does not delay action
const skillContext = runSkillsAsync(state, equippedSkills);

// Main track — must fire before tick deadline
const action = await decide(state, previousSkillContext);
await queuePush(action);

// Update context for next tick (non-blocking)
previousSkillContext = await skillContext;
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
    streamId: `match-${matchId}-bot-${botId}-tick-${state.tick}`,
  }),
});
```

If the player's connection drops mid-token, Electric resumes from last position.
The action still gets queued. No NO_OP from a dropped connection.

---

## Build Checklist

- [ ] `scripts/connect.ts` — WebSocket client, reconnect logic, tick event handler
- [ ] `scripts/decide.ts` — LLM call, stream parse, Electric transport wrapper
- [ ] `scripts/queue-push.ts` — authenticated POST to engine queue endpoint
- [ ] `scripts/skills-runner.ts` — parallel async skill invocation track
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
3. Go to `cogcage.com/play`, create a lobby, add opponent
4. Their OpenClaw takes over — bot fights autonomously
5. Post-match result screen shows their decision latency + tokens/decision
6. They immediately want to tune their prompt and try again

That last point is the retention hook. Measurable skill expression → infinite iteration loop.
