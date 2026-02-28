import React, { useEffect, useState, useCallback, useRef } from 'react';
import { runMatchAsync } from '../lib/ws2/run-match';
import { HP_MAX, TICK_RATE } from '../lib/ws2/index';
import type { BotConfig, MatchSnapshot } from '../lib/ws2/match-types';

/* ── Arena constants ─────────────────────────────────────────── */

const ARENA_SIZE_UNITS = 20;
const UNIT_SCALE = 10; // position units per grid cell
const ENERGY_MAX = 1000;
const CELL_PX = 14; // pixels per grid cell
const ARENA_PX = ARENA_SIZE_UNITS * CELL_PX; // 280px

/* ── Scripted-AI reasoning fallbacks ─────────────────────────── */

const SCRIPTED_REASONING: Record<string, string> = {
  MELEE_STRIKE: 'Enemy in range — press the advantage!',
  RANGED_SHOT: 'Clear line of sight — taking the shot.',
  GUARD: 'Low resources — bracing for impact.',
  MOVE: 'Closing distance to engage.',
  DASH: 'Rushing into position!',
  UTILITY: 'Deploying tactical ability.',
  NO_OP: 'Conserving energy.',
};

/* ── Bot presets ─────────────────────────────────────────────── */

const BERSERKER_BASE: BotConfig = {
  id: 'botA',
  name: 'BERSERKER',
  systemPrompt:
    'You are BERSERKER, an aggressive melee fighter. Rush the enemy. Attack at every opportunity. Never retreat. Close distance and use MELEE_STRIKE whenever possible. DASH to close gaps quickly.',
  loadout: ['MOVE', 'MELEE_STRIKE', 'DASH', 'GUARD'],
  armor: 'light',
  position: { x: 4, y: 10 },
  temperature: 0.9,
  brainPrompt:
    'Rush the enemy. Attack at every opportunity. Never retreat. Close distance and use MELEE_STRIKE whenever possible. DASH to close gaps quickly.',
};

const TACTICIAN_BASE: BotConfig = {
  id: 'botB',
  name: 'TACTICIAN',
  systemPrompt:
    'You are TACTICIAN, a defensive ranged fighter. Maintain optimal range. Use GUARD when low energy. Snipe from distance. Keep 3-8 distance from enemy. Use RANGED_SHOT as primary damage.',
  loadout: ['MOVE', 'RANGED_SHOT', 'GUARD', 'UTILITY'],
  armor: 'heavy',
  position: { x: 16, y: 10 },
  temperature: 0.3,
  brainPrompt:
    'Maintain optimal range. Use GUARD when low energy. Snipe from distance. Keep 3-8 distance from enemy. Use RANGED_SHOT as primary damage.',
};

/* ── Helpers ─────────────────────────────────────────────────── */

const hpColor = (hp: number) =>
  hp > 60 ? '#2ecc71' : hp > 30 ? '#f39c12' : '#eb4d4b';

const energyColor = (pct: number) =>
  pct > 60 ? '#00bcd4' : pct > 30 ? '#ff9800' : '#f44336';

const ACTION_ICONS: Record<string, string> = {
  MELEE_STRIKE: '\u2694\uFE0F',
  RANGED_SHOT: '\uD83C\uDFAF',
  GUARD: '\uD83D\uDEE1\uFE0F',
  DASH: '\uD83D\uDCA8',
  MOVE: '\uD83D\uDC63',
  UTILITY: '\u26A1',
  NO_OP: '\u23F8\uFE0F',
};

interface FeedEntry {
  text: string;
  reasoning?: string;
}

interface ActorPos {
  x: number; // grid coords (0..ARENA_SIZE_UNITS)
  y: number;
}

/* ── Arena Map SVG ───────────────────────────────────────────── */

