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
  agentMode?: 'hosted' | 'byo';
  webhookUrl?: string;
}

export interface MatchSnapshot {
  state: any;
  tick: number;
  ended: boolean;
  winnerId: string | null;
}

export type SnapshotCallback = (snap: MatchSnapshot) => void;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function fetchDecision(
  botConfig: BotConfig,
  gameState: any,
  opponentId: string,
  timeoutMs: number = 250,
  apiBase: string = '/api/agent/decide',
): Promise<{ type: string; dir?: string; targetId?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let res: Response;
    if (botConfig.agentMode === 'byo' && botConfig.webhookUrl) {
      res = await fetch('/api/agent/external', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          webhookUrl: botConfig.webhookUrl,
          payload: {
            gameState,
            actorId: botConfig.id,
            opponentId,
            loadout: botConfig.loadout,
            systemPrompt: botConfig.systemPrompt,
          },
        }),
        signal: controller.signal,
      });
    } else {
      res = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gameState,
          actorId: botConfig.id,
          opponentId,
          systemPrompt: botConfig.systemPrompt,
          loadout: botConfig.loadout,
        }),
        signal: controller.signal,
      });
    }
    clearTimeout(timer);
    if (!res.ok) return { type: 'NO_OP' };
    const data = await res.json();
    return data?.action ?? { type: 'NO_OP' };
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

  const makeSnapshot = (): MatchSnapshot => ({
    state: serializableState(state),
    tick: state.tick,
    ended: state.ended,
    winnerId: state.winnerId,
  });

  // Emit initial snapshot
  onSnapshot(makeSnapshot());

  while (!state.ended && state.tick < MAX_TICKS) {
    if (signal?.aborted) {
      // Force end the match on abort
      state.ended = true;
      state.endReason = 'ABORTED';
      break;
    }

    const isDecision = state.tick % DECISION_WINDOW_TICKS === 0;

    if (isDecision) {
      // Fire parallel fetch calls for both agents with client-side 4s timeout
      // (server has 3s timeout, plus network overhead)
      const [actionA, actionB] = await Promise.all([
        fetchDecision(botA, serializableState(state), botB.id, 4000, apiBase),
        fetchDecision(botB, serializableState(state), botA.id, 4000, apiBase),
      ]);

      // Run all 3 ticks of the decision window synchronously
      for (let i = 0; i < DECISION_WINDOW_TICKS && !state.ended; i++) {
        const actionsByActor = new Map<string, any>();
        if (i === 0) {
          actionsByActor.set(botA.id, { ...actionA, tick: state.tick, actorId: botA.id });
          actionsByActor.set(botB.id, { ...actionB, tick: state.tick, actorId: botB.id });
        }
        resolveTick(state, actionsByActor);
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
