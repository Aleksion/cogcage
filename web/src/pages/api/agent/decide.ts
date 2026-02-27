import type { APIRoute } from 'astro';

export const prerender = false;

const DEFAULT_TIMEOUT_MS = 3000;

const ACTION_COST: Record<string, number> = {
  MOVE: 40,
  MELEE_STRIKE: 180,
  RANGED_SHOT: 140,
  GUARD: 100,
  DASH: 220,
  UTILITY: 200,
};

const COOLDOWN_SECONDS: Record<string, number> = {
  MELEE_STRIKE: 1.2,
  RANGED_SHOT: 0.9,
  GUARD: 1.5,
  DASH: 3.0,
  UTILITY: 5.0,
};

const MELEE_RANGE = 15; // tenths
const RANGED_MIN = 20;
const RANGED_MAX = 100;
const UNIT_SCALE = 10;
const ENERGY_MAX = 1000;
const OBJECTIVE_CENTER = { x: 100, y: 100 };
const OBJECTIVE_RADIUS = 25;
const VALID_ACTIONS = new Set(['MOVE', 'MELEE_STRIKE', 'RANGED_SHOT', 'GUARD', 'DASH', 'UTILITY', 'NO_OP']);
const DIRS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

/* ── Provider config ────────────────────────────────────── */

interface ProviderConfig {
  url: string;
  model: string;
  apiKey: string;
  temperature: number;
  authHeader: (key: string) => Record<string, string>;
  bodyBuilder: (model: string, messages: any[], temperature: number) => Record<string, unknown>;
}

const PROVIDERS: Record<string, Omit<ProviderConfig, 'apiKey' | 'temperature'>> = {
  openai: {
    url: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (model, messages, temperature) => ({
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature,
    }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-5-20251001',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    bodyBuilder: (model, messages, temperature) => ({
      model,
      max_tokens: 100,
      temperature,
      system: messages.find((m: any) => m.role === 'system')?.content || '',
      messages: messages.filter((m: any) => m.role !== 'system'),
    }),
  },
  groq: {
    url: 'https://api.groq.com/openai/v1/chat/completions',
    model: 'llama-3.1-8b-instant',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (model, messages, temperature) => ({
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature,
    }),
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/chat/completions',
    model: 'meta-llama/llama-3.1-8b-instruct',
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    bodyBuilder: (model, messages, temperature) => ({
      model,
      messages,
      response_format: { type: 'json_object' },
      max_tokens: 100,
      temperature,
    }),
  },
};

/* ── Helpers ─────────────────────────────────────────────── */

