import {
  createInitialState,
  createActorState,
  resolveTick,
} from './engine.js';
import {
  DECISION_WINDOW_TICKS,
  TICK_MS,
  UNIT_SCALE,
  ENERGY_MAX,
  HP_MAX,
  MAX_TICKS,
} from './constants.js';

export interface BotConfig {
  id: string;
  name: string;
  systemPrompt: string;
  loadout: string[];
  armor: 'light' | 'medium' | 'heavy';
  position: { x: number; y: number };
  /** LLM temperature / aggression 0-1 */
  temperature?: number;
  /** BYO LLM headers forwarded to decide endpoint */
  llmHeaders?: Record<string, string>;
}

export interface MatchSnapshot {
  state: any;
  tick: number;
  ended: boolean;
  winnerId: string | null;
  /** Queue depth for each bot (how many prefetched decisions are pending) */
  queueDepth?: Record<string, number>;
}

export type SnapshotCallback = (snap: MatchSnapshot) => void;

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

  /** Cancel all pending decisions (INTERRUPT) */
  interrupt(): void {
    this.queue = [];
  }
}

/* ── Helpers ─────────────────────────────────────────────────── */

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDecision(
  apiBase: string,
  gameState: any,
  actorId: string,
  opponentId: string,
  systemPrompt: string,
  loadout: string[],
  timeoutMs: number = 4000,
  extraHeaders?: Record<string, string>,
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
        opponentId,
        systemPrompt,
        loadout,
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

/* ── Main runner ─────────────────────────────────────────────── */

export async function runMatchAsync(
  seed: number,
  botA: BotConfig,
  botB: BotConfig,
  onSnapshot: SnapshotCallback,
  apiBase: string = '/api/agent/decide',
  signal?: AbortSignal,
): Promise<MatchSnapshot> {
  const actors: Record<string, any> = {
    [botA.id]: createActorState({
      id: botA.id,
      position: { x: botA.position.x * UNIT_SCALE, y: botA.position.y * UNIT_SCALE },
      facing: 'E',
      armor: botA.armor,
    }),
    [botB.id]: createActorState({
      id: botB.id,
      position: { x: botB.position.x * UNIT_SCALE, y: botB.position.y * UNIT_SCALE },
      facing: 'W',
      armor: botB.armor,
    }),
  };

  const state = createInitialState({ seed, actors });

  // Build per-bot LLM headers (temperature + BYO keys)
  const headersA: Record<string, string> = { ...(botA.llmHeaders || {}) };
  const headersB: Record<string, string> = { ...(botB.llmHeaders || {}) };
  if (botA.temperature !== undefined) {
    headersA['X-Llm-Temperature'] = String(botA.temperature);
  }
  if (botB.temperature !== undefined) {
    headersB['X-Llm-Temperature'] = String(botB.temperature);
  }

  // Decision queues for prefetch
  const queueA = new DecisionQueue();
  const queueB = new DecisionQueue();

  const makeSnapshot = (): MatchSnapshot => ({
    state: serializableState(state),
    tick: state.tick,
    ended: state.ended,
    winnerId: state.winnerId,
    queueDepth: { [botA.id]: queueA.depth, [botB.id]: queueB.depth },
  });

  // Emit initial snapshot
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

      // Enqueue decisions for this tick (uses prefetched if already queued)
      queueA.enqueue(state.tick, () =>
        fetchDecision(apiBase, snap, botA.id, botB.id, botA.systemPrompt, botA.loadout, 4000, headersA, botA),
      );
      queueB.enqueue(state.tick, () =>
        fetchDecision(apiBase, snap, botB.id, botA.id, botB.systemPrompt, botB.loadout, 4000, headersB, botB),
      );

      // Await both decisions
      const [actionA, actionB] = await Promise.all([
        queueA.dequeue(state.tick),
        queueB.dequeue(state.tick),
      ]);

      // Check for INTERRUPT action — cancels opponent's queued decisions
      if (actionA.type === 'INTERRUPT') {
        queueB.interrupt();
      }
      if (actionB.type === 'INTERRUPT') {
        queueA.interrupt();
      }

      // Run all ticks of the decision window synchronously
      for (let i = 0; i < DECISION_WINDOW_TICKS && !state.ended; i++) {
        const actionsByActor = new Map<string, any>();
        if (i === 0) {
          actionsByActor.set(botA.id, { ...actionA, tick: state.tick, actorId: botA.id });
          actionsByActor.set(botB.id, { ...actionB, tick: state.tick, actorId: botB.id });
        }
        resolveTick(state, actionsByActor);
      }

      // Prefetch next decision window while we render
      if (!state.ended && state.tick < MAX_TICKS) {
        const nextSnap = serializableState(state);
        const nextTick = state.tick;
        // Only prefetch on decision boundaries
        if (nextTick % DECISION_WINDOW_TICKS === 0) {
          queueA.enqueue(nextTick, () =>
            fetchDecision(apiBase, nextSnap, botA.id, botB.id, botA.systemPrompt, botA.loadout, 4000, headersA, botA),
          );
          queueB.enqueue(nextTick, () =>
            fetchDecision(apiBase, nextSnap, botB.id, botA.id, botB.systemPrompt, botB.loadout, 4000, headersB, botB),
          );
        }
      }

      // Emit snapshot after each decision window
      onSnapshot(makeSnapshot());

      // Small delay for UI rendering
      await sleep(TICK_MS * 2);
    } else {
      // Non-decision ticks shouldn't happen in this loop structure
      // since we process all 3 ticks per window above, but safety:
      resolveTick(state, new Map());
    }
  }

  const finalSnapshot = makeSnapshot();
  onSnapshot(finalSnapshot);
  return finalSnapshot;
}
