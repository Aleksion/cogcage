# TASK: Agent Skills — LLM Tool-Use for CogCage Agents

## Vision
Skills are callable tools the LLM agent invokes during a match — exactly like Anthropic's tool_use / MCP.

On each turn the agent:
1. Receives game state + list of equipped skill tool definitions
2. Optionally calls a skill (the LLM issues a `tool_use` block)
3. Engine executes the skill, returns result to LLM
4. LLM issues its final action (MOVE/MELEE_STRIKE/RANGED_SHOT/GUARD/DASH)

This makes agent design real: players aren't just writing prompts, they're building tool-using agents with actual capabilities.

---

## Part 1 — Skill Definitions

### File: `web/src/lib/skills.ts` (NEW)

```typescript
export interface SkillDefinition {
  id: string;
  name: string;
  description: string;     // shown to player in UI
  llmDescription: string;  // injected into LLM tool definition (what the model sees)
  inputSchema: object;     // JSON Schema for tool parameters (can be {} if no params)
  energyCost: number;      // energy spent when invoked
  cooldownTurns: number;   // 0 = no cooldown
  usesPerMatch: number;    // -1 = unlimited
  icon: string;            // emoji
  rarity: 'common' | 'rare' | 'legendary';
  category: 'intel' | 'combat' | 'utility' | 'control';
}
```

### The Skill Pool (10 skills)

```typescript
export const SKILL_POOL: SkillDefinition[] = [
  {
    id: 'scan_enemy',
    name: 'Enemy Scan',
    description: 'Reveals the enemy\'s intended action this turn before you decide.',
    llmDescription: 'Scan the enemy to reveal their planned action for this turn. Returns their intended action type.',
    inputSchema: {},
    energyCost: 8,
    cooldownTurns: 2,
    usesPerMatch: -1,
    icon: '🔍',
    rarity: 'rare',
    category: 'intel',
  },
  {
    id: 'threat_model',
    name: 'Threat Model',
    description: 'Full tactical analysis: threat level, recommended response, predicted enemy next 2 turns.',
    llmDescription: 'Run a threat model on the current game state. Returns threat level (low/medium/high/critical), recommended_action, and predicted_enemy_moves for next 2 turns.',
    inputSchema: {},
    energyCost: 12,
    cooldownTurns: 3,
    usesPerMatch: -1,
    icon: '🧠',
    rarity: 'legendary',
    category: 'intel',
  },
  {
    id: 'predict_attack',
    name: 'Attack Prediction',
    description: 'Estimates probability the enemy will attack this turn (0-100%).',
    llmDescription: 'Predict whether the enemy will attack this turn. Returns attack_probability (0-100), confidence (low/medium/high).',
    inputSchema: {},
    energyCost: 4,
    cooldownTurns: 1,
    usesPerMatch: -1,
    icon: '🎯',
    rarity: 'common',
    category: 'intel',
  },
  {
    id: 'optimal_position',
    name: 'Optimal Position',
    description: 'Calculates the best cell to move to given your loadout and enemy position.',
    llmDescription: 'Calculate the optimal position to move to this turn. Returns target_position {x, y}, reasoning, and expected_advantage.',
    inputSchema: {},
    energyCost: 5,
    cooldownTurns: 1,
    usesPerMatch: -1,
    icon: '📍',
    rarity: 'common',
    category: 'intel',
  },
  {
    id: 'heal',
    name: 'Combat Stim',
    description: 'Inject combat stimulants. Restores 20 HP. Once per match.',
    llmDescription: 'Use a combat stim to restore 20 HP. Single use per match.',
    inputSchema: {},
    energyCost: 20,
    cooldownTurns: 0,
    usesPerMatch: 1,
    icon: '💉',
    rarity: 'rare',
    category: 'utility',
  },
  {
    id: 'emp_burst',
    name: 'EMP Burst',
    description: 'Drain 30 energy from the enemy. Disrupts their next action.',
    llmDescription: 'Fire an EMP burst at the enemy, draining 30 of their energy.',
    inputSchema: {},
    energyCost: 25,
    cooldownTurns: 4,
    usesPerMatch: -1,
    icon: '⚡',
    rarity: 'rare',
    category: 'combat',
  },
  {
    id: 'smoke_screen',
    name: 'Smoke Screen',
    description: 'Deploy smoke. Enemy accuracy -30% for 2 turns.',
    llmDescription: 'Deploy a smoke screen. Reduces enemy hit chance by 30% for the next 2 turns.',
    inputSchema: {},
    energyCost: 15,
    cooldownTurns: 5,
    usesPerMatch: -1,
    icon: '💨',
    rarity: 'common',
    category: 'utility',
  },
  {
    id: 'overclock',
    name: 'Overclock',
    description: 'Overclock your systems. +30% energy regen for 3 turns, then crash (0 regen 1 turn).',
    llmDescription: 'Overclock your energy systems for 3 turns (+30% regen), followed by a 1-turn crash (0 regen).',
    inputSchema: {},
    energyCost: 0,
    cooldownTurns: 8,
    usesPerMatch: -1,
    icon: '⚙️',
    rarity: 'legendary',
    category: 'utility',
  },
  {
    id: 'hack_action',
    name: 'Action Hack',
    description: 'Attempt to override the enemy\'s next action. 60% success rate.',
    llmDescription: 'Attempt to hack the enemy\'s next action. On success (60% chance), their next action is replaced with GUARD. Returns success: boolean.',
    inputSchema: {},
    energyCost: 30,
    cooldownTurns: 6,
    usesPerMatch: -1,
    icon: '💻',
    rarity: 'legendary',
    category: 'control',
  },
  {
    id: 'battle_cry',
    name: 'Battle Cry',
    description: '+25% damage on all attacks for 3 turns.',
    llmDescription: 'Unleash a battle cry, boosting your damage by 25% for the next 3 turns.',
    inputSchema: {},
    energyCost: 18,
    cooldownTurns: 5,
    usesPerMatch: -1,
    icon: '🔥',
    rarity: 'rare',
    category: 'combat',
  },
];

export function getSkill(id: string): SkillDefinition | undefined {
  return SKILL_POOL.find(s => s.id === id);
}

/** Build Anthropic-style tool definitions for equipped skills */
export function skillsToTools(skillIds: string[]): Array<{
  name: string;
  description: string;
  input_schema: { type: 'object'; properties: object; required: string[] };
}> {
  return skillIds
    .map(id => getSkill(id))
    .filter(Boolean)
    .map(skill => ({
      name: skill!.id,
      description: skill!.llmDescription,
      input_schema: {
        type: 'object' as const,
        properties: skill!.inputSchema as Record<string, unknown>,
        required: [],
      },
    }));
}
```

