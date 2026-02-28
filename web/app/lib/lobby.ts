import { redis } from './redis.ts';
import { getLoadouts } from './armory.ts';
import { loadoutToMatchConfig, getCard } from './cards.ts';

/* ── Types ──────────────────────────────────────────────────── */

export interface LobbyRecord {
  id: string;
  hostPlayerId: string;
  hostLoadoutId: string;
  guestPlayerId?: string;
  guestLoadoutId?: string;
  status: 'waiting' | 'ready' | 'in-match' | 'closed';
  createdAt: number;
}

export interface BotSnapshot {
  botName: string;
  brainPrompt: string;
  skills: string[];
  cards: string[];
  actionTypes: string[];
  armor: 'light' | 'medium' | 'heavy';
  moveCost: number;
}

const LOBBY_TTL = 7200; // 2 hours
const OPEN_SET_KEY = 'lobbies:open';

function lobbyKey(id: string): string {
  return `lobby:${id}`;
}

function generateId(): string {
  return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}

/* ── Resolve shell → BotSnapshot ─────────────────────────── */

const DEFAULT_BRAIN_PROMPT = `You are a tactical combat crawler in a grid-based arena.
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

/* ── CRUD ───────────────────────────────────────────────────── */

async function saveLobby(lobby: LobbyRecord): Promise<void> {
  await redis.set(lobbyKey(lobby.id), JSON.stringify(lobby), { ex: LOBBY_TTL });
}

export async function createLobby(
  hostPlayerId: string,
  hostLoadoutId: string,
): Promise<LobbyRecord> {
  const id = generateId();
  const lobby: LobbyRecord = {
    id,
    hostPlayerId,
    hostLoadoutId,
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
  guestPlayerId: string,
  guestLoadoutId: string,
): Promise<LobbyRecord> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.status !== 'waiting') throw new Error('Lobby not available');
  if (lobby.guestPlayerId) throw new Error('Lobby full');

  lobby.guestPlayerId = guestPlayerId;
  lobby.guestLoadoutId = guestLoadoutId;
  lobby.status = 'ready';
  await saveLobby(lobby);
  await redis.zrem(OPEN_SET_KEY, lobbyId);
  return lobby;
}

export async function addDummy(lobbyId: string): Promise<LobbyRecord> {
  const lobby = await getLobby(lobbyId);
  if (!lobby) throw new Error('Lobby not found');
  if (lobby.guestPlayerId) throw new Error('Guest slot already filled');

  lobby.guestPlayerId = lobby.hostPlayerId;
  lobby.guestLoadoutId = lobby.hostLoadoutId;
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
  if (!lobby.guestPlayerId || !lobby.guestLoadoutId) throw new Error('Guest not set');

  const botA = await resolveSnapshot(lobby.hostPlayerId, lobby.hostLoadoutId);
  const botB = await resolveSnapshot(lobby.guestPlayerId, lobby.guestLoadoutId);
  if (!botA || !botB) throw new Error('Could not resolve loadouts');

  lobby.status = 'in-match';
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

  if (playerId === lobby.hostPlayerId) {
    lobby.status = 'closed';
    await saveLobby(lobby);
    await redis.zrem(OPEN_SET_KEY, lobbyId);
  } else if (playerId === lobby.guestPlayerId) {
    lobby.guestPlayerId = undefined;
    lobby.guestLoadoutId = undefined;
    lobby.status = 'waiting';
    await saveLobby(lobby);
    await redis.zadd(OPEN_SET_KEY, { score: lobby.createdAt, member: lobbyId });
  }
}
