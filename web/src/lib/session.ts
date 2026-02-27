import { redis } from './redis.ts';
import type { BotConfig } from './ws2/match-runner.ts';

/* ── Types ──────────────────────────────────────────────────── */

export interface SessionBot {
  name: string;
  systemPrompt: string;
  loadout: string[];
  armor: 'light' | 'medium' | 'heavy';
  temperature?: number;
  llmHeaders?: Record<string, string>;
}

export interface Participant {
  id: string;
  name: string;
  bot: SessionBot;
  joinedAt: number;
}

export interface BracketMatch {
  id: string;
  round: number;
  index: number;
  participantA: string; // participant id
  participantB: string; // participant id
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
  status: 'pending' | 'running' | 'done';
}

export interface LeaderboardEntry {
  participantId: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
}

export interface Session {
  id: string;
  code: string;
  hostParticipantId: string;
  status: 'lobby' | 'running' | 'done';
  participants: Participant[];
  bracket: BracketMatch[];
  leaderboard: LeaderboardEntry[];
  currentMatchId: string | null;
  createdAt: number;
}

const SESSION_TTL = 7200; // 2 hours

/* ── Helpers ────────────────────────────────────────────────── */

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

function generateCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

async function saveSession(session: Session): Promise<void> {
  await redis.set(`session:${session.id}`, JSON.stringify(session), { ex: SESSION_TTL });
}

/* ── Public API ─────────────────────────────────────────────── */

export async function createSession(
  hostName: string,
  bot: SessionBot,
): Promise<{ sessionId: string; code: string; participantId: string }> {
  const sessionId = generateId();
  const code = generateCode();
  const participantId = generateId();

  const participant: Participant = {
    id: participantId,
    name: hostName,
    bot,
    joinedAt: Date.now(),
  };

  const session: Session = {
    id: sessionId,
    code,
    hostParticipantId: participantId,
    status: 'lobby',
    participants: [participant],
    bracket: [],
    leaderboard: [],
    currentMatchId: null,
    createdAt: Date.now(),
  };

  await saveSession(session);
  await redis.set(`session-code:${code}`, sessionId, { ex: SESSION_TTL });

  return { sessionId, code, participantId };
}

export async function joinSession(
  sessionId: string,
  name: string,
  bot: SessionBot,
): Promise<{ participantId: string }> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.status !== 'lobby') throw new Error('Session already started');

  const participantId = generateId();
  const participant: Participant = {
    id: participantId,
    name,
    bot,
    joinedAt: Date.now(),
  };

  session.participants.push(participant);
  await saveSession(session);

  return { participantId };
}

export async function getSession(sessionId: string): Promise<Session | null> {
  const raw = await redis.get<string>(`session:${sessionId}`);
  if (!raw) return null;
  // Upstash may return parsed object or string depending on the value stored
  if (typeof raw === 'object') return raw as unknown as Session;
  return JSON.parse(raw) as Session;
}

export async function getSessionIdByCode(code: string): Promise<string | null> {
  const sessionId = await redis.get<string>(`session-code:${code.toUpperCase()}`);
  return sessionId ?? null;
}

export function generateBracket(participants: Participant[]): BracketMatch[] {
  // Round-robin: every participant plays every other participant once
  const matches: BracketMatch[] = [];
  let matchIndex = 0;

  for (let i = 0; i < participants.length; i++) {
    for (let j = i + 1; j < participants.length; j++) {
      matches.push({
        id: `match-${matchIndex}`,
        round: matchIndex,
        index: matchIndex,
        participantA: participants[i].id,
        participantB: participants[j].id,
        winnerId: null,
        scoreA: 0,
        scoreB: 0,
        status: 'pending',
      });
      matchIndex++;
    }
  }

  return matches;
}

export async function startSession(
  sessionId: string,
  hostParticipantId: string,
): Promise<{ bracket: BracketMatch[] }> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');
  if (session.hostParticipantId !== hostParticipantId) throw new Error('Only host can start');
  if (session.status !== 'lobby') throw new Error('Session already started');
  if (session.participants.length < 2) throw new Error('Need at least 2 participants');

  const bracket = generateBracket(session.participants);
  session.bracket = bracket;
  session.status = 'running';
  session.currentMatchId = bracket[0]?.id ?? null;

  // Initialize leaderboard
  session.leaderboard = session.participants.map((p) => ({
    participantId: p.id,
    name: p.name,
    wins: 0,
    losses: 0,
    points: 0,
  }));

  await saveSession(session);
  return { bracket };
}

export function updateLeaderboard(session: Session): LeaderboardEntry[] {
  const board = new Map<string, LeaderboardEntry>();

  for (const p of session.participants) {
    board.set(p.id, {
      participantId: p.id,
      name: p.name,
      wins: 0,
      losses: 0,
      points: 0,
    });
  }

  for (const match of session.bracket) {
    if (match.status !== 'done' || !match.winnerId) continue;
    const loserId = match.winnerId === match.participantA ? match.participantB : match.participantA;

    const winner = board.get(match.winnerId);
    if (winner) {
      winner.wins += 1;
      winner.points += 3;
    }

    const loser = board.get(loserId);
    if (loser) {
      loser.losses += 1;
    }
  }

  return Array.from(board.values()).sort((a, b) => b.points - a.points || b.wins - a.wins);
}

export async function completeMatch(
  sessionId: string,
  matchId: string,
  winnerId: string,
  scoreA: number,
  scoreB: number,
): Promise<{ nextMatchId: string | null; leaderboard: LeaderboardEntry[]; done: boolean }> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  const match = session.bracket.find((m) => m.id === matchId);
  if (!match) throw new Error('Match not found');

  match.winnerId = winnerId;
  match.scoreA = scoreA;
  match.scoreB = scoreB;
  match.status = 'done';

  // Find next pending match
  const nextMatch = session.bracket.find((m) => m.status === 'pending');
  const nextMatchId = nextMatch?.id ?? null;

  if (nextMatchId) {
    session.currentMatchId = nextMatchId;
  } else {
    session.status = 'done';
    session.currentMatchId = null;
  }

  session.leaderboard = updateLeaderboard(session);
  await saveSession(session);

  return {
    nextMatchId,
    leaderboard: session.leaderboard,
    done: !nextMatchId,
  };
}

export interface FfaPlacement {
  participantId: string;
  placement: number;
  damageDealt: number;
  hp: number;
}

export async function completeFfaMatch(
  sessionId: string,
  winnerId: string | null,
  placements: FfaPlacement[],
): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const session = await getSession(sessionId);
  if (!session) throw new Error('Session not found');

  session.status = 'done';
  session.currentMatchId = null;

  // Build leaderboard from FFA placements (sorted by placement ascending)
  const sorted = [...placements].sort((a, b) => a.placement - b.placement);
  session.leaderboard = sorted.map((r) => {
    const p = session.participants.find((pp) => pp.id === r.participantId);
    return {
      participantId: r.participantId,
      name: p?.name ?? 'Unknown',
      wins: r.participantId === winnerId ? 1 : 0,
      losses: r.participantId === winnerId ? 0 : 1,
      points: session.participants.length - r.placement + 1,
    };
  });

  await saveSession(session);
  return { leaderboard: session.leaderboard };
}
