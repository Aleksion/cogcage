import crypto from 'crypto';
import { runMatchFromLog } from './engine.ts';
import type { GameState, ActorState, AgentAction, GameEvent } from './engine.ts';

export const stableStringify = (value: unknown): string => {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    const body = keys.map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`).join(',');
    return `{${body}}`;
  }
  return JSON.stringify(value);
};

export const hashEvents = (events: GameEvent[]): string => {
  const hash = crypto.createHash('sha256');
  hash.update(stableStringify(events));
  return hash.digest('hex');
};

export interface ReplayResult {
  state: GameState;
  eventHash: string;
}

export const replayMatch = ({ seed, actors, actionLog }: { seed: number; actors: Record<string, ActorState>; actionLog?: AgentAction[] }): ReplayResult => {
  const state = runMatchFromLog({ seed, actors, actionLog });
  return {
    state,
    eventHash: hashEvents(state.events),
  };
};