function ArenaMap({
  posA,
  posB,
  energyA,
  energyB,
}: {
  posA: ActorPos | null;
  posB: ActorPos | null;
  energyA: number;
  energyB: number;
}) {
  if (!posA && !posB) return null;

  const cx = ARENA_SIZE_UNITS / 2; // 10
  const cy = ARENA_SIZE_UNITS / 2; // 10
  const objRadius = 2.5 * CELL_PX;

  const toSvg = (pos: ActorPos) => ({
    x: pos.x * CELL_PX + CELL_PX / 2,
    y: pos.y * CELL_PX + CELL_PX / 2,
  });

  const svgA = posA ? toSvg(posA) : null;
  const svgB = posB ? toSvg(posB) : null;

  // Distance in grid cells
  const distCells =
    posA && posB
      ? Math.sqrt(Math.pow(posA.x - posB.x, 2) + Math.pow(posA.y - posB.y, 2)).toFixed(1)
      : null;

  const energyPctA = Math.round((energyA / ENERGY_MAX) * 100);
  const energyPctB = Math.round((energyB / ENERGY_MAX) * 100);

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.5rem',
          marginBottom: '0.4rem',
        }}
      >
        <span
          style={{
            fontSize: '0.7rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.35)',
            letterSpacing: '1px',
          }}
        >
          Arena
        </span>
        {distCells && (
          <span
            style={{
              fontSize: '0.68rem',
              color: 'rgba(255,255,255,0.3)',
              fontFamily: "'IBM Plex Mono', monospace",
            }}
          >
            dist: {distCells}
          </span>
        )}
      </div>

      {/* SVG arena grid */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <svg
          width={ARENA_PX}
          height={ARENA_PX}
          style={{
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: '6px',
            background: '#0a0a0a',
            display: 'block',
          }}
        >
          {/* Grid lines */}
          {Array.from({ length: ARENA_SIZE_UNITS + 1 }, (_, i) => (
            <React.Fragment key={`grid-${i}`}>
              <line
                x1={i * CELL_PX}
                y1={0}
                x2={i * CELL_PX}
                y2={ARENA_PX}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
              <line
                x1={0}
                y1={i * CELL_PX}
                x2={ARENA_PX}
                y2={i * CELL_PX}
                stroke="rgba(255,255,255,0.04)"
                strokeWidth={0.5}
              />
            </React.Fragment>
          ))}

          {/* Objective zone circle */}
          <circle
            cx={cx * CELL_PX}
            cy={cy * CELL_PX}
            r={objRadius}
            fill="rgba(255,214,0,0.04)"
            stroke="rgba(255,214,0,0.2)"
            strokeWidth={1}
            strokeDasharray="4 3"
          />

          {/* BERSERKER (cyan) */}
          {svgA && (
            <g>
              <rect
                x={svgA.x - 5}
                y={svgA.y - 5}
                width={10}
                height={10}
                rx={2}
                fill="#00E5FF"
                opacity={0.9}
              />
              <text
                x={svgA.x}
                y={svgA.y - 8}
                textAnchor="middle"
                fill="#00E5FF"
                fontSize={7}
                fontWeight="bold"
              >
                B
              </text>
            </g>
          )}

          {/* TACTICIAN (red) */}
          {svgB && (
            <g>
              <rect
                x={svgB.x - 5}
                y={svgB.y - 5}
                width={10}
                height={10}
                rx={2}
                fill="#eb4d4b"
                opacity={0.9}
              />
              <text
                x={svgB.x}
                y={svgB.y - 8}
                textAnchor="middle"
                fill="#eb4d4b"
                fontSize={7}
                fontWeight="bold"
              >
                T
              </text>
            </g>
          )}
        </svg>
      </div>

      {/* Energy bars */}
      <div
        style={{
          display: 'flex',
          gap: '1rem',
          marginTop: '0.5rem',
        }}
      >
        {/* BERSERKER energy */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.15rem',
            }}
          >
            <span style={{ fontSize: '0.65rem', color: '#00E5FF', fontWeight: 800 }}>
              ⚡ ENERGY
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
              {energyPctA}%
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: '#101010',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(0,229,255,0.15)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${energyPctA}%`,
                background: energyColor(energyPctA),
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        {/* TACTICIAN energy */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.15rem',
            }}
          >
            <span style={{ fontSize: '0.65rem', color: '#eb4d4b', fontWeight: 800 }}>
              ⚡ ENERGY
            </span>
            <span style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)' }}>
              {energyPctB}%
            </span>
          </div>
          <div
            style={{
              height: '6px',
              background: '#101010',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '1px solid rgba(235,77,75,0.15)',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${energyPctB}%`,
                background: energyColor(energyPctB),
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Component ───────────────────────────────────────────────── */

