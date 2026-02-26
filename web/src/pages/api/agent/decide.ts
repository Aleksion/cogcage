import type { APIRoute } from 'astro';

export const prerender = false;

const OPENAI_TIMEOUT_MS = 3000;

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

function distanceTenths(a: { x: number; y: number }, b: { x: number; y: number }) {
  return Math.round(Math.hypot(a.x - b.x, a.y - b.y));
}

function distanceUnits(a: { x: number; y: number }, b: { x: number; y: number }) {
  return (distanceTenths(a, b) / UNIT_SCALE).toFixed(1);
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
  const enemy: ActorState = gameState.actors[opponentId];
  const tick = gameState.tick;
  const dist = distanceTenths(me.position, enemy.position);
  const distU = (dist / UNIT_SCALE).toFixed(1);

  const myPos = `(${(me.position.x / UNIT_SCALE).toFixed(1)}, ${(me.position.y / UNIT_SCALE).toFixed(1)})`;
  const enemyPos = `(${(enemy.position.x / UNIT_SCALE).toFixed(1)}, ${(enemy.position.y / UNIT_SCALE).toFixed(1)})`;

  const meInObj = isInObjective(me.position);
  const enemyInObj = isInObjective(enemy.position);
  const objStatus = meInObj && enemyInObj
    ? 'CONTESTED'
    : meInObj
      ? 'you are INSIDE (scoring!)'
      : enemyInObj
        ? 'enemy is INSIDE (scoring!)'
        : 'both OUTSIDE';

  const lines: string[] = [];
  lines.push(`=== BATTLE STATE (tick ${tick}) ===`);
  lines.push(`YOU: HP ${me.hp}/100 | Energy ${energyPct(me.energy)}% | Position ${myPos} | Facing: ${me.facing}`);
  lines.push(`ENEMY: HP ${enemy.hp}/100 | Energy ${energyPct(enemy.energy)}% | Position ${enemyPos}`);
  lines.push(`Distance to enemy: ${distU} units`);
  lines.push('');
  lines.push(`OBJECTIVE ZONE: center (10,10) radius 2.5 — ${objStatus}`);

  // Objective scores
  const myScore = gameState.objectiveScore?.[actorId] ?? 0;
  const enemyScore = gameState.objectiveScore?.[opponentId] ?? 0;
  if (myScore > 0 || enemyScore > 0) {
    lines.push(`SCORES: you ${(myScore / UNIT_SCALE).toFixed(1)} | enemy ${(enemyScore / UNIT_SCALE).toFixed(1)}`);
  }

  lines.push('');
  lines.push('YOUR AVAILABLE ACTIONS (loadout):');

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
      rangeInfo = ` | requires distance ≤1.5 (${inRange ? 'IN RANGE ✓' : 'ENEMY TOO FAR'})`;
    } else if (action === 'RANGED_SHOT') {
      const inRange = dist >= RANGED_MIN && dist <= RANGED_MAX;
      const optimal = dist >= 40 && dist <= 70;
      if (inRange) {
        rangeInfo = optimal
          ? ' | range 2-10, optimal 4-7 (ENEMY IN OPTIMAL BAND ✓)'
          : ' | range 2-10, optimal 4-7 (IN RANGE ✓)';
      } else {
        rangeInfo = dist < RANGED_MIN
          ? ' | range 2-10 (ENEMY TOO CLOSE)'
          : ' | range 2-10 (ENEMY TOO FAR)';
      }
    } else if (action === 'GUARD') {
      rangeInfo = ' | blocks 35% frontal damage for 0.8s';
    } else if (action === 'DASH') {
      rangeInfo = ' | displacement 3 units, dirs: N/NE/E/SE/S/SW/W/NW';
    } else if (action === 'UTILITY') {
      rangeInfo = ' | special ability 1.2s';
    }

    const cdDisplay = offCooldown ? 'no cooldown' : `cooldown ${cdSec}s`;
    const readyMark = ready ? 'READY ✓' : offCooldown ? 'NO ENERGY ✗' : 'ON COOLDOWN ✗';
    const dirNote = (action === 'MOVE' || action === 'DASH') ? '(dir)' : '';

    lines.push(`  ${action}${dirNote} — cost ${costDisplay}e | ${cdDisplay} | ${readyMark}${rangeInfo}`);
  }

  lines.push('');
  lines.push('Respond with ONE action as JSON. Examples:');
  lines.push('  {"type":"MOVE","dir":"NE"}');
  lines.push('  {"type":"MELEE_STRIKE"}');
  lines.push('  {"type":"RANGED_SHOT"}');
  lines.push('  {"type":"GUARD"}');
  lines.push('  {"type":"DASH","dir":"E"}');
  lines.push('  {"type":"NO_OP"}');

  return lines.join('\n');
}

function parseAndValidate(
  raw: any,
  loadout: string[],
): { type: string; dir?: string; targetId?: string } {
  if (!raw || typeof raw !== 'object') return { type: 'NO_OP' };

  const type = typeof raw.type === 'string' ? raw.type.toUpperCase() : '';
  if (!VALID_ACTIONS.has(type)) return { type: 'NO_OP' };
  if (type !== 'NO_OP' && !loadout.includes(type)) return { type: 'NO_OP' };

  const result: { type: string; dir?: string; targetId?: string } = { type };

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

  return result;
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

    const apiKey = import.meta.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error('[agent/decide] OPENAI_API_KEY not set');
      return new Response(JSON.stringify({ action: { type: 'NO_OP' } }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    }

    const userMessage = formatGameState(gameState, actorId, opponentId, loadout);

    const sysPrompt = (systemPrompt || 'You are a combat bot. Pick the best tactical action each turn.').slice(0, 2000);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

    let action: { type: string; dir?: string; targetId?: string } = { type: 'NO_OP' };

    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: sysPrompt },
            { role: 'user', content: userMessage },
          ],
          response_format: { type: 'json_object' },
          max_tokens: 100,
          temperature: 0.7,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
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
        console.warn(`[agent/decide] OpenAI timeout for ${actorId}`);
      } else {
        console.error(`[agent/decide] OpenAI error:`, err?.message || err);
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
