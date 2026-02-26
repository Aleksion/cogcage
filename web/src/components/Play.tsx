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

  .slider-row {
    display: grid;
    grid-template-columns: 120px 1fr 64px;
    align-items: center;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .slider-label {
    font-weight: 800;
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 1px;
  }

  .slider-row input[type=range] {
    width: 100%;
  }

  .slider-value {
    font-weight: 800;
    text-align: right;
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

  .prompt-meta {
    display: flex;
    justify-content: space-between;
    font-size: 0.85rem;
    opacity: 0.7;
    margin-top: 0.4rem;
  }

  .opponent-grid {
    display: grid;
    gap: 0.75rem;
  }

  .opponent-card {
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    padding: 0.8rem 1rem;
    display: flex;
    gap: 1rem;
    align-items: center;
    cursor: pointer;
    transition: transform 0.15s ease, box-shadow 0.15s ease;
  }

  .opponent-card.active {
    background: var(--c-yellow);
    transform: translateY(-2px);
    box-shadow: var(--shadow-hard);
  }

  .opponent-card input { margin-top: 0.2rem; }

  .opponent-info h3 {
    font-family: var(--f-display);
    font-size: 1.4rem;
    text-transform: uppercase;
  }

  .opponent-info p {
    font-size: 0.95rem;
    opacity: 0.8;
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

  .score-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 900;
    padding: 0.3rem 0.8rem;
    border-radius: 999px;
    border: 2px solid var(--c-dark);
    background: var(--c-white);
  }

  .feed {
    background: #0f0f0f;
    color: #f5f5f5;
    border-radius: 12px;
    border: 3px solid var(--c-dark);
    padding: 1rem;
    max-height: 360px;
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

  .leaderboard-row {
    display: grid;
    grid-template-columns: 36px 1fr auto;
    gap: 0.75rem;
    align-items: center;
    padding: 0.6rem 0;
    border-bottom: 1px solid rgba(0,0,0,0.1);
  }

  .leaderboard-row:last-child { border-bottom: none; }

  .leaderboard-rank {
    width: 32px;
    height: 32px;
    border-radius: 8px;
    background: var(--c-dark);
    color: var(--c-white);
    display: grid;
    place-items: center;
    font-weight: 900;
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
    .leaderboard-row { grid-template-columns: 28px 1fr auto; }
  }
`;

type Strategy = {
  aggression: number;
  defense: number;
  risk: number;
  prompt: string;
};

type BotPreset = {
  id: string;
  name: string;
  tagline: string;
  aggression: number;
  defense: number;
  risk: number;
};

type ActionType = 'Strike' | 'Guard' | 'Gamble';

type ResolvedAction = {
  action: ActionType;
  attack: number;
  block: number;
  selfDamage: number;
  note?: 'Crit' | 'Backfire';
};

type TurnLog = {
  turn: number;
  playerAction: string;
  opponentAction: string;
  damageToOpponent: number;
  damageToPlayer: number;
  playerSelfDamage: number;
  opponentSelfDamage: number;
  playerHealth: number;
  opponentHealth: number;
  playerScore: number;
  opponentScore: number;
  summary: string;
};

type MatchResult = {
  id: string;
  seed: number;
  date: string;
  winner: string;
  playerScore: number;
  opponentScore: number;
  playerHealth: number;
  opponentHealth: number;
  opponentName: string;
  prompt: string;
};

type MatchSimulation = {
  turns: TurnLog[];
  result: MatchResult;
};

type LeaderboardEntry = MatchResult & { rankScore: number };

const LEADERBOARD_KEY = 'cogcage_demo_leaderboard_v1';
const EMAIL_KEY = 'cogcage_email';
const founderCheckoutUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? '').trim();

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
    aggression: 60,
    defense: 35,
    risk: 80,
  },
  {
    id: 'cinder-hawk',
    name: 'Cinder Hawk',
    tagline: 'Fast strikes, pressure every turn.',
    aggression: 80,
    defense: 30,
    risk: 40,
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

const chooseAction = (strategy: Strategy, rng: () => number): ActionType => {
  const attackWeight = 1 + strategy.aggression / 30;
  const defendWeight = 1 + strategy.defense / 30;
  const riskWeight = 1 + strategy.risk / 30;
  const total = attackWeight + defendWeight + riskWeight;
  const roll = rng() * total;
  if (roll < attackWeight) return 'Strike';
  if (roll < attackWeight + defendWeight) return 'Guard';
  return 'Gamble';
};

const resolveAction = (action: ActionType, strategy: Strategy, rng: () => number): ResolvedAction => {
  const aggression = strategy.aggression / 100;
  const defense = strategy.defense / 100;
  const risk = strategy.risk / 100;

  if (action === 'Strike') {
    const attack = 8 + rngInt(rng, 0, 6) + Math.round(aggression * 6);
    return { action, attack, block: 0, selfDamage: 0 };
  }

  if (action === 'Guard') {
    const block = 6 + rngInt(rng, 0, 6) + Math.round(defense * 5);
    return { action, attack: 0, block, selfDamage: 0 };
  }

  const successChance = 0.35 + risk * 0.45;
  if (rng() < successChance) {
    const attack = 14 + rngInt(rng, 0, 8) + Math.round(risk * 8);
    return { action, attack, block: 0, selfDamage: 0, note: 'Crit' };
  }
  const attack = 2 + rngInt(rng, 0, 4);
  const selfDamage = 6 + rngInt(rng, 0, 8) + Math.round((1 - risk) * 3);
  return { action, attack, block: 0, selfDamage, note: 'Backfire' };
};

const formatAction = (resolved: ResolvedAction) => {
  if (resolved.action === 'Strike') return `Strike ${resolved.attack}`;
  if (resolved.action === 'Guard') return `Guard ${resolved.block}`;
  const note = resolved.note ? ` (${resolved.note})` : '';
  return `Gamble ${resolved.attack}${note}`;
};

const simulateMatch = (
  player: Strategy,
  opponent: Strategy,
  opponentName: string,
  seed: number,
  turns = 20
): MatchSimulation => {
  const rng = mulberry32(seed);
  let playerHealth = 100;
  let opponentHealth = 100;
  let playerScore = 0;
  let opponentScore = 0;
  const logs: TurnLog[] = [];

  for (let turn = 1; turn <= turns; turn += 1) {
    const playerAction = chooseAction(player, rng);
    const opponentAction = chooseAction(opponent, rng);
    const playerResolved = resolveAction(playerAction, player, rng);
    const opponentResolved = resolveAction(opponentAction, opponent, rng);

    const damageToOpponent = Math.max(0, playerResolved.attack - opponentResolved.block);
    const damageToPlayer = Math.max(0, opponentResolved.attack - playerResolved.block);

    const totalOpponentDamage = damageToOpponent + opponentResolved.selfDamage;
    const totalPlayerDamage = damageToPlayer + playerResolved.selfDamage;

    opponentHealth = clamp(opponentHealth - totalOpponentDamage, 0, 100);
    playerHealth = clamp(playerHealth - totalPlayerDamage, 0, 100);

    playerScore += damageToOpponent + (playerResolved.note === 'Crit' ? 4 : 0);
    opponentScore += damageToPlayer + (opponentResolved.note === 'Crit' ? 4 : 0);

    const summary = `Turn ${turn}: You ${formatAction(playerResolved)} vs ${opponentName} ${formatAction(opponentResolved)}. `
      + `You deal ${damageToOpponent}${opponentResolved.selfDamage ? ` +${opponentResolved.selfDamage} self` : ''}, `
      + `take ${damageToPlayer}${playerResolved.selfDamage ? ` +${playerResolved.selfDamage} self` : ''}.`;

    logs.push({
      turn,
      playerAction: formatAction(playerResolved),
      opponentAction: formatAction(opponentResolved),
      damageToOpponent,
      damageToPlayer,
      playerSelfDamage: playerResolved.selfDamage,
      opponentSelfDamage: opponentResolved.selfDamage,
      playerHealth,
      opponentHealth,
      playerScore,
      opponentScore,
      summary,
    });
  }

  let winner = 'Draw';
  if (playerHealth !== opponentHealth) {
    winner = playerHealth > opponentHealth ? 'You' : opponentName;
  } else if (playerScore !== opponentScore) {
    winner = playerScore > opponentScore ? 'You' : opponentName;
  }

  return {
    turns: logs,
    result: {
      id: `${seed}-${Date.now()}`,
      seed,
      date: new Date().toISOString(),
      winner,
      playerScore,
      opponentScore,
      playerHealth,
      opponentHealth,
      opponentName,
      prompt: player.prompt.trim() || 'No prompt',
    },
  };
};

const loadLeaderboard = (): LeaderboardEntry[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(LEADERBOARD_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as LeaderboardEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const saveLeaderboard = (entry: LeaderboardEntry) => {
  if (typeof window === 'undefined') return [] as LeaderboardEntry[];
  const current = loadLeaderboard();
  const updated = [entry, ...current]
    .sort((a, b) => b.rankScore - a.rankScore)
    .slice(0, 6);
  window.localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(updated));
  return updated;
};

const Play = () => {
  const [aggression, setAggression] = useState(60);
  const [defense, setDefense] = useState(40);
  const [risk, setRisk] = useState(35);
  const [prompt, setPrompt] = useState('');
  const [opponentId, setOpponentId] = useState(OPPONENTS[0].id);
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<TurnLog[]>([]);
  const [currentTurn, setCurrentTurn] = useState(0);
  const [playerHealth, setPlayerHealth] = useState(100);
  const [opponentHealth, setOpponentHealth] = useState(100);
  const [playerScore, setPlayerScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [result, setResult] = useState<MatchResult | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchCount, setMatchCount] = useState(0);
  const [activeSeed, setActiveSeed] = useState<number | null>(null);
  const [email, setEmail] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

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

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    setLeaderboard(loadLeaderboard());
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(EMAIL_KEY) || '';
    if (saved) setEmail(saved);
  }, []);

  const stopTimer = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => () => stopTimer(), []);

  const startMatch = () => {
    if (running) return;
    stopTimer();

    const seedBase = hashString(
      `${prompt}|${aggression}|${defense}|${risk}|${opponentId}|${matchCount}`
    );
    const seed = seedBase || 1;
    setActiveSeed(seed);
    void postEvent('play_match_started', { seed, opponent: opponent.id });

    const simulation = simulateMatch(
      { aggression, defense, risk, prompt },
      {
        aggression: opponent.aggression,
        defense: opponent.defense,
        risk: opponent.risk,
        prompt: opponent.tagline,
      },
      opponent.name,
      seed
    );

    setFeed([]);
    setCurrentTurn(0);
    setPlayerHealth(100);
    setOpponentHealth(100);
    setPlayerScore(0);
    setOpponentScore(0);
    setResult(null);
    setRunning(true);
    setMatchCount((count) => count + 1);

    let index = 0;
    timerRef.current = window.setInterval(() => {
      const nextTurn = simulation.turns[index];
      if (!nextTurn) {
        stopTimer();
        setRunning(false);
        return;
      }

      index += 1;
      setFeed((prev) => [...prev, nextTurn]);
      setCurrentTurn(nextTurn.turn);
      setPlayerHealth(nextTurn.playerHealth);
      setOpponentHealth(nextTurn.opponentHealth);
      setPlayerScore(nextTurn.playerScore);
      setOpponentScore(nextTurn.opponentScore);

      if (index >= simulation.turns.length) {
        stopTimer();
        setRunning(false);
        const entry: LeaderboardEntry = {
          ...simulation.result,
          rankScore: simulation.result.playerScore + (simulation.result.winner === 'You' ? 50 : 0),
        };
        const updated = saveLeaderboard(entry);
        setLeaderboard(updated);
        setResult(simulation.result);
      }
    }, 450);
  };

  const handleFounderCheckout = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setCheckoutMessage('Enter a valid email to reserve founder pricing.');
      return;
    }
    if (!founderCheckoutUrl) {
      setCheckoutMessage('Checkout is temporarily unavailable. Please join the waitlist from home.');
      void postEvent('founder_checkout_unavailable', { source: 'play-page' });
      return;
    }

    if (typeof window !== 'undefined') window.localStorage.setItem(EMAIL_KEY, normalizedEmail);
    setCheckoutBusy(true);
    setCheckoutMessage(null);

    try {
      await Promise.allSettled([
        fetch('/api/founder-intent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: normalizedEmail, source: 'play-page-founder-cta' }),
        }),
        postEvent('founder_checkout_clicked', { source: 'play-page-founder-cta' }),
      ]);

      const url = new URL(founderCheckoutUrl);
      url.searchParams.set('prefilled_email', normalizedEmail);
      window.location.href = url.toString();
    } catch {
      setCheckoutBusy(false);
      setCheckoutMessage('Could not start checkout. Try again in a moment.');
    }
  };


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
            <h2>Build Your Bot</h2>

            <div className="section-label">Strategy Sliders</div>
            <div className="slider-row">
              <label className="slider-label" htmlFor="aggression">Aggression</label>
              <input
                id="aggression"
                type="range"
                min={0}
                max={100}
                value={aggression}
                onChange={(event) => setAggression(Number(event.target.value))}
              />
              <span className="slider-value">{aggression}</span>
            </div>
            <div className="slider-row">
              <label className="slider-label" htmlFor="defense">Defense</label>
              <input
                id="defense"
                type="range"
                min={0}
                max={100}
                value={defense}
                onChange={(event) => setDefense(Number(event.target.value))}
              />
              <span className="slider-value">{defense}</span>
            </div>
            <div className="slider-row">
              <label className="slider-label" htmlFor="risk">Risk</label>
              <input
                id="risk"
                type="range"
                min={0}
                max={100}
                value={risk}
                onChange={(event) => setRisk(Number(event.target.value))}
              />
              <span className="slider-value">{risk}</span>
            </div>
            <div className="hint" style={{ marginBottom: '1.1rem' }}>
              Aggression fuels strikes, Defense powers guards, Risk controls gamble swings.
            </div>

            <div className="section-label">Pilot Prompt</div>
            <textarea
              className="prompt-box"
              placeholder="Short prompt for your bot (e.g., 'control the center, punish early')."
              maxLength={120}
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
            />
            <div className="prompt-meta">
              <span>Keep it punchy.</span>
              <span>{prompt.length}/120</span>
            </div>

            <div className="section-label" style={{ marginTop: '1.4rem' }}>Opponent Presets</div>
            <div className="opponent-grid">
              {OPPONENTS.map((bot) => (
                <label
                  key={bot.id}
                  className={`opponent-card ${bot.id === opponentId ? 'active' : ''}`}
                >
                  <input
                    type="radio"
                    name="opponent"
                    checked={bot.id === opponentId}
                    onChange={() => setOpponentId(bot.id)}
                  />
                  <div className="opponent-info">
                    <h3>{bot.name}</h3>
                    <p>{bot.tagline}</p>
                  </div>
                </label>
              ))}
            </div>

            <div style={{ marginTop: '1.6rem' }}>
              <button className="cta-btn" onClick={startMatch} disabled={running}>
                {running ? 'Match Running…' : 'Start Match'}
              </button>
            </div>
            <div className="hint" style={{ marginTop: '0.8rem' }}>
              20-turn deterministic sim with seeded RNG. Every match is replayable by seed.
            </div>
          </section>

          <section className="panel">
            <div className="arena-header">
              <div>
                <h2>Arena Feed</h2>
                <div className="hint">Current opponent: <strong>{opponent.name}</strong></div>
              </div>
              <span className="arena-badge">Turn {currentTurn}/20</span>
            </div>

            <div className="stat-block">
              <div className="stat-title">
                <span>You</span>
                <span className="score-pill">Score {playerScore}</span>
              </div>
              <div className="bar-shell">
                <div className="bar-fill" style={{ width: `${playerHealth}%` }} />
              </div>
            </div>

            <div className="stat-block">
              <div className="stat-title">
                <span>{opponent.name}</span>
                <span className="score-pill">Score {opponentScore}</span>
              </div>
              <div className="bar-shell">
                <div className="bar-fill opponent" style={{ width: `${opponentHealth}%` }} />
              </div>
            </div>

            <div className="seed-pill">
              Seed: {activeSeed ?? '—'}
            </div>

            <div style={{ marginTop: '1rem' }} className="feed">
              {feed.length === 0 && (
                <div className="feed-item">No turns yet. Configure your bot and start the match.</div>
              )}
              {feed.map((entry) => (
                <div key={entry.turn} className="feed-item">
                  {entry.summary}
                </div>
              ))}
            </div>

            {result && (
              <div className="winner-banner">
                Winner: {result.winner}
                <div className="hint">Final HP {result.playerHealth} vs {result.opponentHealth} · Score {result.playerScore}-{result.opponentScore}</div>
              </div>
            )}

            <div className="leaderboard">
              <div className="section-label">Mini Leaderboard</div>
              {leaderboard.length === 0 && (
                <div className="hint">Play a match to populate your local leaderboard.</div>
              )}
              {leaderboard.map((entry, index) => (
                <div key={entry.id} className="leaderboard-row">
                  <div className="leaderboard-rank">{index + 1}</div>
                  <div>
                    <div style={{ fontWeight: 800 }}>{entry.winner === 'You' ? 'Victory' : 'Battle'}</div>
                    <div className="hint">vs {entry.opponentName} · Seed {entry.seed}</div>
                  </div>
                  <div style={{ fontWeight: 900 }}>{entry.playerScore}</div>
                </div>
              ))}
            </div>

            <div className="leaderboard" style={{ marginTop: '1.2rem' }}>
              <div className="section-label">Unlock Founder Pricing</div>
              <div className="hint" style={{ marginBottom: '0.7rem' }}>
                Keep your edge: lock <strong>$29/mo</strong> before launch pricing moves to <strong>$49/mo</strong>.
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
                {checkoutBusy ? 'Opening Checkout…' : 'Reserve Founder Spot'}
              </button>
              {checkoutMessage && (
                <div className="hint" style={{ marginTop: '0.7rem' }}>{checkoutMessage}</div>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Play;
