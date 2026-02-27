import { redis } from './redis.ts';
import { getLoadouts } from './armory.ts';
import { loadoutToMatchConfig, getCard } from './cards.ts';

/* ── Types ──────────────────────────────────────────────────── */

export interface BotSnapshot {
  botName: string;
  brainPrompt: string;
  skills: string[];
  cards: string[];
  actionTypes: string[];
  armor: 'light' | 'medium' | 'heavy';
  moveCost: number;
}

export interface LobbyRecord {
  id: string;
  ownerId: string;              // userId of creator
  challengerId?: string;        // userId of opponent (set on join)
  ownerBot: BotSnapshot;        // owner's bot — only owner can edit
  challengerBot?: BotSnapshot;  // challenger's bot — only challenger can edit
  ownerReady: boolean;
  challengerReady: boolean;
  status: 'waiting' | 'ready' | 'active' | 'complete';
  createdAt: number;
}

/** Role the current viewer has in a lobby. */
export type LobbyRole = 'owner' | 'challenger' | 'spectator';

const LOBBY_TTL = 7200; // 2 hours
const OPEN_SET_KEY = 'lobbies:open';

function lobbyKey(id: string): string {
  return `lobby:${id}`;
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/* ── Resolve loadout → BotSnapshot ─────────────────────────── */

const DEFAULT_BRAIN_PROMPT = `You are a tactical combat agent in a grid-based arena.
Analyze the game state each turn and choose the optimal action.
Balance offense and defense. Conserve energy for key moments.
Use your skills strategically — they provide critical advantages.`;

export async function resolveSnapshot(
  playerId: string,
  loadoutId: string,
): Promise<BotSnapshot | null> {
  const loadouts = await getLoadouts(playerId);
  const loadout = loadouts.find((l) => l.id === loadoutId);
  if (!loadout) return null;

  const matchCfg = loadoutToMatchConfig(loadout.cards);
  return {
    botName: loadout.name,
    brainPrompt: loadout.brainPrompt || DEFAULT_BRAIN_PROMPT,
    skills: loadout.skills || [],
    cards: loadout.cards,
    actionTypes: matchCfg.actionTypes,
    armor: matchCfg.armor,
    moveCost: matchCfg.moveCost,
  };
}

/* ── Helpers ────────────────────────────────────────────────── */

async function saveLobby(lobby: LobbyRecord): Promise<void> {
  await redis.set(lobbyKey(lobby.id), JSON.stringify(lobby), { ex: LOBBY_TTL });
}

export function getRole(lobby: LobbyRecord, userId: string | null): LobbyRole {
  if (userId && userId === lobby.ownerId) return 'owner';
  if (userId && userId === lobby.challengerId) return 'challenger';
  return 'spectator';
}

/* ── CRUD ───────────────────────────────────────────────────── */

export async function createLobby(
  ownerId: string,
  loadoutId: string,
): Promise<LobbyRecord> {
  const ownerBot = await resolveSnapshot(ownerId, loadoutId);
  if (!ownerBot) throw new Error('Could not resolve loadout');

  const id = generateId();
  const lobby: LobbyRecord = {
    id,
    ownerId,
    ownerBot,
    ownerReady: false,
    challengerReady: false,
    status: 'waiting',
    createdAt: Date.now(),
  };
  await saveLobby(lobby);
  await redis.zadd(OPEN_SET_KEY, { score: lobby.createdAt, member: id });
  return lobby;
}

export async function getLobby(id: string): Promise<LobbyRecord | null> {
  const raw = await redis.get<string>(lobbyKey(id));
  if (!raw) return null;
  if (typeof raw === 'object') return raw as unknown as LobbyRecord;
  return JSON.parse(raw) as LobbyRecord;
}

export async function listOpenLobbies(limit = 20): Promise<LobbyRecord[]> {
  const ids = await redis.zrange(OPEN_SET_KEY, 0, -1, { rev: true });
  if (!ids || ids.length === 0) return [];

  const lobbies: LobbyRecord[] = [];
  for (const id of ids.slice(0, limit)) {
    const lobby = await getLobby(id as string);
    if (lobby && lobby.status === 'waiting') {
      lobbies.push(lobby);
    }
  }
  return lobbies;
}

export async function joinLobby(
  lobbyId: string,
  challengerId: string,
  loadoutId: string,
): Promise<LobbyRecord> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.status !== 'waiting') throw new Error('Lobby not available');
  if (lobby.challengerId) throw new Error('Lobby full');
  if (challengerId === lobby.ownerId) throw new Error('Cannot join your own lobby');

  const challengerBot = await resolveSnapshot(challengerId, loadoutId);
  if (!challengerBot) throw new Error('Could not resolve loadout');

  lobby.challengerId = challengerId;
  lobby.challengerBot = challengerBot;
  await saveLobby(lobby);
  await redis.zrem(OPEN_SET_KEY, lobbyId);
  return lobby;
}

