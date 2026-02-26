import React, { useEffect, useMemo, useRef, useState } from 'react';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --c-white: #FFFFFF;
    --c-green: #2ecc71;
    --c-purple: #5f27cd;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --radius: 14px;
    --shadow-hard: 6px 6px 0px rgba(0,0,0,0.2);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: radial-gradient(circle at 20% 20%, rgba(255,214,0,0.15), transparent 35%),
      radial-gradient(circle at 80% 0%, rgba(0,229,255,0.12), transparent 40%),
      linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    font-family: var(--f-body);
    color: var(--c-dark);
    min-height: 100vh;
  }

  .play-root { min-height: 100vh; position: relative; overflow-x: hidden; }

  .bg-scanlines {
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.12;
    background: repeating-linear-gradient(
      0deg,
      rgba(0,0,0,0.15),
      rgba(0,0,0,0.15) 1px,
      transparent 1px,
      transparent 4px
    );
    z-index: 0;
  }

  .play-header {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 2.5rem;
    background: rgba(255,255,255,0.9);
    border-bottom: 4px solid var(--c-dark);
    backdrop-filter: blur(8px);
  }

  .logo {
    font-family: var(--f-display);
    font-size: 2.2rem;
    text-decoration: none;
    color: var(--c-red);
    text-shadow: 2px 2px 0px var(--c-dark);
  }

  .header-links {
    display: flex;
    gap: 1rem;
    align-items: center;
  }

  .header-link {
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--c-dark);
    padding: 0.5rem 1rem;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
    background: var(--c-white);
    box-shadow: var(--shadow-hard);
    font-size: 0.95rem;
  }

  .header-link.active {
    background: var(--c-yellow);
  }

  .play-shell {
    position: relative;
    z-index: 1;
    padding: 2.5rem 3rem 3.5rem;
  }

  .play-grid {
    display: grid;
    grid-template-columns: minmax(280px, 1fr) minmax(320px, 1.2fr);
    gap: 2rem;
  }

  .panel {
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    border-radius: var(--radius);
    box-shadow: var(--shadow-hard);
    padding: 2rem;
  }

  .panel h2 {
    font-family: var(--f-display);
    font-size: 2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }

  .section-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    letter-spacing: 1px;
  }

  .prompt-box {
    width: 100%;
    min-height: 72px;
    resize: vertical;
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-family: var(--f-body);
    font-size: 1rem;
  }

  .cta-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--f-display);
    font-size: 1.3rem;
    text-transform: uppercase;
    padding: 0.9rem 2.5rem;
    background: var(--c-red);
    color: var(--c-white);
    border: 4px solid var(--c-dark);
    border-radius: 999px;
    box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .cta-btn:active { transform: translateY(4px); box-shadow: none; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: 0 6px 0 var(--c-dark); }

  .action-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(64px, 1fr));
    gap: 0.5rem;
    margin-bottom: 1rem;
  }

  .action-btn {
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    background: var(--c-yellow);
    font-weight: 900;
    padding: 0.65rem 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
    text-transform: uppercase;
  }

  .action-btn.secondary {
    background: var(--c-white);
  }

  .action-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 900;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    border: 2px solid var(--c-dark);
    background: var(--c-white);
    font-size: 0.85rem;
  }

  .arena-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .arena-badge {
    font-family: var(--f-display);
    font-size: 1.1rem;
    text-transform: uppercase;
    background: var(--c-cyan);
    padding: 0.35rem 0.9rem;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
  }

  .stat-block { margin-bottom: 1.2rem; }

  .stat-title {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    margin-bottom: 0.35rem;
  }

  .bar-shell {
    height: 16px;
    background: #101010;
    border-radius: 999px;
    overflow: hidden;
    border: 2px solid var(--c-dark);
  }

  .bar-fill {
    height: 100%;
    transition: width 0.35s ease;
    background: linear-gradient(90deg, #2ecc71 0%, #27ae60 100%);
  }

  .bar-fill.opponent {
    background: linear-gradient(90deg, #ff6b6b 0%, #d63031 100%);
  }

  .arena-map {
    margin: 1rem 0 1.2rem;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(28px, 1fr));
    gap: 6px;
    padding: 0.75rem;
    background: #101010;
    border-radius: 16px;
    border: 3px solid var(--c-dark);
  }

  .arena-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    background: #f6f7f8;
    border: 2px solid rgba(0,0,0,0.2);
    display: grid;
    place-items: center;
    font-weight: 900;
    color: #111;
  }

  .arena-cell.obstacle {
    background: #2f2f2f;
    border-color: #000;
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.05);
  }

  .arena-cell.in-range {
    box-shadow: inset 0 0 0 3px rgba(255, 214, 0, 0.85);
  }

  .arena-cell.player {
    background: #2ecc71;
    color: #0f2b18;
  }

  .arena-cell.enemy {
    background: #eb4d4b;
    color: #fff;
  }

  .arena-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    font-size: 0.85rem;
  }

  .feed {
    background: #0f0f0f;
    color: #f5f5f5;
    border-radius: 12px;
    border: 3px solid var(--c-dark);
    padding: 1rem;
    max-height: 320px;
    overflow-y: auto;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .feed-item { padding: 0.6rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .feed-item:last-child { border-bottom: none; }

  .winner-banner {
    margin-top: 1.2rem;
    padding: 1rem 1.4rem;
    border-radius: 12px;
    border: 3px solid var(--c-dark);
    background: var(--c-yellow);
    font-family: var(--f-display);
    text-transform: uppercase;
    font-size: 1.4rem;
  }

  .leaderboard {
    margin-top: 1.5rem;
    border-top: 3px solid var(--c-dark);
    padding-top: 1.2rem;
  }

  .hint {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .seed-pill {
    font-size: 0.85rem;
    font-weight: 800;
    border: 2px dashed var(--c-dark);
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
  }

  @media (max-width: 960px) {
    .play-header { flex-direction: column; align-items: flex-start; }
    .play-shell { padding: 2rem 1.5rem 3rem; }
    .play-grid { grid-template-columns: 1fr; }
  }

  @media (max-width: 640px) {
    .play-header { padding: 1.2rem; }
    .logo { font-size: 1.8rem; }
    .panel { padding: 1.5rem; }
    .cta-btn { width: 100%; }
    .arena-map { gap: 4px; padding: 0.6rem; }
  }
`;

type BotPreset = {
  id: string;
  name: string;
  tagline: string;
  aggression: number;
  defense: number;
  risk: number;
};

type Vec = { x: number; y: number };

type Cell = 'empty' | 'obstacle';

type GameState = {
  grid: Cell[][];
  playerPos: Vec;
  enemyPos: Vec;
};

const EMAIL_KEY = 'cogcage_email';
const PLAY_VIEWED_KEY = 'cogcage_play_viewed';
const PLAY_FOUNDER_COPY_VARIANT_KEY = 'cogcage_play_founder_copy_variant';
const FOUNDER_INTENT_REPLAY_QUEUE_KEY = 'cogcage_founder_intent_replay_queue';

const GRID_SIZE = 8;
const MAX_AP = 3;
const ATTACK_RANGE = 2;

const pickPlayFounderCopyVariant = () => {
  if (typeof window === 'undefined') return 'momentum';
  const existing = window.localStorage.getItem(PLAY_FOUNDER_COPY_VARIANT_KEY);
  if (existing === 'momentum' || existing === 'utility') return existing;
  const assigned = Math.random() < 0.5 ? 'momentum' : 'utility';
  window.localStorage.setItem(PLAY_FOUNDER_COPY_VARIANT_KEY, assigned);
  return assigned;
};

const founderCheckoutUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? '').trim();

const submitWithRetry = async (url: string, payload: Record<string, unknown>, retries = 1, timeoutMs = 6000) => {
  let lastError: unknown = null;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);
      const body = await response.json().catch(() => ({}));
      if (response.ok && body.ok === true) return body;
      const err = new Error(body?.error || `Request failed (${response.status})`) as Error & { status?: number; requestId?: string };
      err.status = response.status;
      err.requestId = body?.requestId;
      if (response.status >= 500 && attempt < retries) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      throw err;
    } catch (error) {
      window.clearTimeout(timeout);
      lastError = error;
      if (attempt >= retries) throw error;
      const status = Number((error as { status?: number })?.status);
      if (Number.isFinite(status) && status < 500) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Request failed');
};

const shouldQueueForReplay = (error: unknown) => {
  if (!error || typeof error !== 'object') return true;
  const status = Number((error as { status?: number }).status);
  if (Number.isFinite(status)) {
    return status >= 500;
  }
  return true;
};

const readFounderIntentReplayQueue = () => {
  try {
    const raw = window.localStorage.getItem(FOUNDER_INTENT_REPLAY_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFounderIntentReplayQueue = (queue: Array<Record<string, unknown>>) => {
  try {
    if (!queue.length) {
      window.localStorage.removeItem(FOUNDER_INTENT_REPLAY_QUEUE_KEY);
      return;
    }
    window.localStorage.setItem(FOUNDER_INTENT_REPLAY_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  } catch {
    // best-effort cache only
  }
};

const enqueueFounderIntentReplay = (payload: Record<string, unknown>) => {
  const queue = readFounderIntentReplayQueue();
  const normalizedEmail = String(payload.email || '').trim().toLowerCase();
  const intentId = String(payload.intentId || '');
  const deduped = queue.filter((item) => String(item.intentId || '') !== intentId);
  deduped.push({ ...payload, email: normalizedEmail, queuedAt: new Date().toISOString() });
  writeFounderIntentReplayQueue(deduped);
};

const makeFounderIntentId = (email: string, source: string) => {
  const day = new Date().toISOString().slice(0, 10);
  return `intent:${day}:${hashString(`${email}|${source}|${day}`)}`;
};

const OPPONENTS: BotPreset[] = [
  {
    id: 'forge-titan',
    name: 'Forge Titan',
    tagline: 'Slow grind, heavy guard, brutal counters.',
    aggression: 45,
    defense: 85,
    risk: 20,
  },
  {
    id: 'neon-wraith',
    name: 'Neon Wraith',
    tagline: 'Unpredictable, loves risky overclocks.',
    aggression: 65,
    defense: 35,
    risk: 80,
  },
  {
    id: 'cinder-hawk',
    name: 'Cinder Hawk',
    tagline: 'Fast strikes, pressure every turn.',
    aggression: 85,
    defense: 25,
    risk: 45,
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const rngInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isSame = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

const neighbors = (pos: Vec, size: number) => [
  { x: pos.x, y: pos.y - 1 },
  { x: pos.x + 1, y: pos.y },
  { x: pos.x, y: pos.y + 1 },
  { x: pos.x - 1, y: pos.y },
].filter((next) => next.x >= 0 && next.y >= 0 && next.x < size && next.y < size);

const generateMap = (rng: () => number): GameState => {
  const grid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'empty')
  );

  const playerPos = { x: 0, y: GRID_SIZE - 1 };
  const enemyPos = { x: GRID_SIZE - 1, y: 0 };
  const maxObstacles = Math.floor(GRID_SIZE * GRID_SIZE * 0.18);
  let obstacles = 0;

  for (let y = 0; y < GRID_SIZE; y += 1) {
    for (let x = 0; x < GRID_SIZE; x += 1) {
      if (obstacles >= maxObstacles) continue;
      if ((x === playerPos.x && y === playerPos.y) || (x === enemyPos.x && y === enemyPos.y)) continue;
      if (Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y) <= 1) continue;
      if (Math.abs(x - enemyPos.x) + Math.abs(y - enemyPos.y) <= 1) continue;
      if (rng() < 0.12) {
        grid[y][x] = 'obstacle';
        obstacles += 1;
      }
    }
  }

  return { grid, playerPos, enemyPos };
};

const Play = () => {
  const [seedInput, setSeedInput] = useState('');
  const [activeSeed, setActiveSeed] = useState<number | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [playerPos, setPlayerPos] = useState<Vec>({ x: 0, y: 0 });
  const [enemyPos, setEnemyPos] = useState<Vec>({ x: 0, y: 0 });
  const [playerHp, setPlayerHp] = useState(100);
  const [enemyHp, setEnemyHp] = useState(100);
  const [playerAp, setPlayerAp] = useState(MAX_AP);
  const [turn, setTurn] = useState(1);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [playerBlock, setPlayerBlock] = useState(0);
  const [enemyBlock, setEnemyBlock] = useState(0);
  const [playerScan, setPlayerScan] = useState(0);
  const [enemyScan, setEnemyScan] = useState(0);
  const [opponentId, setOpponentId] = useState(OPPONENTS[0].id);
  const [email, setEmail] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [playFounderCopyVariant, setPlayFounderCopyVariant] = useState<'momentum' | 'utility'>('momentum');

  const rngRef = useRef<() => number>(() => Math.random);

  const postEvent = async (event: string, meta: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          source: 'play-page',
          email: email.trim() || undefined,
          meta,
        }),
      });
    } catch {
      // Best-effort analytics only.
    }
  };

  const opponent = useMemo(
    () => OPPONENTS.find((bot) => bot.id === opponentId) || OPPONENTS[0],
    [opponentId]
  );

  const founderCtaVariant = useMemo(() => {
    if (!winner) {
      if (playFounderCopyVariant === 'utility') {
        return {
          key: 'neutral',
          title: 'Get Founder Tools Before Launch',
          message: 'Founder access adds deeper analytics, faster iteration loops, and priority ladder placement at $29/mo before launch pricing moves to $49/mo.',
          button: 'Get Founder Tools',
        };
      }
      return {
        key: 'neutral',
        title: 'Unlock Founder Pricing',
        message: 'Keep your edge: lock $29/mo before launch pricing moves to $49/mo.',
        button: 'Reserve Founder Spot',
      };
    }

    if (winner === 'You') {
      if (playFounderCopyVariant === 'utility') {
        return {
          key: 'winner',
          title: 'Convert This Win Into Repeatable Edge',
          message: 'Founder mode unlocks analytics and priority ladder access so this result becomes your baseline before pricing moves to $49/mo.',
          button: 'Enable Founder Analytics',
        };
      }
      return {
        key: 'winner',
        title: 'You Won. Lock In Founder Advantage',
        message: 'Your build already performs. Keep momentum with founder access at $29/mo before it moves to $49/mo.',
        button: 'Claim Winner Founder Price',
      };
    }

    if (playFounderCopyVariant === 'utility') {
      return {
        key: 'loser',
        title: 'Debug Faster With Founder Mode',
        message: 'Get extra reps, richer match analytics, and priority ladder slots so you can close the gap before launch pricing moves to $49/mo.',
        button: 'Unlock Founder Rebuild Kit',
      };
    }

    return {
      key: 'loser',
      title: 'Run It Back With Founder Access',
      message: 'Get more reps, analytics, and priority ladder access at $29/mo before launch pricing moves to $49/mo.',
      button: 'Unlock Founder Rematch Pass',
    };
  }, [playFounderCopyVariant, winner]);

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(EMAIL_KEY) || '';
    if (saved) setEmail(saved);
    setPlayFounderCopyVariant(pickPlayFounderCopyVariant());

    const viewedSent = window.localStorage.getItem(PLAY_VIEWED_KEY);
    if (!viewedSent) {
      void postEvent('play_page_viewed', { founderCopyVariant: pickPlayFounderCopyVariant() });
      window.localStorage.setItem(PLAY_VIEWED_KEY, '1');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const flushFounderIntentQueue = async () => {
      if (!navigator.onLine) return;
      const queue = readFounderIntentReplayQueue();
      if (!queue.length) return;
      const remaining: Array<Record<string, unknown>> = [];

      for (const item of queue) {
        try {
          await submitWithRetry('/api/founder-intent', item, 0, 7000);
          await postEvent('founder_intent_replay_sent', {
            source: item.source,
            intentId: item.intentId,
            queuedAt: item.queuedAt,
            founderCopyVariant: item.founderCopyVariant,
          });
        } catch (error) {
          if (shouldQueueForReplay(error)) {
            remaining.push(item);
          }
          await postEvent('founder_intent_replay_failed', {
            source: item.source,
            intentId: item.intentId,
            queuedAt: item.queuedAt,
            founderCopyVariant: item.founderCopyVariant,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      writeFounderIntentReplayQueue(remaining);
    };

    void flushFounderIntentQueue();
    const onOnline = () => { void flushFounderIntentQueue(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (!winner) return;
    void postEvent('play_match_completed', {
      winner,
      turn,
      seed: activeSeed,
      opponent: opponent.name,
      playerHp,
      enemyHp,
      ctaVariant: founderCtaVariant.key,
      founderCopyVariant: playFounderCopyVariant,
    });
  }, [activeSeed, enemyHp, founderCtaVariant.key, opponent.name, playFounderCopyVariant, playerHp, turn, winner]);

  const resetMatch = () => {
    setRunning(false);
    setWinner(null);
    setFeed([]);
    setPlayerHp(100);
    setEnemyHp(100);
    setPlayerAp(MAX_AP);
    setTurn(1);
    setPlayerBlock(0);
    setEnemyBlock(0);
    setPlayerScan(0);
    setEnemyScan(0);
  };

  const startMatch = () => {
    if (running) return;
    resetMatch();
    const seedLabel = seedInput.trim() || `${Date.now()}`;
    const seed = hashString(`${seedLabel}|${opponentId}`) || 1;
    const rng = mulberry32(seed);
    rngRef.current = rng;

    const map = generateMap(rng);
    setGrid(map.grid);
    setPlayerPos(map.playerPos);
    setEnemyPos(map.enemyPos);
    setActiveSeed(seed);
    setFeed([
      `Match initialized. Seed ${seed}.`,
      `Arena size ${GRID_SIZE}x${GRID_SIZE}. Opponent: ${opponent.name}.`,
    ]);
    setRunning(true);
    void postEvent('play_match_started', { seed, opponent: opponent.id, gridSize: GRID_SIZE });
  };

  const endMatchIfNeeded = (nextPlayerHp: number, nextEnemyHp: number) => {
    if (nextPlayerHp <= 0 && nextEnemyHp <= 0) {
      setWinner('Draw');
      setRunning(false);
      return true;
    }
    if (nextEnemyHp <= 0) {
      setWinner('You');
      setRunning(false);
      return true;
    }
    if (nextPlayerHp <= 0) {
      setWinner(opponent.name);
      setRunning(false);
      return true;
    }
    return false;
  };

  const canMoveTo = (pos: Vec) => {
    if (pos.x < 0 || pos.y < 0 || pos.x >= GRID_SIZE || pos.y >= GRID_SIZE) return false;
    if (grid[pos.y]?.[pos.x] === 'obstacle') return false;
    if (isSame(pos, enemyPos)) return false;
    return true;
  };

  const logFeed = (lines: string[]) => {
    setFeed((prev) => [...lines, ...prev].slice(0, 50));
  };

  const attemptMove = (dx: number, dy: number) => {
    if (!running || winner) return;
    if (playerAp <= 0) {
      logFeed(['No action points left. End turn.']);
      return;
    }
    const next = { x: playerPos.x + dx, y: playerPos.y + dy };
    if (!canMoveTo(next)) {
      logFeed(['Move blocked by terrain or boundary.']);
      return;
    }
    setPlayerPos(next);
    setPlayerAp((prev) => prev - 1);
    logFeed([`You move to (${next.x + 1}, ${GRID_SIZE - next.y}).`]);
  };

  const handleAttack = () => {
    if (!running || winner) return;
    if (playerAp < 2) {
      logFeed(['Attack needs 2 AP.']);
      return;
    }
    const rng = rngRef.current;
    const range = ATTACK_RANGE + (playerScan > 0 ? 1 : 0);
    const dist = manhattan(playerPos, enemyPos);
    if (dist > range) {
      logFeed([`Target out of range (${dist}).`]);
      return;
    }
    const baseDamage = 8 + rngInt(rng, 0, 4) + (playerScan > 0 ? 2 : 0);
    const mitigated = Math.max(0, baseDamage - enemyBlock);
    const nextEnemyHp = clamp(enemyHp - mitigated, 0, 100);
    setEnemyHp(nextEnemyHp);
    setEnemyBlock(0);
    setPlayerAp((prev) => prev - 2);
    setPlayerScan(0);
    logFeed([
      `You strike for ${mitigated}. Enemy HP ${nextEnemyHp}.`,
    ]);
    endMatchIfNeeded(playerHp, nextEnemyHp);
  };

  const handleBlock = () => {
    if (!running || winner) return;
    if (playerAp < 1) {
      logFeed(['Block needs 1 AP.']);
      return;
    }
    const rng = rngRef.current;
    const blockValue = 5 + rngInt(rng, 0, 2);
    setPlayerBlock(blockValue);
    setPlayerAp((prev) => prev - 1);
    logFeed([`You brace. Block ${blockValue} on next hit.`]);
  };

  const handleScan = () => {
    if (!running || winner) return;
    if (playerAp < 1) {
      logFeed(['Scan needs 1 AP.']);
      return;
    }
    setPlayerScan(2);
    setPlayerAp((prev) => prev - 1);
    logFeed(['You scan the grid. Next strike gains +1 range.']);
  };

  const enemyTurn = () => {
    if (!running || winner) return;
    const rng = rngRef.current;
    let ap = MAX_AP;
    let nextEnemyPos = { ...enemyPos };
    let nextEnemyBlock = enemyBlock;
    let nextEnemyScan = Math.max(0, enemyScan - 1);
    let nextPlayerHp = playerHp;
    let nextPlayerBlock = playerBlock;
    const entries: string[] = [];

    const enemyRange = () => ATTACK_RANGE + (nextEnemyScan > 0 ? 1 : 0);

    const moveEnemy = () => {
      const options = neighbors(nextEnemyPos, GRID_SIZE)
        .filter((candidate) => grid[candidate.y]?.[candidate.x] !== 'obstacle')
        .filter((candidate) => !isSame(candidate, playerPos));
      if (options.length === 0) return false;
      const currentDistance = manhattan(nextEnemyPos, playerPos);
      const bestDistance = Math.min(...options.map((option) => manhattan(option, playerPos)));
      const bestMoves = options.filter((option) => manhattan(option, playerPos) === bestDistance);
      const chosen = bestMoves[rngInt(rng, 0, bestMoves.length - 1)] || options[0];
      if (manhattan(chosen, playerPos) >= currentDistance && rng() < 0.4) {
        return false;
      }
      nextEnemyPos = chosen;
      entries.push(`${opponent.name} moves to (${chosen.x + 1}, ${GRID_SIZE - chosen.y}).`);
      return true;
    };

    while (ap > 0 && nextPlayerHp > 0 && enemyHp > 0) {
      const distance = manhattan(nextEnemyPos, playerPos);
      const attackThreshold = 0.35 + opponent.aggression / 150;
      const blockThreshold = 0.2 + opponent.defense / 200;
      const scanThreshold = 0.15 + opponent.risk / 200;

      if (distance <= enemyRange() && ap >= 2 && rng() < attackThreshold) {
        const baseDamage = 7 + rngInt(rng, 0, 4) + (nextEnemyScan > 0 ? 2 : 0);
        const mitigated = Math.max(0, baseDamage - nextPlayerBlock);
        nextPlayerHp = clamp(nextPlayerHp - mitigated, 0, 100);
        nextPlayerBlock = 0;
        nextEnemyScan = 0;
        entries.push(`${opponent.name} strikes for ${mitigated}. Your HP ${nextPlayerHp}.`);
        ap -= 2;
        break;
      }

      if (ap >= 1 && rng() < blockThreshold) {
        nextEnemyBlock = 5 + rngInt(rng, 0, 2);
        entries.push(`${opponent.name} raises guard (${nextEnemyBlock}).`);
        ap -= 1;
        continue;
      }

      if (ap >= 1 && rng() < scanThreshold) {
        nextEnemyScan = 2;
        entries.push(`${opponent.name} scans the arena.`);
        ap -= 1;
        continue;
      }

      if (ap >= 1) {
        const moved = moveEnemy();
        if (moved) {
          ap -= 1;
          continue;
        }
      }

      ap = 0;
    }

    setEnemyPos(nextEnemyPos);
    setEnemyBlock(nextEnemyBlock);
    setEnemyScan(nextEnemyScan);
    setPlayerBlock(nextPlayerBlock);
    setPlayerScan((prev) => Math.max(0, prev - 1));
    setPlayerHp(nextPlayerHp);
    setPlayerAp(MAX_AP);
    setTurn((prev) => prev + 1);
    if (entries.length === 0) entries.push(`${opponent.name} holds position.`);
    logFeed(entries);
    endMatchIfNeeded(nextPlayerHp, enemyHp);
  };

  const endTurn = () => {
    if (!running || winner) return;
    enemyTurn();
  };

  useEffect(() => {
    if (!running || winner) return;
    if (playerAp > 0) return;
    const timer = window.setTimeout(() => {
      enemyTurn();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [playerAp, running, winner]);

  useEffect(() => {
    if (!running || winner) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault();
        attemptMove(0, -1);
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        attemptMove(1, 0);
      } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        attemptMove(-1, 0);
      } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault();
        attemptMove(0, 1);
      } else if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        handleAttack();
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handleBlock();
      } else if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        handleScan();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        endTurn();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [running, winner, playerPos, playerAp, enemyPos, playerScan, enemyScan, enemyHp, playerHp]);

  const handleFounderCheckout = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const checkoutSource = `play-page-founder-cta-${founderCtaVariant.key}-${playFounderCopyVariant}`;
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setCheckoutMessage('Enter a valid email to reserve founder pricing.');
      return;
    }
    if (!founderCheckoutUrl) {
      setCheckoutMessage('Checkout is temporarily unavailable. Please join the waitlist from home.');
      void postEvent('founder_checkout_unavailable', { source: checkoutSource, founderCopyVariant: playFounderCopyVariant });
      return;
    }

    if (typeof window !== 'undefined') window.localStorage.setItem(EMAIL_KEY, normalizedEmail);
    setCheckoutBusy(true);
    setCheckoutMessage(null);

    try {
      const intentId = makeFounderIntentId(normalizedEmail, checkoutSource);
      const founderIntentPayload = {
        email: normalizedEmail,
        source: checkoutSource,
        intentId,
        founderCopyVariant: playFounderCopyVariant,
      };

      await postEvent('founder_checkout_clicked', {
        source: checkoutSource,
        ctaVariant: founderCtaVariant.key,
        founderCopyVariant: playFounderCopyVariant,
        intentId,
      });

      try {
        await submitWithRetry('/api/founder-intent', founderIntentPayload, 1, 6000);
      } catch (error) {
        if (shouldQueueForReplay(error)) {
          enqueueFounderIntentReplay(founderIntentPayload);
          await postEvent('founder_intent_buffered', {
            source: checkoutSource,
            intentId,
            founderCopyVariant: playFounderCopyVariant,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cogcage_last_founder_checkout_source', checkoutSource);
        window.localStorage.setItem('cogcage_last_founder_intent_source', checkoutSource.replace('founder-cta', 'founder-checkout'));
      }
      const url = new URL(founderCheckoutUrl);
      url.searchParams.set('prefilled_email', normalizedEmail);
      window.location.href = url.toString();
    } catch {
      setCheckoutBusy(false);
      setCheckoutMessage('Could not start checkout. Try again in a moment.');
    }
  };

  const range = ATTACK_RANGE + (playerScan > 0 ? 1 : 0);

  return (
    <div className="play-root">
      <div className="bg-scanlines" />
      <header className="play-header">
        <a className="logo" href="/">COG CAGE</a>
        <div className="header-links">
          <a className="header-link" href="/">Home</a>
          <a className="header-link active" href="/play">Play</a>
        </div>
      </header>

      <main className="play-shell">
        <div className="play-grid">
          <section className="panel">
            <h2>Command Console</h2>

            <div className="section-label">Seeded Match</div>
            <input
              className="prompt-box"
              style={{ minHeight: 'unset', height: '48px', marginBottom: '0.6rem' }}
              placeholder="Seed (optional, deterministic)"
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
            />
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
              <button className="cta-btn" onClick={startMatch} disabled={running}>
                {running ? 'Match Live' : 'Start Match'}
              </button>
              <button className="action-btn secondary" onClick={resetMatch} disabled={!running && feed.length === 0}>
                Reset
              </button>
            </div>
            <div style={{ marginTop: '0.8rem', display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <span className="status-pill">Turn {turn}</span>
              <span className="status-pill">AP {playerAp}/{MAX_AP}</span>
              <span className="seed-pill">Seed {activeSeed ?? '—'}</span>
            </div>

            <div className="section-label" style={{ marginTop: '1.4rem' }}>Opponent Presets</div>
            <div style={{ display: 'grid', gap: '0.6rem' }}>
              {OPPONENTS.map((bot) => (
                <label key={bot.id} style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
                  <input
                    type="radio"
                    name="opponent"
                    checked={bot.id === opponentId}
                    onChange={() => setOpponentId(bot.id)}
                  />
                  <div>
                    <div style={{ fontWeight: 900 }}>{bot.name}</div>
                    <div className="hint">{bot.tagline}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="section-label" style={{ marginTop: '1.4rem' }}>Actions</div>
            <div className="action-grid">
              <button className="action-btn secondary" onClick={() => attemptMove(0, -1)} disabled={!running || !!winner}>Up</button>
              <button className="action-btn secondary" onClick={() => attemptMove(1, 0)} disabled={!running || !!winner}>Right</button>
              <button className="action-btn secondary" onClick={() => attemptMove(-1, 0)} disabled={!running || !!winner}>Left</button>
              <button className="action-btn secondary" onClick={() => attemptMove(0, 1)} disabled={!running || !!winner}>Down</button>
              <button className="action-btn" onClick={handleAttack} disabled={!running || !!winner}>Attack</button>
              <button className="action-btn" onClick={handleBlock} disabled={!running || !!winner}>Block</button>
              <button className="action-btn" onClick={handleScan} disabled={!running || !!winner}>Scan</button>
              <button className="action-btn secondary" onClick={endTurn} disabled={!running || !!winner}>End Turn</button>
            </div>
            <div className="hint" style={{ marginBottom: '0.8rem' }}>
              Attack range {range} · Block absorbs next hit · Scan adds +1 range to your next strike · Move with WASD/Arrows, J attack, K block, L scan, Enter end turn.
            </div>

            <div className="leaderboard" style={{ marginTop: '1.2rem' }}>
              <div className="section-label">{founderCtaVariant.title}</div>
              <div className="hint" style={{ marginBottom: '0.7rem' }}>
                {founderCtaVariant.message}
              </div>
              <input
                className="prompt-box"
                type="email"
                placeholder="you@team.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                style={{ minHeight: 'unset', height: '48px', marginBottom: '0.8rem' }}
              />
              <button className="cta-btn" onClick={handleFounderCheckout} disabled={checkoutBusy}>
                {checkoutBusy ? 'Opening Checkout…' : founderCtaVariant.button}
              </button>
              {checkoutMessage && (
                <div className="hint" style={{ marginTop: '0.7rem' }}>{checkoutMessage}</div>
              )}
            </div>
          </section>

          <section className="panel">
            <div className="arena-header">
              <div>
                <h2>Arena Ops</h2>
                <div className="hint">Opponent: <strong>{opponent.name}</strong></div>
              </div>
              <span className="arena-badge">Round {turn}</span>
            </div>

            <div className="stat-block">
              <div className="stat-title">
                <span>You</span>
                <span className="status-pill">HP {playerHp}</span>
              </div>
              <div className="bar-shell">
                <div className="bar-fill" style={{ width: `${playerHp}%` }} />
              </div>
            </div>

            <div className="stat-block">
              <div className="stat-title">
                <span>{opponent.name}</span>
                <span className="status-pill">HP {enemyHp}</span>
              </div>
              <div className="bar-shell">
                <div className="bar-fill opponent" style={{ width: `${enemyHp}%` }} />
              </div>
            </div>

            <div className="arena-map" style={{ ['--grid-size' as string]: GRID_SIZE }}>
              {grid.map((row, y) =>
                row.map((cell, x) => {
                  const pos = { x, y };
                  const inRange = manhattan(playerPos, pos) <= range;
                  const isPlayer = isSame(pos, playerPos);
                  const isEnemy = isSame(pos, enemyPos);
                  const className = [
                    'arena-cell',
                    cell === 'obstacle' ? 'obstacle' : '',
                    inRange ? 'in-range' : '',
                    isPlayer ? 'player' : '',
                    isEnemy ? 'enemy' : '',
                  ].filter(Boolean).join(' ');
                  let label = '';
                  if (isPlayer) label = 'YOU';
                  if (isEnemy) label = 'BOT';
                  return (
                    <div key={`${x}-${y}`} className={className}>
                      {label}
                    </div>
                  );
                })
              )}
            </div>

            <div className="arena-legend">
              <span className="status-pill">YOU</span>
              <span className="status-pill" style={{ background: 'var(--c-red)', color: '#fff' }}>BOT</span>
              <span className="status-pill" style={{ background: '#2f2f2f', color: '#fff' }}>OBSTACLE</span>
              <span className="status-pill" style={{ background: 'var(--c-yellow)' }}>IN RANGE</span>
            </div>

            {winner && (
              <div className="winner-banner" style={{ marginTop: '1.2rem' }}>
                Winner: {winner}
                <div className="hint">Final HP {playerHp} vs {enemyHp}</div>
              </div>
            )}

            <div style={{ marginTop: '1rem' }} className="feed">
              {feed.length === 0 && (
                <div className="feed-item">No turns yet. Start a match to generate the arena log.</div>
              )}
              {feed.map((entry, index) => (
                <div key={`${entry}-${index}`} className="feed-item">
                  {entry}
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Play;
