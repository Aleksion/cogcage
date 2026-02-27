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

/* ── Message history ───────────────────────────────────────── */

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Cap messages: keep system message + last N user/assistant pairs */
function capMessages(messages: ChatMessage[], maxPairs: number): ChatMessage[] {
  if (messages.length === 0) return messages;
  const system = messages[0].role === 'system' ? messages[0] : null;
  const rest = system ? messages.slice(1) : messages;
  // Each pair is 2 messages (user + assistant)
  const maxRest = maxPairs * 2;
  const trimmed = rest.length > maxRest ? rest.slice(-maxRest) : rest;
  return system ? [system, ...trimmed] : trimmed;
}

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
  opponentIds: string[],
  systemPrompt: string,
  loadout: string[],
  messages: ChatMessage[],
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
        opponentIds,
        systemPrompt,
        loadout,
        messages,
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

  // Per-bot message histories
  const messagesA: ChatMessage[] = [
    { role: 'system', content: botA.systemPrompt || 'You are a combat bot. Pick the best tactical action each turn.' },
  ];
  const messagesB: ChatMessage[] = [
    { role: 'system', content: botB.systemPrompt || 'You are a combat bot. Pick the best tactical action each turn.' },
  ];

  // All bot IDs for opponent resolution
  const allBotIds = [botA.id, botB.id];

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

      // Opponent IDs for each bot
      const opponentsA = allBotIds.filter(id => id !== botA.id);
      const opponentsB = allBotIds.filter(id => id !== botB.id);

      // Cap message histories before sending (system + last 10 pairs = 21 max)
      const cappedA = capMessages(messagesA, 10);
      const cappedB = capMessages(messagesB, 10);

      // Enqueue decisions for this tick
      queueA.enqueue(state.tick, () =>
        fetchDecision(apiBase, snap, botA.id, opponentsA, botA.systemPrompt, botA.loadout, cappedA, 4000, headersA),
      );
      queueB.enqueue(state.tick, () =>
        fetchDecision(apiBase, snap, botB.id, opponentsB, botB.systemPrompt, botB.loadout, cappedB, 4000, headersB),
      );

      // Await both decisions
      const [actionA, actionB] = await Promise.all([
        queueA.dequeue(state.tick),
        queueB.dequeue(state.tick),
      ]);

      // Append user + assistant messages to histories
      // The user message was built server-side by decide.ts from the gameState,
      // so we store a compact summary here for history continuity
      messagesA.push({ role: 'user', content: `[Turn tick=${state.tick}]` });
      messagesA.push({ role: 'assistant', content: JSON.stringify(actionA) });
      messagesB.push({ role: 'user', content: `[Turn tick=${state.tick}]` });
      messagesB.push({ role: 'assistant', content: JSON.stringify(actionB) });

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
          const nextCappedA = capMessages(messagesA, 10);
          const nextCappedB = capMessages(messagesB, 10);
          const nextOpponentsA = allBotIds.filter(id => id !== botA.id);
          const nextOpponentsB = allBotIds.filter(id => id !== botB.id);
          queueA.enqueue(nextTick, () =>
            fetchDecision(apiBase, nextSnap, botA.id, nextOpponentsA, botA.systemPrompt, botA.loadout, nextCappedA, 4000, headersA),
          );
          queueB.enqueue(nextTick, () =>
            fetchDecision(apiBase, nextSnap, botB.id, nextOpponentsB, botB.systemPrompt, botB.loadout, nextCappedB, 4000, headersB),
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