---

## Part 2 — Update SavedLoadout

### File: `web/src/lib/armory.ts`

Add `brainPrompt` and `skills` to `SavedLoadout`:

```typescript
export interface SavedLoadout {
  id: string;
  name: string;
  cards: string[];
  brainPrompt: string;    // NEW — system prompt for the LLM
  skills: string[];       // NEW — equipped skill IDs (max 3)
  createdAt: number;
  stats: {
    totalWeight: number;
    totalOverhead: number;
    armorValue: number;
  };
}
```

Update `saveLoadout()` to accept and store `brainPrompt` and `skills`.

Update `POST /api/armory` to accept `{ name, cards, brainPrompt, skills }`.

---

## Part 3 — Update resolveSnapshot

### File: `web/src/lib/lobby.ts`

Update `BotSnapshot` and `resolveSnapshot`:

```typescript
export interface BotSnapshot {
  botName: string;
  brainPrompt: string;    // was hardcoded '' — now from loadout
  skills: string[];       // NEW
  cards: string[];
  actionTypes: string[];
  armor: 'light' | 'medium' | 'heavy';
  moveCost: number;
}

// In resolveSnapshot:
return {
  botName: loadout.name,
  brainPrompt: loadout.brainPrompt || DEFAULT_BRAIN_PROMPT,
  skills: loadout.skills || [],
  cards: loadout.cards,
  actionTypes: matchCfg.actionTypes,
  armor: matchCfg.armor,
  moveCost: matchCfg.moveCost,
};
```

