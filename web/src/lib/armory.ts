import { redis } from './redis.ts';
import { calculateLoadoutStats, validateLoadout } from './cards.ts';

/* ── Types ──────────────────────────────────────────────────── */

export interface SavedLoadout {
  id: string;
  name: string;
  cards: string[];
  brainPrompt: string;
  skills: string[];
  createdAt: number;
  stats: {
    totalWeight: number;
    totalOverhead: number;
    armorValue: number;
  };
}

const ARMORY_TTL = 90 * 24 * 60 * 60; // 90 days

function redisKey(playerId: string): string {
  return `armory:${playerId}`;
}

/* ── CRUD ───────────────────────────────────────────────────── */

export async function getLoadouts(playerId: string): Promise<SavedLoadout[]> {
  const raw = await redis.get<string>(redisKey(playerId));
  if (!raw) return [];
  if (typeof raw === 'object') return raw as unknown as SavedLoadout[];
  return JSON.parse(raw) as SavedLoadout[];
}

async function saveLoadouts(playerId: string, loadouts: SavedLoadout[]): Promise<void> {
  await redis.set(redisKey(playerId), JSON.stringify(loadouts), { ex: ARMORY_TTL });
}

export async function saveLoadout(
  playerId: string,
  name: string,
  cards: string[],
  brainPrompt: string = '',
  skills: string[] = [],
): Promise<{ loadouts: SavedLoadout[]; error?: string }> {
  const validation = validateLoadout(cards);
  if (!validation.valid) {
    return { loadouts: [], error: validation.errors.join('; ') };
  }

  const existing = await getLoadouts(playerId);
  if (existing.length >= 10) {
    return { loadouts: existing, error: 'Max 10 saved loadouts' };
  }

  const stats = calculateLoadoutStats(cards);
  const loadout: SavedLoadout = {
    id: crypto.randomUUID(),
    name: name.trim() || 'Unnamed Loadout',
    cards,
    brainPrompt,
    skills: skills.slice(0, 3),
    createdAt: Date.now(),
    stats: {
      totalWeight: stats.totalWeight,
      totalOverhead: stats.totalOverhead,
      armorValue: stats.armorValue,
    },
  };

  existing.push(loadout);
  await saveLoadouts(playerId, existing);
  return { loadouts: existing };
}

export async function deleteLoadout(
  playerId: string,
  loadoutId: string,
): Promise<{ loadouts: SavedLoadout[] }> {
  const existing = await getLoadouts(playerId);
  const filtered = existing.filter((l) => l.id !== loadoutId);
  await saveLoadouts(playerId, filtered);
  return { loadouts: filtered };
}
