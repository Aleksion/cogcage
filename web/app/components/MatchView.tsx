import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  UNIT_SCALE,
  ENERGY_MAX,
  HP_MAX,
  TICK_RATE,
} from '../lib/ws2/index.js';
import { runMatchAsync } from '../lib/ws2/run-match';
import type { BotConfig, MatchSnapshot } from '../lib/ws2/match-types';

/* ── Types ──────────────────────────────────────────────────── */

export interface MatchBotConfig {
  botName: string;
  brainPrompt: string;
  skills?: string[];
  cards: string[];
  actionTypes: string[];
  armor: 'light' | 'medium' | 'heavy';
  moveCost: number;
}

interface MatchViewProps {
  botA: MatchBotConfig;
  botB: MatchBotConfig;
  seed?: number;
  onBack?: () => void;
  backLabel?: string;
  onTweakBot?: () => void;
}

/* ── Styles ─────────────────────────────────────────────────── */

const matchStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --c-white: #FFFFFF;
    --c-green: #2ecc71;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --radius: 14px;
    --shadow-hard: 6px 6px 0px rgba(0,0,0,0.2);
  }

  .mv-topbar { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .mv-topbar .bot-name { font-family: var(--f-display); font-size: 1.4rem; text-transform: uppercase; letter-spacing: 1px; }
  .mv-topbar .vs { font-family: var(--f-display); font-size: 2rem; color: var(--c-red); }
  .mv-stat-block { margin-bottom: 0; margin-top: 0.3rem; }
  .mv-stat-title { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 0.35rem; }
  .mv-bar-shell { height: 16px; background: #101010; border-radius: 999px; overflow: hidden; border: 2px solid var(--c-dark); width: 180px; }
  .mv-bar-fill { height: 100%; transition: width 0.35s ease, background 0.35s ease; }
  .mv-status-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 900; padding: 0.35rem 0.8rem; border-radius: 999px; border: 2px solid var(--c-dark); background: var(--c-white); font-size: 0.85rem; }
  .mv-tactic-chip { display: inline-flex; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; border: 2px solid var(--c-dark); background: var(--c-yellow); color: var(--c-dark); margin-left: 0.5rem; }
  .mv-tactic-chip.enemy-chip { background: var(--c-red); color: #fff; }
  .mv-turn-counter { font-family: var(--f-display); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; color: var(--c-dark); }
  .mv-arena-badge { font-family: var(--f-display); font-size: 1.1rem; text-transform: uppercase; background: var(--c-cyan); padding: 0.35rem 0.9rem; border: 3px solid var(--c-dark); border-radius: 999px; }
  .mv-seed-pill { font-size: 0.85rem; font-weight: 800; border: 2px dashed var(--c-dark); border-radius: 999px; padding: 0.3rem 0.8rem; display: inline-flex; gap: 0.35rem; align-items: center; }
  .mv-action-btn { border: 3px solid var(--c-dark); border-radius: 12px; background: var(--c-white); font-weight: 900; padding: 0.35rem 1rem; cursor: pointer; font-size: 0.85rem; text-transform: uppercase; }
  .mv-panel { background: var(--c-white); border: 3px solid var(--c-dark); border-radius: var(--radius); box-shadow: var(--shadow-hard); padding: 2rem; }
  .mv-section-label { font-weight: 900; text-transform: uppercase; font-size: 0.9rem; margin-bottom: 0.5rem; letter-spacing: 1px; }
  .mv-feed { background: #0f0f0f; color: #f5f5f5; border-radius: 12px; border: 3px solid var(--c-dark); padding: 1rem; max-height: 220px; overflow-y: auto; font-size: 0.95rem; line-height: 1.5; }
  .mv-feed-item { padding: 0.6rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .mv-feed-item:last-child { border-bottom: none; }
  .mv-energy-row { display: flex; gap: 1.5rem; justify-content: center; margin-top: 0.5rem; }
  .mv-energy-block { text-align: center; flex: 1; max-width: 220px; }
  .mv-energy-label { font-size: 0.75rem; font-weight: 900; text-transform: uppercase; margin-bottom: 0.2rem; }
  .mv-hint { font-size: 0.9rem; opacity: 0.7; }
  .mv-vfx-popup { position: absolute; inset: -50%; display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: none; font-family: var(--f-display); letter-spacing: 1px; white-space: nowrap; }
  .mv-vfx-popup.burst { font-size: 1.5em; animation: mv-burst 600ms ease-out forwards; }
  .mv-vfx-popup.ring { font-size: 1.3em; animation: mv-ring 600ms ease-out forwards; }
  .mv-vfx-popup.ko { font-size: 2em; animation: mv-slam 800ms ease-out forwards; }

  @keyframes mv-burst { 0% { transform: scale(0.2) rotate(-12deg); opacity: 0; } 20% { transform: scale(1.4) rotate(4deg); opacity: 1; } 100% { transform: scale(1.1); opacity: 0; } }
  @keyframes mv-ring { 0% { transform: scale(0.3); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
  @keyframes mv-slam { 0% { transform: scale(4); opacity: 0; } 30% { transform: scale(0.85); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes mv-flash { 0% { box-shadow: inset 0 0 0 50px rgba(255,255,255,0.6); } 100% { box-shadow: inset 0 0 0 50px rgba(255,255,255,0); } }

  /* KO Overlay */
  .mv-ko-overlay { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.92); overflow: hidden; }
  .mv-ko-radial-bg { position: absolute; width: 250%; height: 250%; top: -75%; left: -75%; background: repeating-conic-gradient(from 0deg, #FFD233 0deg 5deg, #111 5deg 10deg); animation: mv-spin 20s linear infinite; opacity: 0.15; pointer-events: none; }
  .mv-ko-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2rem; }
  .mv-ko-title { font-family: var(--f-display); font-size: 6rem; color: #FFD233; text-shadow: 4px 4px 0px #111; text-transform: uppercase; animation: mv-slam 0.6s ease-out; }
  .mv-ko-winner-name { font-family: var(--f-display); font-size: 2.5rem; color: #fff; text-shadow: 2px 2px 0px #111; text-transform: uppercase; }
  .mv-ko-reason { font-family: var(--f-body); font-size: 1.1rem; color: #aaa; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; }
  .mv-ko-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2rem; text-align: left; margin-top: 0.5rem; font-size: 0.95rem; color: #aaa; }
  .mv-ko-stats { font-family: var(--f-body); font-size: 1rem; color: #888; }
  .mv-ko-actions { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 1.5rem; }
  .mv-ko-btn { font-family: var(--f-display); font-size: 1.6rem; text-transform: uppercase; padding: 1rem 3rem; background: #FFD233; color: #111; border: 4px solid #111; border-radius: 999px; box-shadow: 0 6px 0 #111; cursor: pointer; transition: transform 0.1s ease; }
  .mv-ko-btn:active { transform: translateY(4px); box-shadow: none; }
  .mv-ko-btn.secondary { background: #fff; }

  @keyframes mv-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  .mv-arena-cell {
    position: relative; aspect-ratio: 1 / 1; border-radius: 10px;
    background: #f6f7f8; border: 2px solid rgba(0,0,0,0.2);
    display: grid; place-items: center; font-weight: 900; color: #111; overflow: visible;
  }
  .mv-arena-cell.player { background: rgba(46,204,113,0.18); border-color: #2ecc71; padding: 3px; }
  .mv-arena-cell.enemy { background: rgba(235,77,75,0.18); border-color: #eb4d4b; padding: 3px; }
  .mv-arena-cell.cell-flash { animation: mv-flash 200ms ease-out; }

  @media (max-width: 640px) {
    .mv-ko-title { font-size: 3rem; }
    .mv-ko-winner-name { font-size: 1.6rem; }
    .mv-ko-btn { font-size: 1.2rem; padding: 0.8rem 2rem; }
  }
`;

/* ── SVGs ───────────────────────────────────────────────────── */

const PlayerBotSvg = () => (
  <svg viewBox="0 0 40 40" style={{ width: '88%', height: '88%', display: 'block' }}>
    <rect x="12" y="2" width="16" height="10" rx="3" fill="#2ecc71" stroke="#111" strokeWidth="2" />
    <rect x="15" y="5" width="10" height="4" rx="1.5" fill="#111" />
    <circle cx="18" cy="7" r="1.5" fill="#27D9E8" />
    <circle cx="22" cy="7" r="1.5" fill="#27D9E8" />
    <rect x="10" y="12" width="20" height="13" rx="2" fill="#2ecc71" stroke="#111" strokeWidth="2" />
    <rect x="15" y="15" width="10" height="6" rx="1" fill="#27ae60" stroke="#111" strokeWidth="1" />
    <circle cx="20" cy="18" r="2" fill="#27D9E8" />
    <rect x="3" y="13" width="7" height="10" rx="3" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="30" y="13" width="7" height="10" rx="3" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="12" y="25" width="7" height="10" rx="2" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="21" y="25" width="7" height="10" rx="2" fill="#27ae60" stroke="#111" strokeWidth="2" />
  </svg>
);

const EnemyBotSvg = () => (
  <svg viewBox="0 0 40 40" style={{ width: '88%', height: '88%', display: 'block' }}>
    <polygon points="20,1 30,11 10,11" fill="#eb4d4b" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
    <rect x="7" y="11" width="26" height="14" rx="2" fill="#eb4d4b" stroke="#111" strokeWidth="2" />
    <rect x="13" y="14" width="14" height="7" rx="1" fill="#c0392b" stroke="#111" strokeWidth="1" />
    <circle cx="20" cy="17.5" r="2.5" fill="#FF4D4D" />
    <circle cx="20" cy="17.5" r="1" fill="#FFD233" />
    <rect x="1" y="13" width="6" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="33" y="13" width="6" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="10" y="25" width="8" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="22" y="25" width="8" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
  </svg>
);

/* ── Constants ──────────────────────────────────────────────── */

const GRID_SIZE = 8;

type VfxEvent = {
  id: string;
  cell: { x: number; y: number };
  text: string;
  color: string;
  type: 'burst' | 'ring' | 'ko';
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
const hpBarGradient = (hp: number): string => {
  if (hp > 60) return 'linear-gradient(90deg, #2ecc71, #27ae60)';
  if (hp > 30) return 'linear-gradient(90deg, #f39c12, #e67e22)';
  return 'linear-gradient(90deg, #FF4D4D, #c0392b)';
};
const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

/* ── Component ──────────────────────────────────────────────── */

export default function MatchView({ botA, botB, seed: seedProp, onBack, backLabel, onTweakBot }: MatchViewProps) {
  const [phase, setPhase] = useState<'match' | 'result'>('match');

  const [botAHp, setBotAHp] = useState(HP_MAX);
  const [botBHp, setBotBHp] = useState(HP_MAX);
  const [botAEnergy, setBotAEnergy] = useState(ENERGY_MAX);
  const [botBEnergy, setBotBEnergy] = useState(ENERGY_MAX);
  const [botAPos, setBotAPos] = useState({ x: 1, y: 4 });
  const [botBPos, setBotBPos] = useState({ x: 6, y: 4 });
  const [tick, setTick] = useState(0);
  const [activeSeed, setActiveSeed] = useState<number>(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<string>('');
  const [finalStats, setFinalStats] = useState<any>(null);
  const [vfxEvents, setVfxEvents] = useState<VfxEvent[]>([]);
  const [botALastAction, setBotALastAction] = useState('');
  const [botBLastAction, setBotBLastAction] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const prevEventsLenRef = useRef(0);
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const [pcActive, setPcActive] = useState(false);
  const [vfxWord, setVfxWord] = useState<{ text: string; color: string; id: number } | null>(null);

  // Inject styles
  useEffect(() => {
    const id = 'matchview-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = matchStyles;
      document.head.appendChild(style);
    }
  }, []);

  const aName = botA.botName || 'Bot A';
  const bName = botB.botName || 'Bot B';

  // Format events for combat log
  const formatEvent = useCallback((event: any): string | null => {
    const who = event.actorId === 'botA' ? aName : bName;
    const t = event.tick ?? '?';
    switch (event.type) {
      case 'DAMAGE_APPLIED': {
        const d = event.data;
        const target = event.targetId === 'botA' ? aName : bName;
        return `[${t}] ${who} hits ${target} for ${d.amount} dmg${d.defenderGuarded ? ' (guarded)' : ''}`;
      }
      case 'ILLEGAL_ACTION':
        return `[${t}] ${who}: ILLEGAL ${event.data.action?.type ?? '?'} — ${event.data.reason}`;
      case 'ACTION_ACCEPTED': {
        const d = event.data;
        if (d.type === 'NO_OP') return null;
        if (d.type === 'MOVE') return `[${t}] ${who} moves ${d.dir}`;
        if (d.type === 'DASH') return `[${t}] ${who} dashes ${d.dir}`;
        return `[${t}] ${who} uses ${d.type}`;
      }
      case 'MATCH_END':
        return `[${t}] MATCH END — ${event.data.reason}`;
      default:
        return null;
    }
  }, [aName, bName]);

  // VFX spawner
  const spawnVfx = useCallback((cell: { x: number; y: number }, text: string, color: string, type: VfxEvent['type'] = 'burst', duration = 600) => {
    const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setVfxEvents((prev) => [...prev, { id, cell: { ...cell }, text, color, type }]);
    setTimeout(() => setVfxEvents((prev) => prev.filter((e) => e.id !== id)), duration);
  }, []);

  // Snapshot handler
  const handleSnapshot = useCallback((snap: MatchSnapshot) => {
    sceneRef.current?.update?.(snap);
    const s = snap.state;
    const actorA = s.actors?.botA;
    const actorB = s.actors?.botB;
    if (!actorA || !actorB) return;

    setBotAHp(actorA.hp);
    setBotBHp(actorB.hp);
    setBotAEnergy(actorA.energy);
    setBotBEnergy(actorB.energy);
    setTick(s.tick);

    const ARENA_WORLD = 20;
    const aPosGrid = {
      x: clamp(Math.floor((actorA.position.x / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
      y: clamp(Math.floor((actorA.position.y / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
    };
    const bPosGrid = {
      x: clamp(Math.floor((actorB.position.x / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
      y: clamp(Math.floor((actorB.position.y / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
    };
    setBotAPos(aPosGrid);
    setBotBPos(bPosGrid);

    const events: any[] = s.events || [];
    const prevLen = prevEventsLenRef.current;
    const newEvents = events.slice(prevLen);
    prevEventsLenRef.current = events.length;

    const logEntries = newEvents.map(formatEvent).filter((e: string | null): e is string => e !== null);
    if (logEntries.length) {
      setFeed((prev) => [...logEntries.reverse(), ...prev].slice(0, 50));
    }

    for (const evt of newEvents) {
      if (evt.type === 'ACTION_ACCEPTED') {
        const label = evt.data?.type === 'NO_OP' ? '' : (evt.data?.type || '').replace(/_/g, ' ');
        if (evt.actorId === 'botA') setBotALastAction(label);
        else if (evt.actorId === 'botB') setBotBLastAction(label);
      }
    }

    for (const evt of newEvents) {
      if (evt.type === 'DAMAGE_APPLIED') {
        const targetPos = evt.targetId === 'botA' ? aPosGrid : bPosGrid;
        const isAAttacker = evt.actorId === 'botA';
        spawnVfx(targetPos, isAAttacker ? 'KAPOW!' : 'CLANG!', isAAttacker ? '#FF4D4D' : '#27D9E8', isAAttacker ? 'burst' : 'ring', 600);
      }
    }

    if (snap.ended) {
      setWinnerId(snap.winnerId);
      setEndReason(s.endReason || 'UNKNOWN');
      setFinalStats({
        botAHp: actorA.hp,
        botBHp: actorB.hp,
        botADmg: actorA.stats?.damageDealt ?? 0,
        botBDmg: actorB.stats?.damageDealt ?? 0,
        botAIllegal: actorA.stats?.illegalActions ?? 0,
        botBIllegal: actorB.stats?.illegalActions ?? 0,
      });
      setRunning(false);
      setPhase('result');
    }
  }, [formatEvent, spawnVfx]);

  // Canvas VFX word overlay
  useEffect(() => {
    const canvas = playCanvasRef.current;
    if (!canvas) return;
    const handler = (e: Event) => {
      const { text, color } = (e as CustomEvent).detail;
      const id = Date.now();
      setVfxWord({ text, color, id });
      setTimeout(() => setVfxWord((prev) => (prev?.id === id ? null : prev)), 700);
    };
    canvas.addEventListener('moltpit:vfx', handler);
    return () => canvas.removeEventListener('moltpit:vfx', handler);
  }, [phase]);

  // PlayCanvas lifecycle
  useEffect(() => {
    if (phase !== 'match' || !playCanvasRef.current) return;
    let destroyed = false;
    import('../lib/ws2/PlayCanvasScene').then(({ PlayCanvasScene }) => {
      if (destroyed || !playCanvasRef.current) return;
      try {
        const scene = new PlayCanvasScene(playCanvasRef.current);
        sceneRef.current = scene;
        setPcActive(true);
      } catch {
        setPcActive(false);
      }
    }).catch(() => { setPcActive(false); });
    return () => {
      destroyed = true;
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
      setPcActive(false);
    };
  }, [phase]);

  // Start match on mount
  useEffect(() => {
    const seed = seedProp ?? (hashString(`${Date.now()}`) || 1);
    setActiveSeed(seed);

    const defaultPrompt = 'You are a tactical fighter. Attack when in range, otherwise close distance.';

    const configA: BotConfig = {
      id: 'botA',
      name: botA.botName || 'Bot A',
      systemPrompt: botA.brainPrompt || defaultPrompt,
      loadout: botA.actionTypes,
      armor: botA.armor,
      position: { x: 4, y: 10 },
      moveCost: botA.moveCost,
      brainPrompt: botA.brainPrompt || defaultPrompt,
      skills: botA.skills || [],
    };

    const configB: BotConfig = {
      id: 'botB',
      name: botB.botName || 'Bot B',
      systemPrompt: botB.brainPrompt || defaultPrompt,
      loadout: botB.actionTypes,
      armor: botB.armor,
      position: { x: 16, y: 10 },
      moveCost: botB.moveCost,
      brainPrompt: botB.brainPrompt || defaultPrompt,
      skills: botB.skills || [],
    };

    const initLines = [
      `Molt initialized. Seed ${seed}.`,
      `${configA.name} (${configA.armor}) vs ${configB.name} (${configB.armor})`,
    ];
    setFeed(initLines.reverse());
    setRunning(true);
    setPhase('match');
    prevEventsLenRef.current = 0;

    const controller = new AbortController();
    abortRef.current = controller;

    runMatchAsync(seed, [configA, configB], handleSnapshot, '/api/agent/decide', controller.signal)
      .catch((err) => {
        console.error('[MatchView] Error:', err);
        setRunning(false);
      });

    return () => { controller.abort(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const abortMatch = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setRunning(false);
    setPhase('result');
    setEndReason('ABORTED');
  }, []);

  const rematch = useCallback(() => {
    // Reset all state
    setBotAHp(HP_MAX);
    setBotBHp(HP_MAX);
    setBotAEnergy(ENERGY_MAX);
    setBotBEnergy(ENERGY_MAX);
    setTick(0);
    setFeed([]);
    setWinnerId(null);
    setEndReason('');
    setFinalStats(null);
    setVfxEvents([]);
    setBotALastAction('');
    setBotBLastAction('');
    setPcActive(false);
    prevEventsLenRef.current = 0;

    const seed = hashString(`${Date.now()}`) || 1;
    setActiveSeed(seed);

    const defaultPrompt = 'You are a tactical fighter. Attack when in range, otherwise close distance.';

    const configA: BotConfig = {
      id: 'botA',
      name: botA.botName || 'Bot A',
      systemPrompt: botA.brainPrompt || defaultPrompt,
      loadout: botA.actionTypes,
      armor: botA.armor,
      position: { x: 4, y: 10 },
      moveCost: botA.moveCost,
      brainPrompt: botA.brainPrompt || defaultPrompt,
      skills: botA.skills || [],
    };
    const configB: BotConfig = {
      id: 'botB',
      name: botB.botName || 'Bot B',
      systemPrompt: botB.brainPrompt || defaultPrompt,
      loadout: botB.actionTypes,
      armor: botB.armor,
      position: { x: 16, y: 10 },
      moveCost: botB.moveCost,
      brainPrompt: botB.brainPrompt || defaultPrompt,
      skills: botB.skills || [],
    };

    const initLines = [
      `Molt initialized. Seed ${seed}.`,
      `${configA.name} (${configA.armor}) vs ${configB.name} (${configB.armor})`,
    ];
    setFeed(initLines.reverse());
    setRunning(true);
    setPhase('match');

    const controller = new AbortController();
    abortRef.current = controller;
    runMatchAsync(seed, [configA, configB], handleSnapshot, '/api/agent/decide', controller.signal)
      .catch(() => setRunning(false));
  }, [botA, botB, handleSnapshot]);

  const matchTimeSec = (tick / TICK_RATE).toFixed(1);
  const winnerName = winnerId === 'botA' ? aName : winnerId === 'botB' ? bName : 'Draw';

  /* ── Match phase render ───────────────────────────────────── */
  if (phase === 'match') {
    return (
      <div>
        {/* Top bar */}
        <div className="mv-topbar">
          <div style={{ textAlign: 'right' }}>
            <span className="bot-name" style={{ color: '#00E5FF', textShadow: '1px 1px 0 #1A1A1A', fontFamily: 'var(--f-display)', fontSize: '1.4rem', textTransform: 'uppercase' }}>
              {aName}
              {botALastAction && <span className="mv-tactic-chip">{botALastAction}</span>}
            </span>
            <div className="mv-stat-block">
              <div className="mv-stat-title">
                <span>HP</span>
                <span className="mv-status-pill">{botAHp}</span>
              </div>
              <div className="mv-bar-shell">
                <div className="mv-bar-fill" style={{ width: `${botAHp}%`, background: hpBarGradient(botAHp) }} />
              </div>
            </div>
          </div>

          <span style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', color: 'var(--c-red)' }}>VS</span>

          <div>
            <span className="bot-name" style={{ color: '#eb4d4b', fontFamily: 'var(--f-display)', fontSize: '1.4rem', textTransform: 'uppercase' }}>
              {bName}
              {botBLastAction && <span className="mv-tactic-chip enemy-chip">{botBLastAction}</span>}
            </span>
            <div className="mv-stat-block">
              <div className="mv-stat-title">
                <span>HP</span>
                <span className="mv-status-pill">{botBHp}</span>
              </div>
              <div className="mv-bar-shell">
                <div className="mv-bar-fill" style={{ width: `${botBHp}%`, background: hpBarGradient(botBHp) }} />
              </div>
            </div>
          </div>
        </div>

        {/* PlayCanvas 3D arena */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto 1rem', height: '560px', overflow: 'hidden', borderRadius: '14px', border: '4px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A', background: '#F9F7F2' }}>
          <canvas ref={playCanvasRef} style={{ width: '100%', height: '100%', display: 'block' }} />
          {!pcActive && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#F9F7F2' }}>
              <div style={{ fontFamily: 'Bangers, display', fontSize: '2rem', color: '#1A1A1A', letterSpacing: '2px' }}>LOADING ARENA...</div>
            </div>
          )}
          {vfxEvents.map((v) => (
            <div
              key={v.id}
              className={`mv-vfx-popup ${v.type}`}
              style={{
                position: 'absolute',
                left: `${15 + (v.cell.x / 8) * 70}%`,
                top: `${20 + (v.cell.y / 8) * 50}%`,
                transform: 'translate(-50%, -50%)',
                color: v.color,
                fontSize: v.type === 'ko' ? '5rem' : '2.8rem',
                fontFamily: 'Bangers, display',
                textShadow: '-3px -3px 0 #1A1A1A, 3px -3px 0 #1A1A1A, -3px 3px 0 #1A1A1A, 3px 3px 0 #1A1A1A',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            >
              {v.text}
            </div>
          ))}
          {vfxWord && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none', zIndex: 10 }}>
              <span style={{
                fontFamily: 'Bangers, display', fontSize: '5rem', color: vfxWord.color,
                WebkitTextStroke: '4px #111',
                textShadow: '4px 4px 0 #111, -4px -4px 0 #111, 4px -4px 0 #111, -4px 4px 0 #111',
              }}>
                {vfxWord.text}
              </span>
            </div>
          )}
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '0.5rem 0', flexWrap: 'wrap' }}>
          <span className="mv-turn-counter">Tick {tick}</span>
          <span className="mv-arena-badge">{matchTimeSec}s</span>
          <span className="mv-seed-pill">Seed {activeSeed}</span>
          <button className="mv-action-btn" onClick={abortMatch}>Abort</button>
        </div>

        {/* Energy bars */}
        <div className="mv-energy-row" style={{ maxWidth: '800px', margin: '0 auto 1rem' }}>
          <div className="mv-energy-block">
            <div className="mv-energy-label" style={{ color: '#00E5FF' }}>{aName} Energy</div>
            <div className="mv-bar-shell" style={{ width: '100%' }}>
              <div className="mv-bar-fill" style={{ width: `${(botAEnergy / ENERGY_MAX) * 100}%`, background: 'linear-gradient(90deg, #00e5ff, #0077b6)' }} />
            </div>
            <div className="mv-hint" style={{ fontSize: '0.75rem' }}>{Math.round(botAEnergy / 10)}e</div>
          </div>
          <div className="mv-energy-block">
            <div className="mv-energy-label" style={{ color: '#eb4d4b' }}>{bName} Energy</div>
            <div className="mv-bar-shell" style={{ width: '100%' }}>
              <div className="mv-bar-fill" style={{ width: `${(botBEnergy / ENERGY_MAX) * 100}%`, background: 'linear-gradient(90deg, #ff6b6b, #c0392b)' }} />
            </div>
            <div className="mv-hint" style={{ fontSize: '0.75rem' }}>{Math.round(botBEnergy / 10)}e</div>
          </div>
        </div>

        {/* Combat log */}
        <section className="mv-panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div className="mv-section-label">Combat Log</div>
          <div className="mv-feed" style={{ maxHeight: '220px' }}>
            {feed.length === 0 && <div className="mv-feed-item">Waiting for first LLM decisions...</div>}
            {feed.map((entry, index) => (
              <div key={`${index}-${entry.slice(0, 20)}`} className="mv-feed-item">{entry}</div>
            ))}
          </div>
        </section>
      </div>
    );
  }

  /* ── Result phase render ──────────────────────────────────── */
  return (
    <div className="mv-ko-overlay">
      <div className="mv-ko-radial-bg" />
      <div className="mv-ko-content">
        <div className="mv-ko-title">
          {endReason === 'ABORTED' ? 'ABORTED' : endReason === 'KO' ? 'K.O.!' : endReason === 'TIMEOUT' ? 'TIME!' : 'MOLT OVER'}
        </div>
        <div className="mv-ko-winner-name">
          {winnerId ? `${winnerName} WINS` : 'DRAW'}
        </div>
        <div className="mv-ko-reason">
          {endReason === 'KO' ? 'KNOCKOUT'
            : endReason === 'TIMEOUT' ? 'TIME EXPIRED'
            : endReason === 'ABORTED' ? 'MOLT ABORTED'
            : endReason?.replace(/_/g, ' ') || ''}
        </div>

        {finalStats && (
          <div className="mv-ko-stats-grid">
            <span style={{ color: '#2ecc71' }}>{aName}: HP {finalStats.botAHp}</span>
            <span style={{ color: '#eb4d4b' }}>{bName}: HP {finalStats.botBHp}</span>
            <span style={{ color: '#2ecc71' }}>Damage dealt: {finalStats.botADmg}</span>
            <span style={{ color: '#eb4d4b' }}>Damage dealt: {finalStats.botBDmg}</span>
            <span style={{ color: '#2ecc71' }}>Illegal actions: {finalStats.botAIllegal}</span>
            <span style={{ color: '#eb4d4b' }}>Illegal actions: {finalStats.botBIllegal}</span>
          </div>
        )}

        <div className="mv-ko-stats">
          Tick {tick} &middot; {matchTimeSec}s &middot; Seed {activeSeed}
        </div>

        <div className="mv-ko-actions">
          <button className="mv-ko-btn" onClick={rematch}>Rematch</button>
          {onTweakBot && (
            <button className="mv-ko-btn secondary" onClick={onTweakBot}>Tweak Crawler</button>
          )}
          {onBack && (
            <button className="mv-ko-btn secondary" onClick={onBack}>{backLabel || 'Back to The Den'}</button>
          )}
        </div>
      </div>
    </div>
  );
}
