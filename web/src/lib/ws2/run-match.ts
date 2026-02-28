/**
 * Legacy client-side molt runner.
 *
 * Still used by MatchView.tsx (tank flow) and SessionRoom.tsx (session flow).
 * Play.tsx was migrated to the DO WebSocket in TASK-004 and no longer uses this.
 * TODO: Migrate remaining consumers to DO WebSocket and remove this file.
 */

import {
  createInitialState,
  createActorState,
  resolveTick,
} from './engine.js';
import {
  DECISION_WINDOW_TICKS,
  TICK_MS,
  UNIT_SCALE,
  MAX_TICKS,
} from './constants.js';
import { getSpawnPositions } from './match-types.js';
import type { BotConfig, MatchSnapshot, SnapshotCallback } from './match-types.js';

export type { BotConfig, MatchSnapshot, SnapshotCallback };

const FACING_CYCLE: Array<'N' | 'E' | 'S' | 'W' | 'NE' | 'SE' | 'SW' | 'NW'> =
  ['E', 'W', 'S', 'N', 'SE', 'SW', 'NE', 'NW'];

/* ── Decision Queue ─────────────────────────────────────────── */

interface QueuedDecision {
  tick: number;
  promise: Promise<{ type: string; dir?: string; targetId?: string; reasoning?: string }>;
  resolved: boolean;
  result: { type: string; dir?: string; targetId?: string; reasoning?: string } | null;
}

class DecisionQueue {
  private queue: QueuedDecision[] = [];

  get depth(): number {
    return this.queue.filter((d) => !d.resolved).length;
  }

  enqueue(
    tick: number,
    fetchFn: () => Promise<{ type: string; dir?: string; targetId?: string; reasoning?: string }>,
  ): void {
    const entry: QueuedDecision = { tick, promise: fetchFn(), resolved: false, result: null };
    entry.promise.then((r) => {
      entry.result = r;
      entry.resolved = true;
    }).catch(() => {
      entry.result = { type: 'NO_OP' };
      entry.resolved = true;
    });
    this.queue.push(entry);
  }

  async dequeue(tick: number): Promise<{ type: string; dir?: string; targetId?: string; reasoning?: string }> {
    const entry = this.queue.find((d) => d.tick === tick);
    if (!entry) return { type: 'NO_OP' };
    try {
      const result = await entry.promise;
      this.queue = this.queue.filter((d) => d !== entry);
      return result;
    } catch {
      this.queue = this.queue.filter((d) => d !== entry);
      return { type: 'NO_OP' };
    }
  }

  interrupt(): void {
    this.queue = [];
  }
}

/* ── Helpers ─────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function nearestAliveEnemy(actors: Record<string, any>, actorId: string): string | null {
  const me = actors[actorId];
  if (!me || me.hp <= 0) return null;
  let nearest: string | null = null;
  let minDist = Infinity;
  for (const id of Object.keys(actors)) {
    if (id === actorId) continue;
    const actor = actors[id];
    if (actor.hp <= 0) continue;
    const dx = actor.position.x - me.position.x;
    const dy = actor.position.y - me.position.y;
    const dist = Math.hypot(dx, dy);
    if (dist < minDist) {
      minDist = dist;
      nearest = id;
    }
  }
  return nearest;
}

async function fetchDecision(
  apiBase: string,
  gameState: any,
  actorId: string,
  opponentId: string,
  systemPrompt: string,
  loadout: string[],
  timeoutMs: number = 4000,
  extraHeaders?: Record<string, string>,
  brainPrompt?: string,
  skills?: string[],
): Promise<{ type: string; dir?: string; targetId?: string; reasoning?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(extraHeaders || {}),
    };

    const res = await fetch(apiBase, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        gameState,
        actorId,
        opponentIds: opponentId ? [opponentId] : [],
        systemPrompt,
        loadout,
        brainPrompt,
        skills: skills || [],
      }),
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return { type: 'NO_OP' };
    const data = await res.json();
    const action = data?.action ?? { type: 'NO_OP' };
    if (data?.reasoning) action.reasoning = data.reasoning;
    return action;
  } catch {
    clearTimeout(timer);
    return { type: 'NO_OP' };
  }
}

function serializableState(state: any) {
  return JSON.parse(JSON.stringify({
    tick: state.tick,
    actors: state.actors,
    objectiveScore: state.objectiveScore,
    ended: state.ended,
    winnerId: state.winnerId,
    endReason: state.endReason,
    events: state.events.slice(-30),
  }));
}

/** Determine correct FFA winner from actor states (engine's determineWinner only handles 2) */
function ffaWinnerId(actors: Record<string, any>): string | null {
  const alive = Object.entries(actors).filter(([, a]) => a.hp > 0);
  if (alive.length === 1) return alive[0][0];
  if (alive.length === 0) {
    let bestId: string | null = null;
    let bestDmg = -1;
    for (const [id, actor] of Object.entries(actors)) {
      const dmg = (actor as any).stats?.damageDealt ?? 0;
      if (dmg > bestDmg) { bestDmg = dmg; bestId = id; }
    }
    return bestId;
  }
  let bestId: string | null = null;
  let bestHp = -1;
  for (const [id, actor] of alive) {
    if ((actor as any).hp > bestHp) { bestHp = (actor as any).hp; bestId = id; }
  }
  return bestId;
}

