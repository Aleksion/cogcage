import type { APIRoute } from 'astro';
import { buildAsciiMap, buildActorKey } from '../../../lib/ws2/ascii-map.js';

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
const TICK_RATE = 10;
const MATCH_DURATION_SEC = 90;
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
      max_tokens: 200,
      temperature,
    }),
  },
  anthropic: {
    url: 'https://api.anthropic.com/v1/messages',
    model: 'claude-haiku-4-5-20251001',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    bodyBuilder: (model, messages, temperature) => ({
      model,
      max_tokens: 200,
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
      max_tokens: 200,
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
      max_tokens: 200,
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

/** Compass direction from `from` to `to` */
function compassDir(from: { x: number; y: number }, to: { x: number; y: number }): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (dx === 0 && dy === 0) return '--';
  // atan2 with game coords: +y is south on the grid
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI); // -dy because N is -y
  // Normalize to 0-360
  const norm = ((angle % 360) + 360) % 360;
  const idx = Math.round(norm / 45) % 8;
  return ['E', 'NE', 'N', 'NW', 'W', 'SW', 'S', 'SE'][idx];
}

interface ActorState {
  hp: number;
  energy: number;
  position: { x: number; y: number };
  facing: string;
  cooldowns: Record<string, number>;
  statuses: { guard?: { endsAt: number } | null; dashBuff?: any; utility?: any };
}

interface GameEvent {
  tick: number;
  type: string;
  actorId: string | null;
  targetId: string | null;
  data: Record<string, unknown> | null;
}

/* ── Format game state ─────────────────────────────────── */

function formatGameState(
  gameState: any,
  actorId: string,
  opponentIds: string[],
  loadout: string[],
) {
  const me: ActorState = gameState.actors[actorId];
  const tick: number = gameState.tick;
  const timeRemaining = Math.max(0, MATCH_DURATION_SEC - tick / TICK_RATE);

  const lines: string[] = [];

  // ── Header
  lines.push(`=== BATTLE STATE (tick ${tick}) ===`);
  lines.push(`Time remaining: ${timeRemaining.toFixed(1)}s`);
  lines.push('');

  // ── YOUR section
  const myPos = `(${(me.position.x / UNIT_SCALE).toFixed(1)}, ${(me.position.y / UNIT_SCALE).toFixed(1)})`;
  const activeStatuses: string[] = [];
  if (me.statuses.guard) activeStatuses.push('GUARDING');
  if (me.statuses.dashBuff) activeStatuses.push('DASH_BUFF');
  if (me.statuses.utility) activeStatuses.push('UTILITY_ACTIVE');
  const statusStr = activeStatuses.length > 0 ? ` | Statuses: ${activeStatuses.join(', ')}` : '';

  lines.push('── YOU ──');
  lines.push(`HP: ${me.hp}/100 | Energy: ${energyPct(me.energy)}% | Position: ${myPos} | Facing: ${me.facing}${statusStr}`);
  lines.push('');

  // ── VISIBLE ACTORS section
  const visibleActors = opponentIds.filter(id => gameState.actors[id]);
  const actorKey = buildActorKey(visibleActors, actorId);

  lines.push('── VISIBLE ACTORS ──');
  if (visibleActors.length === 0) {
    lines.push('  (none)');
  } else {
    for (const oppId of visibleActors) {
      const opp: ActorState = gameState.actors[oppId];
      const dist = distanceTenths(me.position, opp.position);
      const distU = (dist / UNIT_SCALE).toFixed(1);
      const dir = compassDir(me.position, opp.position);
      const oppPos = `(${(opp.position.x / UNIT_SCALE).toFixed(1)}, ${(opp.position.y / UNIT_SCALE).toFixed(1)})`;
      const letter = actorKey[oppId] || '?';
      lines.push(`  [${letter}] ${oppId} — HP: ${opp.hp}/100 | Energy: ${energyPct(opp.energy)}% | Pos: ${oppPos} | Dir: ${dir} | Dist: ${distU}`);
    }
  }
  lines.push('');

  // ── OBJECTIVE ZONE
  const meInObj = isInObjective(me.position);
  const scoringActors: string[] = [];
  if (meInObj) scoringActors.push('YOU');
  for (const oppId of visibleActors) {
    if (isInObjective(gameState.actors[oppId].position)) {
      scoringActors.push(actorKey[oppId] || oppId);
    }
  }
  const objStatus = scoringActors.length === 0
    ? 'nobody scoring'
    : `${scoringActors.join(', ')} scoring`;

  const myScore = gameState.objectiveScore?.[actorId] ?? 0;
  const scores = visibleActors.map(id => {
    const s = gameState.objectiveScore?.[id] ?? 0;
    return `${actorKey[id]}: ${(s / UNIT_SCALE).toFixed(1)}`;
  });
  const scoreDelta = `YOU: ${(myScore / UNIT_SCALE).toFixed(1)} | ${scores.join(' | ')}`;

  lines.push('── OBJECTIVE ZONE ──');
  lines.push(`Center: (10,10) radius 2.5 — ${objStatus}`);
  lines.push(`Scores: ${scoreDelta}`);
  lines.push('');

  // ── ASCII MAP
  const asciiMap = buildAsciiMap(gameState, visibleActors, actorId);
  const keyLines = visibleActors.map(id => `${actorKey[id]} = ${id}`).join(', ');

  lines.push('── MAP ──');
  lines.push(`Y = you${keyLines ? ', ' + keyLines : ''}, O = objective, # = obstacle`);
  lines.push(asciiMap);
  lines.push('');

  // ── RECENT EVENTS
  const events: GameEvent[] = gameState.events || [];
  const relevantEvents = events.filter(
    (e: GameEvent) => e.type === 'ACTION_ACCEPTED' || e.type === 'ILLEGAL_ACTION'
  );
  // Last 5 per actor
  const allActorIds = [actorId, ...visibleActors];
  const recentByActor: Record<string, GameEvent[]> = {};
  for (const id of allActorIds) {
    recentByActor[id] = relevantEvents
      .filter((e: GameEvent) => e.actorId === id)
      .slice(-5);
  }

  lines.push('── RECENT EVENTS ──');
  let hasEvents = false;
  for (const id of allActorIds) {
    const evts = recentByActor[id];
    if (evts.length === 0) continue;
    hasEvents = true;
    const label = id === actorId ? 'YOU' : (actorKey[id] || id);
    for (const evt of evts) {
      const actionType = (evt.data as any)?.type || (evt.data as any)?.action?.type || '?';
      const tag = evt.type === 'ILLEGAL_ACTION' ? 'ILLEGAL' : 'OK';
      lines.push(`  ${label} tick ${evt.tick}: ${actionType} [${tag}]`);
    }
  }
  if (!hasEvents) {
    lines.push('  (no actions yet)');
  }
  lines.push('');

  // ── ACTIONS section
  // Find closest opponent distance for range checks
  const closestDist = visibleActors.length > 0
    ? Math.min(...visibleActors.map(id => distanceTenths(me.position, gameState.actors[id].position)))
    : Infinity;

  lines.push('── ACTIONS ──');
  for (const action of loadout) {
    const cost = ACTION_COST[action] ?? 0;
    const costPct = Math.round((cost / ENERGY_MAX) * 100); // show cost as % of energy max
    const cdTicks = me.cooldowns[action] ?? 0;
    const cdSec = (cdTicks / TICK_RATE).toFixed(1);
    const canAfford = me.energy >= cost;
    const offCooldown = cdTicks === 0;

    let usability = '';
    if (!offCooldown) {
      usability = `NOT USABLE (cooldown ${cdSec}s)`;
    } else if (!canAfford) {
      usability = `NOT USABLE (need ${costPct}% energy, have ${energyPct(me.energy)}%)`;
    } else {
      // Check range for attack actions
      if (action === 'MELEE_STRIKE') {
        if (closestDist > MELEE_RANGE) {
          usability = 'NOT USABLE (no target in melee range <= 1.5)';
        } else {
          usability = 'USABLE';
        }
      } else if (action === 'RANGED_SHOT') {
        if (closestDist < RANGED_MIN) {
          usability = 'NOT USABLE (closest target too close, need dist >= 2.0)';
        } else if (closestDist > RANGED_MAX) {
          usability = 'NOT USABLE (closest target too far, need dist <= 10.0)';
        } else {
          usability = 'USABLE';
        }
      } else {
        usability = 'USABLE';
      }
    }

    const cdInfo = offCooldown ? 'ready' : `cd ${cdSec}s`;
    const dirNote = (action === 'MOVE' || action === 'DASH') ? ' (requires dir)' : '';

    lines.push(`  ${action}${dirNote} — cost: ${costPct}% energy | ${cdInfo} | ${usability}`);
  }
  lines.push('  NO_OP — cost: 0% energy | ready | USABLE');
  lines.push('');

  // ── Response format
  lines.push('Respond with ONE JSON action: {"type":"...","dir":"...","targetId":"...","reasoning":"..."}');
  lines.push('dir: required for MOVE/DASH (N/NE/E/SE/S/SW/W/NW). targetId: use the full actor ID (e.g. "bot2"), NOT the map letter.');

  return lines.join('\n');
}

/* ── Parse & validate ────────────────────────────────────── */

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

/* ── POST handler ────────────────────────────────────────── */

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { gameState, actorId, systemPrompt, loadout, opponentIds, messages: incomingMessages } = body;

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

    // Build the new user message for this turn
    const resolvedOpponentIds: string[] = opponentIds || [];
    const userMessage = formatGameState(gameState, actorId, resolvedOpponentIds, loadout);

    // Build messages: use incoming history if provided, else start fresh
    let messages: { role: string; content: string }[];
    if (Array.isArray(incomingMessages) && incomingMessages.length > 0) {
      // Append new user turn to existing conversation
      messages = [...incomingMessages, { role: 'user', content: userMessage }];
    } else {
      const sysPrompt = (systemPrompt || 'You are a combat bot. Pick the best tactical action each turn.').slice(0, 2000);
      messages = [
        { role: 'system', content: sysPrompt },
        { role: 'user', content: userMessage },
      ];
    }

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