function distanceTenths(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

function energyPct(energy: number) {
  return Math.round((energy / ENERGY_MAX) * 100);
}

function isInObjective(pos: { x: number; y: number }) {
  return distanceTenths(pos, OBJECTIVE_CENTER) <= OBJECTIVE_RADIUS;
}

interface ActorState {
  hp: number;
  energy: number;
  position: { x: number; y: number };
  facing: string;
  cooldowns: Record<string, number>;
  statuses: { guard?: { endsAt: number } | null; dashBuff?: any; utility?: any };
}

function formatGameState(
  gameState: any,
  actorId: string,
  opponentId: string,
  loadout: string[],
) {
  const me: ActorState = gameState.actors[actorId];
  const tick = gameState.tick;

  // Gather all enemies sorted by distance
  const enemies: Array<{ id: string; actor: ActorState; dist: number }> = [];
  for (const [id, actor] of Object.entries(gameState.actors) as [string, ActorState][]) {
    if (id === actorId) continue;
    enemies.push({ id, actor, dist: distanceTenths(me.position, actor.position) });
  }
  enemies.sort((a, b) => a.dist - b.dist);

  const isFfa = enemies.length > 1;
  const aliveEnemies = enemies.filter((e) => e.actor.hp > 0);

  // Primary target (nearest alive, passed as opponentId)
  const primary = gameState.actors[opponentId] as ActorState;
  const primaryDist = primary ? distanceTenths(me.position, primary.position) : 0;

  const myPos = `(${(me.position.x / UNIT_SCALE).toFixed(1)}, ${(me.position.y / UNIT_SCALE).toFixed(1)})`;

  const lines: string[] = [];
  lines.push(`=== BATTLE STATE (tick ${tick}) ===`);
  lines.push(`YOU (${actorId}): HP ${me.hp}/100 | Energy ${energyPct(me.energy)}% | Position ${myPos} | Facing: ${me.facing}`);

  if (isFfa) {
    lines.push(`ENEMIES (${aliveEnemies.length} alive of ${enemies.length}):`);
    for (const e of enemies) {
      const pos = `(${(e.actor.position.x / UNIT_SCALE).toFixed(1)}, ${(e.actor.position.y / UNIT_SCALE).toFixed(1)})`;
      const distU = (e.dist / UNIT_SCALE).toFixed(1);
      const tag = e.id === opponentId ? ' *NEAREST*' : '';
      if (e.actor.hp <= 0) {
        lines.push(`  ${e.id}${tag}: ELIMINATED`);
      } else {
        lines.push(`  ${e.id}${tag}: HP ${e.actor.hp}/100 | Energy ${energyPct(e.actor.energy)}% | Pos ${pos} | Dist ${distU}`);
      }
    }
  } else {
    const enemy = primary;
    const enemyPos = `(${(enemy.position.x / UNIT_SCALE).toFixed(1)}, ${(enemy.position.y / UNIT_SCALE).toFixed(1)})`;
    lines.push(`ENEMY: HP ${enemy.hp}/100 | Energy ${energyPct(enemy.energy)}% | Position ${enemyPos}`);
    lines.push(`Distance to enemy: ${(primaryDist / UNIT_SCALE).toFixed(1)} units`);
  }

  lines.push('');

  // Objective zone
  const meInObj = isInObjective(me.position);
  if (isFfa) {
    const inObj = aliveEnemies.filter((e) => isInObjective(e.actor.position));
    const objStatus = meInObj && inObj.length > 0
      ? 'CONTESTED'
      : meInObj
        ? 'you are INSIDE (scoring!)'
        : inObj.length > 0
          ? `${inObj.length} enemy/ies INSIDE`
          : 'all OUTSIDE';
    lines.push(`OBJECTIVE ZONE: center (10,10) radius 2.5 — ${objStatus}`);
  } else {
    const enemyInObj = isInObjective(primary.position);
    const objStatus = meInObj && enemyInObj
      ? 'CONTESTED'
      : meInObj
        ? 'you are INSIDE (scoring!)'
        : enemyInObj
          ? 'enemy is INSIDE (scoring!)'
          : 'both OUTSIDE';
    lines.push(`OBJECTIVE ZONE: center (10,10) radius 2.5 — ${objStatus}`);
  }

  // Scores
  const myScore = gameState.objectiveScore?.[actorId] ?? 0;
  if (isFfa) {
    const scoreParts = aliveEnemies.map((e) =>
      `${e.id}: ${((gameState.objectiveScore?.[e.id] ?? 0) / UNIT_SCALE).toFixed(1)}`,
    );
    if (myScore > 0 || scoreParts.length > 0) {
      lines.push(`SCORES: you ${(myScore / UNIT_SCALE).toFixed(1)} | ${scoreParts.join(' | ')}`);
    }
  } else {
    const enemyScore = gameState.objectiveScore?.[opponentId] ?? 0;
    if (myScore > 0 || enemyScore > 0) {
      lines.push(`SCORES: you ${(myScore / UNIT_SCALE).toFixed(1)} | enemy ${(enemyScore / UNIT_SCALE).toFixed(1)}`);
    }
  }

  lines.push('');
  lines.push('YOUR AVAILABLE ACTIONS (loadout):');

  // Use distance to nearest alive enemy for range checks
  const dist = aliveEnemies.length > 0 ? aliveEnemies[0].dist : primaryDist;

  for (const action of loadout) {
    const cost = ACTION_COST[action] ?? 0;
    const costDisplay = cost / UNIT_SCALE;
    const cdTicks = me.cooldowns[action] ?? 0;
    const cdSec = (cdTicks / 10).toFixed(1);
    const canAfford = me.energy >= cost;
    const offCooldown = cdTicks === 0;
    const ready = canAfford && offCooldown;

    let rangeInfo = '';
    if (action === 'MOVE') {
      rangeInfo = ' | dirs: N/NE/E/SE/S/SW/W/NW';
    } else if (action === 'MELEE_STRIKE') {
      const inRange = dist <= MELEE_RANGE;
      rangeInfo = ` | requires distance ≤1.5 (${inRange ? 'NEAREST IN RANGE \u2713' : 'NEAREST TOO FAR'})`;
    } else if (action === 'RANGED_SHOT') {
      const inRange = dist >= RANGED_MIN && dist <= RANGED_MAX;
      const optimal = dist >= 40 && dist <= 70;
      if (inRange) {
        rangeInfo = optimal
          ? ' | range 2-10, optimal 4-7 (NEAREST IN OPTIMAL BAND \u2713)'
          : ' | range 2-10, optimal 4-7 (IN RANGE \u2713)';
      } else {
        rangeInfo = dist < RANGED_MIN
          ? ' | range 2-10 (NEAREST TOO CLOSE)'
          : ' | range 2-10 (NEAREST TOO FAR)';
      }
    } else if (action === 'GUARD') {
      rangeInfo = ' | blocks 35% frontal damage for 0.8s';
    } else if (action === 'DASH') {
      rangeInfo = ' | displacement 3 units, dirs: N/NE/E/SE/S/SW/W/NW';
    } else if (action === 'UTILITY') {
      rangeInfo = ' | special ability 1.2s';
    }

    const cdDisplay = offCooldown ? 'no cooldown' : `cooldown ${cdSec}s`;
    const readyMark = ready ? 'READY \u2713' : offCooldown ? 'NO ENERGY \u2717' : 'ON COOLDOWN \u2717';
    const dirNote = (action === 'MOVE' || action === 'DASH') ? '(dir)' : '';

    lines.push(`  ${action}${dirNote} \u2014 cost ${costDisplay}e | ${cdDisplay} | ${readyMark}${rangeInfo}`);
  }

  lines.push('');
  if (isFfa) {
    lines.push('Respond with ONE action as JSON. Include targetId for attacks. Examples:');
    lines.push('  {"type":"MOVE","dir":"NE"}');
    lines.push(`  {"type":"MELEE_STRIKE","targetId":"${opponentId}"}`);
    lines.push(`  {"type":"RANGED_SHOT","targetId":"${opponentId}"}`);
    lines.push('  {"type":"GUARD"}');
    lines.push('  {"type":"DASH","dir":"E"}');
    lines.push('  {"type":"NO_OP"}');
  } else {
    lines.push('Respond with ONE action as JSON. Examples:');
    lines.push('  {"type":"MOVE","dir":"NE"}');
    lines.push('  {"type":"MELEE_STRIKE"}');
    lines.push('  {"type":"RANGED_SHOT"}');
    lines.push('  {"type":"GUARD"}');
    lines.push('  {"type":"DASH","dir":"E"}');
    lines.push('  {"type":"NO_OP"}');
  }

  return lines.join('\n');
}

function parseAndValidate(
  raw: any,
  loadout: string[],
): { type: string; dir?: string; targetId?: string; reasoning?: string } {
  if (!raw || typeof raw !== 'object') return { type: 'NO_OP' };

  const type = typeof raw.type === 'string' ? raw.type.toUpperCase() : '';
  if (!VALID_ACTIONS.has(type)) return { type: 'NO_OP' };
  if (type !== 'NO_OP' && !loadout.includes(type)) return { type: 'NO_OP' };

  const result: { type: string; dir?: string; targetId?: string; reasoning?: string } = { type };

  if (type === 'MOVE' || type === 'DASH') {
    const dir = typeof raw.dir === 'string' ? raw.dir.toUpperCase() : '';
    if (!DIRS.includes(dir)) return { type: 'NO_OP' };
    result.dir = dir;
  }

  if (type === 'MELEE_STRIKE' || type === 'RANGED_SHOT') {
    if (raw.targetId && typeof raw.targetId === 'string') {
      result.targetId = raw.targetId;
    }
  }

  if (raw.reasoning && typeof raw.reasoning === 'string') {
    result.reasoning = raw.reasoning.slice(0, 200);
  }

  return result;
}

function extractContent(data: any, provider: string): string | null {
  if (provider === 'anthropic') {
    return data?.content?.[0]?.text ?? null;
  }
  return data?.choices?.[0]?.message?.content ?? null;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { gameState, actorId, systemPrompt, loadout, opponentId } = body;

    if (!gameState || !actorId || !loadout) {
      return new Response(JSON.stringify({ action: { type: 'NO_OP' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    // Read BYO headers (client passes these per-bot)
    const llmProvider = (request.headers.get('x-llm-provider') || 'openai').toLowerCase();
    const llmModel = request.headers.get('x-llm-model') || '';
    const llmKey = request.headers.get('x-llm-key') || '';
    const llmTemperature = parseFloat(request.headers.get('x-llm-temperature') || '');

    const providerConfig = PROVIDERS[llmProvider] || PROVIDERS.openai;
    const model = llmModel || providerConfig.model;
    const temperature = Number.isFinite(llmTemperature) ? llmTemperature : 0.7;

    // API key: BYO header > server env
    const serverKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY || '';
    const apiKey = llmKey || (llmProvider === 'openai' ? serverKey : '');

    if (!apiKey) {
      console.error(`[agent/decide] No API key for provider ${llmProvider}`);
      return new Response(JSON.stringify({ action: { type: 'NO_OP' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const userMessage = formatGameState(gameState, actorId, opponentId, loadout);
    const sysPrompt = (systemPrompt || 'You are a combat bot. Pick the best tactical action each turn.').slice(0, 2000);

    const messages = [
      { role: 'system', content: sysPrompt },
      { role: 'user', content: userMessage },
    ];

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), DEFAULT_TIMEOUT_MS);

    let action: { type: string; dir?: string; targetId?: string; reasoning?: string } = { type: 'NO_OP' };

    try {
      const res = await fetch(providerConfig.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...providerConfig.authHeader(apiKey),
        },
        body: JSON.stringify(providerConfig.bodyBuilder(model, messages, temperature)),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = extractContent(data, llmProvider);
        if (content) {
          try {
            const parsed = JSON.parse(content);
            action = parseAndValidate(parsed, loadout);
          } catch {
            action = { type: 'NO_OP' };
          }
        }
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err?.name === 'AbortError') {
        console.warn(`[agent/decide] ${llmProvider} timeout for ${actorId}`);
      } else {
        console.error(`[agent/decide] ${llmProvider} error:`, err?.message || err);
      }
      action = { type: 'NO_OP' };
    }

    return new Response(JSON.stringify({ action }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    console.error('[agent/decide] Unexpected error:', err);
    return new Response(JSON.stringify({ action: { type: 'NO_OP' } }), {
      status: 200,
      headers: { 'content-type': 'application/json' },
    });
  }
};