Add a `DEFAULT_BRAIN_PROMPT` for bots without a custom prompt:
```typescript
const DEFAULT_BRAIN_PROMPT = `You are a tactical combat agent in a grid-based arena.
Analyze the game state each turn and choose the optimal action.
Balance offense and defense. Conserve energy for key moments.
Use your skills strategically — they provide critical advantages.`;
```

---

## Part 4 — Wire Skills into LLM Decide Endpoint

### File: `web/src/pages/api/agent/decide.ts`

This is the endpoint the match runner calls each turn. Currently it sends a system prompt + game state and gets back an `AgentAction`.

**New flow:**
1. Accept `brainPrompt` and `skills` in the request body
2. Build Anthropic-style tool definitions from equipped skills
3. Make a TWO-PASS LLM call:
   - Pass 1: Send game state + tools → LLM may call a skill tool
   - If tool_use: execute the skill → get result → Pass 2 with tool result
   - Pass 2 (or if no tool call): get final AgentAction
4. Return `{ action: AgentAction, skillUsed?: string, skillResult?: unknown }`

**Skill execution** (simulate results — don't call external APIs):
```typescript
function executeSkill(skillId: string, gameState: GameStateContext): unknown {
  switch (skillId) {
    case 'scan_enemy':
      // Return enemy's last action as "predicted"
      return { intended_action: gameState.lastEnemyAction || 'MOVE' };
    case 'threat_model':
      const hp = gameState.myHp;
      const enemyHp = gameState.enemyHp;
      const threat = hp < 30 ? 'critical' : hp < 60 ? 'high' : enemyHp < 30 ? 'low' : 'medium';
      return {
        threat_level: threat,
        recommended_action: threat === 'critical' ? 'GUARD' : 'MELEE_STRIKE',
        predicted_enemy_moves: [gameState.lastEnemyAction || 'MOVE', 'GUARD'],
      };
    case 'predict_attack':
      const dist = gameState.distanceToEnemy;
      const prob = dist <= 2 ? 75 : dist <= 5 ? 50 : 25;
      return { attack_probability: prob, confidence: dist <= 2 ? 'high' : 'medium' };
    case 'optimal_position':
      return {
        target_position: gameState.enemyPosition,
        reasoning: 'Close to melee range for maximum pressure',
        expected_advantage: 'melee_range',
      };
    case 'heal':
      return { hp_restored: 20, message: 'Combat stim applied' };
    case 'emp_burst':
      return { energy_drained: 30, message: 'EMP burst fired' };
    case 'smoke_screen':
      return { duration_turns: 2, accuracy_reduction: 30 };
    case 'overclock':
      return { regen_boost: 30, duration_turns: 3, crash_turns: 1 };
    case 'hack_action':
      const success = Math.random() < 0.6;
      return { success, message: success ? 'Enemy action overridden to GUARD' : 'Hack failed' };
    case 'battle_cry':
      return { damage_boost: 25, duration_turns: 3 };
    default:
      return { message: 'Skill activated' };
  }
}
```

**Updated decide endpoint:**

```typescript
export const POST: APIRoute = async ({ request }) => {
  const body = await request.json();
  const { state, botConfig, model, brainPrompt, skills = [] } = body;

  const tools = skillsToTools(skills);  // from skills.ts

  const systemPrompt = brainPrompt || DEFAULT_BRAIN_PROMPT;

  // Build messages
  const messages = [
    { role: 'user', content: buildGameStateContext(state, botConfig) }
  ];

  // Pass 1: with tools if skills equipped
  const pass1Response = await callLLM({
    model,
    system: systemPrompt,
    messages,
    tools: tools.length > 0 ? tools : undefined,
    max_tokens: 256,
  });

  let finalAction: AgentAction;
  let skillUsed: string | undefined;
  let skillResult: unknown;

  if (pass1Response.stop_reason === 'tool_use') {
    // LLM called a skill
    const toolUseBlock = pass1Response.content.find(b => b.type === 'tool_use');
    skillUsed = toolUseBlock.name;
    skillResult = executeSkill(skillUsed, buildGameStateContext(state, botConfig));

    // Pass 2: with tool result
    const pass2Response = await callLLM({
      model,
      system: systemPrompt,
      messages: [
        ...messages,
        { role: 'assistant', content: pass1Response.content },
        { role: 'user', content: [{ type: 'tool_result', tool_use_id: toolUseBlock.id, content: JSON.stringify(skillResult) }] },
      ],
      max_tokens: 128,
    });

    finalAction = parseAction(pass2Response);
  } else {
    finalAction = parseAction(pass1Response);
  }

  return new Response(JSON.stringify({ action: finalAction, skillUsed, skillResult }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
```

**Important**: This endpoint currently uses OpenAI (gpt-4o-mini). OpenAI uses `tools` with `function` type, not Anthropic's `tool_use`. Adapt to OpenAI tool calling format:

```typescript
// OpenAI tools format:
const openAiTools = skills.map(id => {
  const skill = getSkill(id);
  return {
    type: 'function',
    function: {
      name: skill.id,
      description: skill.llmDescription,
      parameters: { type: 'object', properties: {}, required: [] },
    },
  };
});

// Check response:
if (response.choices[0].finish_reason === 'tool_calls') {
  const toolCall = response.choices[0].message.tool_calls[0];
  skillUsed = toolCall.function.name;
  skillResult = executeSkill(skillUsed, gameStateCtx);

  // Pass 2 with tool result
  const pass2 = await openai.chat.completions.create({
    model,
    messages: [
      ...messages,
      response.choices[0].message,  // assistant message with tool_calls
      { role: 'tool', tool_call_id: toolCall.id, content: JSON.stringify(skillResult) },
    ],
    max_tokens: 128,
  });
  finalAction = parseAction(pass2);
}
```

---

## Part 5 — Pass brainPrompt + skills through match runner

### File: `web/src/lib/ws2/match-runner.ts`

`BotConfig` already has fields we can extend:

```typescript
export interface BotConfig {
  // ...existing...
  brainPrompt?: string;   // NEW
  skills?: string[];      // NEW
}
```

The `fetchDecision` function calls `/api/agent/decide`. Add `brainPrompt` and `skills` to the request body:

```typescript
const res = await fetch('/api/agent/decide', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    state: snapshot,
    botConfig,
    model: botConfig.model || 'gpt-4o-mini',
    brainPrompt: botConfig.brainPrompt,
    skills: botConfig.skills || [],
  }),
});
```

---

## Part 6 — Pass BotSnapshot fields to MatchView / match runner

### File: `web/src/components/MatchView.tsx` + `web/src/components/Lobby.tsx`

`MatchBotConfig` (in MatchView.tsx) needs `brainPrompt` and `skills`:

```typescript
export interface MatchBotConfig {
  // ...existing...
  brainPrompt?: string;
  skills?: string[];
}
```

When Lobby calls `/api/lobby/[id]/start`, the returned `botA` and `botB` already have `brainPrompt` and `skills` (from resolveSnapshot). Pass them through to `MatchView` → `match-runner` → `fetchDecision`.

---

## Part 7 — Armory UI: Brain + Skills tabs

### File: `web/src/components/Armory.tsx`

Add two new sections below the card gallery/loadout builder:

### 7a. Skills Panel

```
SKILLS (max 3)
┌─────────────────────────────────────────────────┐
│ [🔍 Enemy Scan]  [🧠 Threat Model]  [🎯 Predict] │  ← equipped (glowing)
│ ──────────────────────────────────────────────── │
│ Available Skills (click to equip):               │
│ [💉 Combat Stim] [⚡ EMP Burst] [💨 Smoke Screen] │
│ [⚙️ Overclock]  [💻 Action Hack] [🔥 Battle Cry] │
└─────────────────────────────────────────────────┘
```

- Show skill cards: icon, name, description, energy cost, cooldown
- Click to equip (max 3 slots). Click equipped to remove.
- Skill card design similar to item cards: dark background, category-colored border
  - intel: cyan `#00E5FF`
  - combat: red `#EB4D4B`
  - utility: yellow `#FFD600`
  - control: violet `#7C3AED`

### 7b. Brain Panel

```
BRAIN (System Prompt)
┌─────────────────────────────────────────────────┐
│ [Quick presets: Aggressive | Defensive | Sniper | │
│                 Balanced | Glass Cannon]           │
│                                                   │
│ ┌───────────────────────────────────────────────┐ │
│ │ You are an aggressive melee fighter.          │ │
│ │ ALWAYS close distance toward the enemy.       │ │
│ │ If dist <= 1.5 and MELEE_STRIKE is USABLE:   │ │
│ │ use MELEE_STRIKE. If on cooldown: MOVE.       │ │
│ └───────────────────────────────────────────────┘ │
│ [256 / 600 chars]                                 │
└─────────────────────────────────────────────────┘
```

**Quick presets** (clicking fills the textarea):
```typescript
const BRAIN_PRESETS = {
  aggressive: `You are an aggressive melee fighter. ALWAYS close distance toward the enemy. Use MELEE_STRIKE when dist <= 1.5 and it's usable. Use DASH to close distance fast. Never retreat.`,
  defensive: `You are a defensive fighter. Prioritize GUARD when your HP is below 50%. Stay at range 3-5. Use RANGED_SHOT when available. Only engage in melee as a last resort.`,
  sniper: `You are a ranged specialist. ALWAYS maintain distance 3-8 from enemy. Use RANGED_SHOT when dist 2-8 and usable. MOVE away if enemy gets within range 2. Never use melee.`,
  balanced: `You are a balanced tactical fighter. Use RANGED_SHOT at range 3-6. Close to melee when enemy HP is below 40%. Use GUARD when your HP < 40% and energy is low.`,
  glass_cannon: `You are a glass cannon. Maximize damage output every turn. Always attack — never GUARD. Use highest-damage attack available. Use DASH to stay in attack range.`,
};
```

### 7c. Updated Save

The save button now saves `{ name, cards, brainPrompt, skills }`.

`POST /api/armory` body:
```typescript
{ name: string, cards: string[], brainPrompt: string, skills: string[] }
```

---

## Part 8 — Display skills in Lobby

### File: `web/src/components/Lobby.tsx`

In Slot 1 (and Slot 2 when filled), show equipped skills:
```
[🔍 Enemy Scan]  [🎯 Predict]  [🔥 Battle Cry]
Brain: "You are an aggressive melee fighter..."
```

---

## Implementation Order

1. `web/src/lib/skills.ts` — skill pool + skillsToTools()
2. `web/src/lib/armory.ts` — add brainPrompt + skills to SavedLoadout, update saveLoadout()
3. `web/src/pages/api/armory/index.ts` — accept brainPrompt + skills in POST
4. `web/src/lib/lobby.ts` — update BotSnapshot + resolveSnapshot
5. `web/src/pages/api/agent/decide.ts` — OpenAI tool_calls flow, executeSkill()
6. `web/src/lib/ws2/match-runner.ts` — pass brainPrompt + skills to decide
7. `web/src/components/MatchView.tsx` — add brainPrompt + skills to MatchBotConfig
8. `web/src/components/Lobby.tsx` — show skills + brain preview in slot cards
9. `web/src/components/Armory.tsx` — Skills panel + Brain panel + presets
10. `npm --prefix web run build` — must pass clean
11. `git add -A && git commit && git push origin feat/agent-skills`

---

## Success Criteria

- Armory has Skills picker (max 3) and Brain textarea with quick presets
- Saving a loadout persists brainPrompt + skills
- When a match starts, each bot's brainPrompt is used as LLM system prompt
- If bot has skills, LLM receives OpenAI tools array and can call them
- Skill tool calls execute, result fed back to LLM for final action decision
- Match runner logs show `skillUsed` when a skill fires
- Build passes clean
- Push to `feat/agent-skills`

---

## Repo + Patterns
- Worktree: `/Users/thealeks/clawd-engineer/projects/cogcage/worktrees/agent-skills`
- Web: `web/` — build: `npm --prefix web run build`
- Redis: `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`
- OpenAI: `OPENAI_API_KEY` (set in Vercel)
- Existing decide endpoint: `web/src/pages/api/agent/decide.ts` — uses `openai` npm package
- Existing match runner: `web/src/lib/ws2/match-runner.ts`
- Follow existing patterns: `web/src/lib/armory.ts` (Redis CRUD), `web/src/lib/cards.ts` (pool + helpers)
- Push to `feat/agent-skills` — do NOT push to main