/* ── Main runner ─────────────────────────────────────────────── */

export async function runMatchAsync(
  seed: number,
  bots: BotConfig[],
  onSnapshot: SnapshotCallback,
  apiBase: string = '/api/agent/decide',
  signal?: AbortSignal,
): Promise<MatchSnapshot> {
  if (bots.length < 2) throw new Error('Need at least 2 crawlers');

  const positions = getSpawnPositions(bots.length);

  const actors: Record<string, any> = {};
  for (let i = 0; i < bots.length; i++) {
    const bot = bots[i];
    const pos = bot.position.x >= 0 ? bot.position : positions[i];
    actors[bot.id] = createActorState({
      id: bot.id,
      position: { x: pos.x * UNIT_SCALE, y: pos.y * UNIT_SCALE },
      facing: FACING_CYCLE[i % FACING_CYCLE.length],
      armor: bot.armor,
      moveCost: bot.moveCost,
    });
  }

  const state = createInitialState({ seed, actors });

  const headersMap = new Map<string, Record<string, string>>();
  for (const bot of bots) {
    const h: Record<string, string> = { ...(bot.llmHeaders || {}) };
    if (bot.temperature !== undefined) {
      h['X-Llm-Temperature'] = String(bot.temperature);
    }
    headersMap.set(bot.id, h);
  }

  const queues = new Map<string, DecisionQueue>();
  for (const bot of bots) {
    queues.set(bot.id, new DecisionQueue());
  }

  const botMap = new Map<string, BotConfig>();
  for (const bot of bots) {
    botMap.set(bot.id, bot);
  }

  const isMulti = bots.length > 2;

  const fixWinner = () => {
    if (isMulti && state.ended) {
      state.winnerId = ffaWinnerId(state.actors);
    }
  };

  const makeSnapshot = (): MatchSnapshot => {
    const queueDepth: Record<string, number> = {};
    for (const [id, queue] of queues) {
      queueDepth[id] = queue.depth;
    }
    return {
      state: serializableState(state),
      tick: state.tick,
      ended: state.ended,
      winnerId: state.winnerId,
      queueDepth,
    };
  };

  onSnapshot(makeSnapshot());

  while (!state.ended && state.tick < MAX_TICKS) {
    if (signal?.aborted) {
      state.ended = true;
      state.endReason = 'ABORTED';
      break;
    }

    const isDecision = state.tick % DECISION_WINDOW_TICKS === 0;

    if (isDecision) {
      const snap = serializableState(state);
      const aliveBots = bots.filter((bot) => state.actors[bot.id]?.hp > 0);

      for (const bot of aliveBots) {
        const queue = queues.get(bot.id)!;
        const enemyId = nearestAliveEnemy(snap.actors, bot.id) ?? bot.id;
        const headers = headersMap.get(bot.id) ?? {};
        queue.enqueue(state.tick, () =>
          fetchDecision(apiBase, snap, bot.id, enemyId, bot.systemPrompt, bot.loadout, 4000, headers, bot.brainPrompt, bot.skills),
        );
      }

      const actions = new Map<string, { type: string; dir?: string; targetId?: string; reasoning?: string }>();
      await Promise.all(
        aliveBots.map(async (bot) => {
          const queue = queues.get(bot.id)!;
          const action = await queue.dequeue(state.tick);
          actions.set(bot.id, action);
        }),
      );

      for (const bot of aliveBots) {
        if (actions.get(bot.id)?.type === 'INTERRUPT') {
          for (const [id, queue] of queues) {
            if (id !== bot.id) queue.interrupt();
          }
        }
      }

      for (let i = 0; i < DECISION_WINDOW_TICKS && !state.ended; i++) {
        const actionsByActor = new Map<string, any>();
        if (i === 0) {
          for (const bot of aliveBots) {
            const action = actions.get(bot.id);
            if (action) {
              actionsByActor.set(bot.id, { ...action, tick: state.tick, actorId: bot.id });
            }
          }
        }
        resolveTick(state, actionsByActor);
      }

      fixWinner();

      if (!state.ended && state.tick < MAX_TICKS) {
        const nextSnap = serializableState(state);
        const nextTick = state.tick;
        if (nextTick % DECISION_WINDOW_TICKS === 0) {
          const nextAliveBots = bots.filter((bot) => state.actors[bot.id]?.hp > 0);
          for (const bot of nextAliveBots) {
            const queue = queues.get(bot.id)!;
            const enemyId = nearestAliveEnemy(nextSnap.actors, bot.id) ?? bot.id;
            const headers = headersMap.get(bot.id) ?? {};
            queue.enqueue(nextTick, () =>
              fetchDecision(apiBase, nextSnap, bot.id, enemyId, bot.systemPrompt, bot.loadout, 4000, headers, bot.brainPrompt, bot.skills),
            );
          }
        }
      }

      onSnapshot(makeSnapshot());
      await sleep(TICK_MS * 2);
    } else {
      resolveTick(state, new Map());
    }
  }

  fixWinner();
  const finalSnapshot = makeSnapshot();
  onSnapshot(finalSnapshot);
  return finalSnapshot;
}