export default function QuickDemo() {
  /* API key */
  const [llmKey, setLlmKey] = useState('');
  const [keyExpanded, setKeyExpanded] = useState(false);

  /* Match state */
  const [botAHp, setBotAHp] = useState(HP_MAX);
  const [botBHp, setBotBHp] = useState(HP_MAX);
  const [botAEnergy, setBotAEnergy] = useState(0);
  const [botBEnergy, setBotBEnergy] = useState(0);
  const [botAPos, setBotAPos] = useState<ActorPos | null>(null);
  const [botBPos, setBotBPos] = useState<ActorPos | null>(null);
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<FeedEntry[]>([]);
  const [phase, setPhase] = useState<'playing' | 'ended'>('playing');
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [endReason, setEndReason] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const prevEventsLenRef = useRef(0);
  const matchKeyRef = useRef(0);

  /* PlayCanvas 3D */
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);
  const [pcActive, setPcActive] = useState(false);

  /* VFX word overlay */
  interface VfxWord { id: string; text: string; color: string }
  const [vfxWords, setVfxWords] = useState<VfxWord[]>([]);

  /* Load stored key */
  useEffect(() => {
    const stored = localStorage.getItem('moltpit_llm_key');
    if (stored) setLlmKey(stored);
  }, []);

  const saveKey = (key: string) => {
    setLlmKey(key);
    if (key) localStorage.setItem('moltpit_llm_key', key);
    else localStorage.removeItem('moltpit_llm_key');
  };

  /* Build bots with optional LLM headers */
  const buildBots = useCallback((): [BotConfig, BotConfig] => {
    const headers: Record<string, string> = {};
    if (llmKey) {
      headers['x-llm-key'] = llmKey;
      headers['x-llm-provider'] = 'openai';
    }
    return [
      { ...BERSERKER_BASE, llmHeaders: headers },
      { ...TACTICIAN_BASE, llmHeaders: headers },
    ];
  }, [llmKey]);

  /* Snapshot handler */
  const handleSnapshot = useCallback((snap: MatchSnapshot) => {
    sceneRef.current?.update?.(snap);
    const s = snap.state;
    const a = s.actors?.botA;
    const b = s.actors?.botB;
    if (!a || !b) return;

    setBotAHp(a.hp);
    setBotBHp(b.hp);
    setTick(s.tick);

    // Track energy
    if (typeof a.energy === 'number') setBotAEnergy(a.energy);
    if (typeof b.energy === 'number') setBotBEnergy(b.energy);

    // Track positions (stored as tenths → divide by UNIT_SCALE for grid coords)
    if (a.position && typeof a.position.x === 'number' && typeof a.position.y === 'number') {
      setBotAPos({
        x: a.position.x / UNIT_SCALE,
        y: a.position.y / UNIT_SCALE,
      });
    }
    if (b.position && typeof b.position.x === 'number' && typeof b.position.y === 'number') {
      setBotBPos({
        x: b.position.x / UNIT_SCALE,
        y: b.position.y / UNIT_SCALE,
      });
    }

    /* Process new events */
    const events: any[] = s.events || [];
    const prev = prevEventsLenRef.current;
    const newEvents = events.slice(prev);
    prevEventsLenRef.current = events.length;

    const entries: FeedEntry[] = [];

    for (const evt of newEvents) {
      const who = evt.actorId === 'botA' ? 'BERSERKER' : 'TACTICIAN';

      if (evt.type === 'ACTION_ACCEPTED') {
        const d = evt.data;
        if (d.type === 'NO_OP') continue;
        const icon = ACTION_ICONS[d.type] || '\u26A1';
        const label =
          d.type === 'MOVE' || d.type === 'DASH'
            ? `${d.type} ${d.dir}`
            : d.type;

        /* Find matching reasoning event */
        const reasoningEvt = newEvents.find(
          (e: any) =>
            e.type === 'BOT_REASONING' &&
            e.actorId === evt.actorId &&
            e.tick === evt.tick,
        );
        const reasoning =
          reasoningEvt?.data?.reasoning ||
          SCRIPTED_REASONING[d.type] ||
          undefined;

        entries.push({
          text: `${icon} ${who}: ${label}`,
          reasoning,
        });
      }

      if (evt.type === 'DAMAGE_APPLIED') {
        const target = evt.targetId === 'botA' ? 'BERSERKER' : 'TACTICIAN';
        const guarded = evt.data?.defenderGuarded ? ' (guarded)' : '';
        entries.push({
          text: `\uD83D\uDCA5 ${who} hits ${target} for ${evt.data?.amount ?? '?'} dmg${guarded}`,
        });
      }

      if (evt.type === 'MATCH_END') {
        entries.push({ text: `\uD83C\uDFC1 MATCH END \u2014 ${evt.data?.reason ?? ''}` });
      }
    }

    if (entries.length) {
      setFeed((prev) => [...entries, ...prev].slice(0, 50));
    }

    if (snap.ended) {
      setWinnerId(snap.winnerId);
      setEndReason(s.endReason || 'UNKNOWN');
      setPhase('ended');
    }
  }, []);

  /* Start / rematch */
  const startMatch = useCallback(() => {
    setBotAHp(HP_MAX);
    setBotBHp(HP_MAX);
    setBotAEnergy(0);
    setBotBEnergy(0);
    setBotAPos(null);
    setBotBPos(null);
    setTick(0);
    setFeed([]);
    setWinnerId(null);
    setEndReason('');
    setPhase('playing');
    prevEventsLenRef.current = 0;
    matchKeyRef.current++;

    const [a, b] = buildBots();
    const seed = (Date.now() ^ 0x5f3759df) >>> 0 || 1;

    const controller = new AbortController();
    abortRef.current = controller;

    runMatchAsync(seed, [a, b], handleSnapshot, '/api/agent/decide', controller.signal).catch(
      (err) => console.error('[QuickDemo] match error:', err),
    );
  }, [buildBots, handleSnapshot]);

  /* PlayCanvas lifecycle */
  useEffect(() => {
    if (phase !== 'playing' || !playCanvasRef.current) return;
    let destroyed = false;
    import('../lib/ws2/PlayCanvasScene').then(({ PlayCanvasScene }) => {
      if (destroyed || !playCanvasRef.current) return;
      try {
        const scene = new PlayCanvasScene(playCanvasRef.current);
        sceneRef.current = scene;
        setPcActive(true);
      } catch (e) {
        console.warn('[PlayCanvas] Init failed:', e);
        setPcActive(false);
      }
    }).catch((e) => {
      console.warn('[PlayCanvas] Load failed:', e);
      setPcActive(false);
    });
    return () => {
      destroyed = true;
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
      setPcActive(false);
    };
  }, [phase]);

  /* VFX canvas event listener */
  useEffect(() => {
    const canvas = playCanvasRef.current;
    if (!canvas) return;
    const handler = (e: Event) => {
      const { text, color } = (e as CustomEvent).detail;
      const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
      setVfxWords(prev => [...prev, { id, text, color }]);
      setTimeout(() => setVfxWords(prev => prev.filter(v => v.id !== id)), 800);
    };
    canvas.addEventListener('moltpit:vfx', handler);
    return () => canvas.removeEventListener('moltpit:vfx', handler);
  }, []);

  /* Auto-start on mount */
  useEffect(() => {
    startMatch();
    return () => {
      abortRef.current?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rematch = () => {
    abortRef.current?.abort();
    startMatch();
  };

  const winnerName =
    winnerId === 'botA' ? 'BERSERKER' : winnerId === 'botB' ? 'TACTICIAN' : null;

  /* ── Render ──────────────────────────────────────────────────── */

  return (
    <div style={{ marginBottom: '2rem' }}>
      <style>{`@keyframes vfx-bolt-in { 0% { transform: translate(-50%,-50%) scale(0.3); opacity: 0; } 25% { transform: translate(-50%,-50%) scale(1.3); opacity: 1; } 100% { transform: translate(-50%,-50%) scale(1); opacity: 0; } }`}</style>

      {/* PlayCanvas 3D arena */}
      <div style={{ position: 'relative', height: 360, marginBottom: '1rem', borderRadius: 14, overflow: 'hidden', background: '#101010', border: '3px solid #111' }}>
        <canvas
          ref={playCanvasRef}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {/* VFX word overlay */}
        {vfxWords.map(v => (
          <div key={v.id} style={{
            position: 'absolute', top: '40%', left: '50%',
            transform: 'translate(-50%,-50%)',
            fontFamily: 'Bangers, display', fontSize: '3rem',
            color: v.color, textShadow: `3px 3px 0 #000`,
            pointerEvents: 'none', animation: 'vfx-bolt-in 0.6s ease-out forwards',
          }}>{v.text}</div>
        ))}
        {/* Fallback — show before PlayCanvas loads */}
        {!pcActive && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.3)', fontFamily: 'IBM Plex Mono, monospace', fontSize: '0.85rem' }}>
            Loading arena...
          </div>
        )}
      </div>

      {/* AI mode badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          marginBottom: '0.8rem',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.3rem',
            fontSize: '0.75rem',
            fontWeight: 900,
            textTransform: 'uppercase',
            padding: '0.25rem 0.6rem',
            borderRadius: '999px',
            background: llmKey
              ? 'rgba(46,204,113,0.2)'
              : 'rgba(255,255,255,0.1)',
            color: llmKey ? '#2ecc71' : 'rgba(255,255,255,0.4)',
            border: `1px solid ${llmKey ? 'rgba(46,204,113,0.3)' : 'rgba(255,255,255,0.1)'}`,
          }}
        >
          {llmKey ? '\u25CF AI-powered' : '\u25CF Scripted AI'}
        </span>
      </div>

      {/* HP Bars */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1rem',
          gap: '1rem',
        }}
      >
        {/* BERSERKER */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.3rem',
            }}
          >
            <span
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.2rem',
                color: '#00E5FF',
              }}
            >
              BERSERKER
            </span>
            <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>
              {botAHp} HP
            </span>
          </div>
          <div
            style={{
              height: '12px',
              background: '#101010',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '2px solid #333',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${botAHp}%`,
                background: hpColor(botAHp),
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>

        <span
          style={{
            fontFamily: "'Bangers', display",
            fontSize: '1.5rem',
            color: '#eb4d4b',
            flexShrink: 0,
          }}
        >
          VS
        </span>

        {/* TACTICIAN */}
        <div style={{ flex: 1 }}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              marginBottom: '0.3rem',
            }}
          >
            <span
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.2rem',
                color: '#eb4d4b',
              }}
            >
              TACTICIAN
            </span>
            <span style={{ fontWeight: 900, fontSize: '0.85rem' }}>
              {botBHp} HP
            </span>
          </div>
          <div
            style={{
              height: '12px',
              background: '#101010',
              borderRadius: '999px',
              overflow: 'hidden',
              border: '2px solid #333',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${botBHp}%`,
                background: hpColor(botBHp),
                transition: 'width 0.3s ease',
              }}
            />
          </div>
        </div>
      </div>

      {/* Arena Map + Energy Bars */}
      <ArenaMap
        posA={botAPos}
        posB={botBPos}
        energyA={botAEnergy}
        energyB={botBEnergy}
      />

      {/* Tick counter */}
      <div style={{ textAlign: 'center', marginBottom: '0.8rem' }}>
        <span
          style={{
            fontFamily: "'Bangers', display",
            fontSize: '0.9rem',
            color: 'rgba(255,255,255,0.5)',
            textTransform: 'uppercase',
            letterSpacing: '1px',
          }}
        >
          {phase === 'playing'
            ? `Tick ${tick} \u00B7 ${(tick / TICK_RATE).toFixed(1)}s`
            : `Finished \u00B7 ${(tick / TICK_RATE).toFixed(1)}s`}
        </span>
      </div>

      {/* Action Feed */}
      <div
        style={{
          background: '#0f0f0f',
          borderRadius: '12px',
          border: '2px solid rgba(255,255,255,0.1)',
          padding: '0.8rem',
          maxHeight: '240px',
          overflowY: 'auto',
          fontSize: '0.85rem',
          lineHeight: 1.6,
        }}
      >
        {feed.length === 0 && (
          <div
            style={{
              color: 'rgba(255,255,255,0.3)',
              textAlign: 'center',
              padding: '1rem',
            }}
          >
            Waiting for first decisions...
          </div>
        )}
        {feed.map((entry, i) => (
          <div
            key={`${matchKeyRef.current}-${i}`}
            style={{
              padding: '0.4rem 0',
              borderBottom: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div>{entry.text}</div>
            {entry.reasoning && (
              <div
                style={{
                  fontSize: '0.75rem',
                  color: 'rgba(255,255,255,0.4)',
                  fontStyle: 'italic',
                  paddingLeft: '1.5rem',
                  marginTop: '0.15rem',
                }}
              >
                &ldquo;{entry.reasoning}&rdquo;
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Match End Overlay */}
      {phase === 'ended' && (
        <div
          style={{
            marginTop: '1rem',
            padding: '1.5rem',
            borderRadius: '12px',
            background: 'rgba(255,214,0,0.08)',
            border: '2px solid rgba(255,214,0,0.3)',
            textAlign: 'center',
          }}
        >
          <div
            style={{
              fontFamily: "'Bangers', display",
              fontSize: '2rem',
              color: '#FFD600',
              marginBottom: '0.3rem',
            }}
          >
            {winnerId ? `${winnerName} WINS!` : 'DRAW!'}
          </div>
          <div
            style={{
              fontSize: '0.85rem',
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 800,
              textTransform: 'uppercase',
              marginBottom: '1rem',
            }}
          >
            {endReason.replace(/_/g, ' ')}
          </div>
          <div
            style={{
              display: 'flex',
              gap: '0.8rem',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={rematch}
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1.3rem',
                textTransform: 'uppercase',
                padding: '0.7rem 2rem',
                background: '#FFD600',
                color: '#111',
                border: '3px solid #111',
                borderRadius: '999px',
                cursor: 'pointer',
                boxShadow: '0 4px 0 #111',
              }}
            >
              Rematch
            </button>
            <a
              href="/#founder"
              style={{
                fontFamily: "'Bangers', display",
                fontSize: '1rem',
                textTransform: 'uppercase',
                padding: '0.7rem 1.5rem',
                background: '#eb4d4b',
                color: '#fff',
                border: '3px solid #111',
                borderRadius: '999px',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
              }}
            >
              Get Founder Pack
            </a>
          </div>
        </div>
      )}

      {/* BYO API Key */}
      <div style={{ marginTop: '1rem' }}>
        <button
          onClick={() => setKeyExpanded(!keyExpanded)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'rgba(255,255,255,0.4)',
            fontSize: '0.8rem',
            fontWeight: 800,
            padding: '0.4rem 0',
          }}
        >
          {'\uD83D\uDD11'} Use your own AI key {keyExpanded ? '\u25B2' : '\u25BC'}
        </button>
        {keyExpanded && (
          <div
            style={{
              marginTop: '0.5rem',
              padding: '0.8rem',
              background: 'rgba(255,255,255,0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <input
              type="password"
              placeholder="OpenAI API key (sk-...)"
              value={llmKey}
              onChange={(e) => saveKey(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem 0.8rem',
                background: '#0f0f0f',
                border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: '6px',
                color: '#fff',
                fontSize: '0.85rem',
                fontFamily: "'IBM Plex Mono', monospace",
              }}
            />
            <div
              style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.3)',
                marginTop: '0.3rem',
              }}
            >
              Stored locally. Passed as header to /api/agent/decide. Hit
              &ldquo;Rematch&rdquo; to use the new key.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
