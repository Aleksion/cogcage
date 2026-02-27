/**
 * Shared types and utility functions extracted from the deleted match-runner.ts.
 * Used by Play.tsx, MatchView.tsx, SessionRoom.tsx, and session.ts.
 */

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
  /** Energy cost per MOVE action (default 4, increases with loadout weight) */
  moveCost?: number;
  /** Custom brain prompt (system prompt for the LLM) */
  brainPrompt?: string;
  /** Equipped skill IDs (max 3) */
  skills?: string[];
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

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** Cap messages: keep system message + last N user/assistant pairs */
export function capMessages(messages: ChatMessage[], maxPairs: number): ChatMessage[] {
  if (messages.length === 0) return messages;
  const system = messages[0].role === 'system' ? messages[0] : null;
  const rest = system ? messages.slice(1) : messages;
  const maxRest = maxPairs * 2;
  const trimmed = rest.length > maxRest ? rest.slice(-maxRest) : rest;
  return system ? [system, ...trimmed] : trimmed;
}

/* ── Spawn positions ───────────────────────────────────────── */

const POSITION_SPREADS: Record<number, Array<{ x: number; y: number }>> = {
  2: [{ x: 6, y: 10 }, { x: 14, y: 10 }],
  3: [{ x: 4, y: 10 }, { x: 16, y: 10 }, { x: 10, y: 3 }],
  4: [{ x: 3, y: 3 }, { x: 17, y: 3 }, { x: 3, y: 17 }, { x: 17, y: 17 }],
  5: [{ x: 10, y: 3 }, { x: 17, y: 8 }, { x: 15, y: 17 }, { x: 5, y: 17 }, { x: 3, y: 8 }],
};

export function getSpawnPositions(count: number): Array<{ x: number; y: number }> {
  if (POSITION_SPREADS[count]) return POSITION_SPREADS[count];
  const cx = 3.5;
  const cy = 3.5;
  const r = 3.2;
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return {
      x: Math.round(cx + r * Math.cos(angle)),
      y: Math.round(cy + r * Math.sin(angle)),
    };
  });
}