export async function updateBot(
  lobbyId: string,
  userId: string,
  loadoutId: string,
): Promise<LobbyRecord> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');

  const role = getRole(lobby, userId);
  if (role === 'spectator') throw new Error('Forbidden');

  const bot = await resolveSnapshot(userId, loadoutId);
  if (!bot) throw new Error('Could not resolve loadout');

  if (role === 'owner') {
    lobby.ownerBot = bot;
    lobby.ownerReady = false; // editing resets ready
  } else {
    lobby.challengerBot = bot;
    lobby.challengerReady = false;
  }

  await saveLobby(lobby);
  return lobby;
}

export async function setReady(
  lobbyId: string,
  userId: string,
  ready: boolean,
): Promise<LobbyRecord> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');

  const role = getRole(lobby, userId);
  if (role === 'spectator') throw new Error('Forbidden');

  if (role === 'owner') {
    lobby.ownerReady = ready;
  } else {
    lobby.challengerReady = ready;
  }

  // Auto-advance to 'ready' when both players are ready
  if (lobby.ownerReady && lobby.challengerReady && lobby.challengerId) {
    lobby.status = 'ready';
  } else if (lobby.challengerId) {
    // Revert if someone un-readied
    lobby.status = 'waiting';
  }

  await saveLobby(lobby);
  return lobby;
}

export async function addDummy(lobbyId: string): Promise<LobbyRecord> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.challengerId) throw new Error('Challenger slot already filled');

  // Mirror match: clone the owner's bot
  lobby.challengerId = lobby.ownerId;
  lobby.challengerBot = { ...lobby.ownerBot, botName: lobby.ownerBot.botName + ' (Mirror)' };
  lobby.challengerReady = true;
  lobby.ownerReady = true;
  lobby.status = 'ready';
  await saveLobby(lobby);
  await redis.zrem(OPEN_SET_KEY, lobbyId);
  return lobby;
}

export async function startLobbyMatch(
  lobbyId: string,
): Promise<{ lobby: LobbyRecord; botA: BotSnapshot; botB: BotSnapshot; seed: number }> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.status !== 'ready') throw new Error('Lobby not ready');
  if (!lobby.challengerId || !lobby.challengerBot) throw new Error('Challenger not set');

  const botA = lobby.ownerBot;
  const botB = lobby.challengerBot;

  lobby.status = 'active';
  await saveLobby(lobby);
  await redis.zrem(OPEN_SET_KEY, lobbyId);

  const seed = Date.now();
  return { lobby, botA, botB, seed };
}

export async function closeLobby(
  lobbyId: string,
  playerId: string,
): Promise<void> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) return;

  if (playerId === lobby.ownerId) {
    lobby.status = 'complete';
    await saveLobby(lobby);
    await redis.zrem(OPEN_SET_KEY, lobbyId);
  } else if (playerId === lobby.challengerId) {
    lobby.challengerId = undefined;
    lobby.challengerBot = undefined;
    lobby.challengerReady = false;
    lobby.ownerReady = false;
    lobby.status = 'waiting';
    await saveLobby(lobby);
    await redis.zadd(OPEN_SET_KEY, { score: lobby.createdAt, member: lobbyId });
  }
}
