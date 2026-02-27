import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  UNIT_SCALE,
  ENERGY_MAX,
  HP_MAX,
  ACTION_TYPES,
  TICK_RATE,
} from '../lib/ws2/index.js';
import { runMatchAsync } from '../lib/ws2/run-match';
import { getSpawnPositions } from '../lib/ws2/match-types';
import type { BotConfig, MatchSnapshot } from '../lib/ws2/match-types';
import type { Session, BracketMatch, LeaderboardEntry, SessionBot, FfaPlacement } from '../lib/session';
import { globalStyles } from '../lib/game-styles';

/* ── Types ──────────────────────────────────────────────────── */

interface Props {
  session: Session;
  participantId: string;
}

type VfxEvent = {
  id: string;
  cell: { x: number; y: number };
  text: string;
  color: string;
  type: 'burst' | 'ring' | 'bolt' | 'ko';
};

interface FfaActorDisplay {
  id: string;
  name: string;
  participantId: string;
  hp: number;
  energy: number;
  pos: { x: number; y: number };
  color: string;
}

/* ── Constants ──────────────────────────────────────────────── */

const GRID_SIZE = 8;

const BOT_COLORS = [
  '#2ecc71', '#eb4d4b', '#3498db', '#f39c12', '#9b59b6',
  '#1abc9c', '#e74c3c', '#2980b9',
];

const ACTION_INFO: Record<string, { label: string; cost: number; desc: string }> = {
  MOVE: { label: 'Move', cost: 4, desc: 'Move 1 cell in any direction' },
  MELEE_STRIKE: { label: 'Melee Strike', cost: 18, desc: 'Close-range hit' },
  RANGED_SHOT: { label: 'Ranged Shot', cost: 14, desc: 'Ranged hit' },
  GUARD: { label: 'Guard', cost: 10, desc: 'Block 35% frontal damage' },
  DASH: { label: 'Dash', cost: 22, desc: 'Leap + 15% next attack' },
  UTILITY: { label: 'Utility', cost: 20, desc: 'Special ability' },
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

/* ── Player Bot SVG ─────────────────────────────────────────── */

const BotSvg = ({ color }: { color: string }) => {
  const dark = '#111';
  return (
    <svg viewBox="0 0 40 40" style={{ width: '88%', height: '88%', display: 'block' }}>
      <rect x="12" y="2" width="16" height="10" rx="3" fill={color} stroke={dark} strokeWidth="2" />
      <rect x="15" y="5" width="10" height="4" rx="1.5" fill={dark} />
      <circle cx="18" cy="7" r="1.5" fill="#fff" />
      <circle cx="22" cy="7" r="1.5" fill="#fff" />
      <rect x="10" y="12" width="20" height="13" rx="2" fill={color} stroke={dark} strokeWidth="2" />
      <circle cx="20" cy="18" r="2" fill="#fff" />
      <rect x="3" y="13" width="7" height="10" rx="3" fill={color} stroke={dark} strokeWidth="2" />
      <rect x="30" y="13" width="7" height="10" rx="3" fill={color} stroke={dark} strokeWidth="2" />
      <rect x="12" y="25" width="7" height="10" rx="2" fill={color} stroke={dark} strokeWidth="2" />
      <rect x="21" y="25" width="7" height="10" rx="2" fill={color} stroke={dark} strokeWidth="2" />
    </svg>
  );
};

/* ── Component ──────────────────────────────────────────────── */

const SessionRoom: React.FC<Props> = ({ session: initialSession, participantId }) => {
  const [session, setSession] = useState<Session>(initialSession);
  const [error, setError] = useState('');

  const isHost = session.hostParticipantId === participantId;
  const sessionId = session.id;

  /* ── Lobby state ──────────────────────────────────────────── */
  const [editBot, setEditBot] = useState<SessionBot | null>(() => {
    const me = initialSession.participants.find((p) => p.id === participantId);
    return me?.bot ?? null;
  });

  /* ── Match state (N-actor) ─────────────────────────────────── */
  const [ffaActors, setFfaActors] = useState<FfaActorDisplay[]>([]);
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [vfxEvents, setVfxEvents] = useState<VfxEvent[]>([]);
  const [arenaFlash, setArenaFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialSession.leaderboard || []);
  const [matchWinner, setMatchWinner] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const prevEventsLenRef = useRef(0);
  const pollRef = useRef<number | null>(null);
  /** Maps bot IDs → participant bot names (set when match starts) */
  const actorNameMapRef = useRef<Map<string, string>>(new Map());

  /* ── Inject global styles ────────────────────────────────── */
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  /* ── Poll session in lobby ────────────────────────────────── */
  useEffect(() => {
    if (session.status !== 'lobby') return;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (res.ok) {
          const data: Session = await res.json();
          setSession(data);
          if (data.status === 'running') {
            setLeaderboard(data.leaderboard);
          }
        }
      } catch { /* ignore */ }
    };
    const id = window.setInterval(poll, 3000);
    pollRef.current = id;
    return () => window.clearInterval(id);
  }, [session.status, sessionId]);

  /* ── Auto-start host FFA when session transitions to running ── */
  useEffect(() => {
    if (session.status !== 'running' || !isHost || running || ffaActors.length > 0) return;
    runHostFfa(session);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.status, isHost]);

  /* ── Poll session when running (non-host spectators) ──────── */
  useEffect(() => {
    if (session.status !== 'running' || isHost) return;

    const poll = async () => {
      try {
        const snapRes = await fetch(`/api/sessions/${sessionId}/snapshot`);
        if (snapRes.ok) {
          const { snapshot } = await snapRes.json();
          if (snapshot?.snapshot) {
            applyRemoteSnapshot(snapshot);
          }
        }
        const sessRes = await fetch(`/api/sessions/${sessionId}`);
        if (sessRes.ok) {
          const data: Session = await sessRes.json();
          setSession(data);
          setLeaderboard(data.leaderboard);
        }
      } catch { /* ignore */ }
    };
    const id = window.setInterval(poll, 500);
    return () => window.clearInterval(id);
  }, [session.status, sessionId, isHost]);

  /* ── Remote snapshot handler (spectators) ─────────────────── */
  const applyRemoteSnapshot = useCallback((data: any) => {
    const snap = data.snapshot;
    if (!snap?.state) return;
    const s = snap.state;
    const actors = s.actors || {};
    const botNames: Record<string, string> = data.botNames || {};

    const actorList: FfaActorDisplay[] = Object.keys(actors).sort().map((id, i) => {
      const actor = actors[id];
      return {
        id,
        name: botNames[id] || id,
        participantId: id,
        hp: actor.hp,
        energy: actor.energy,
        pos: {
          x: clamp(Math.round(actor.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
          y: clamp(Math.round(actor.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
        },
        color: BOT_COLORS[i % BOT_COLORS.length],
      };
    });
    setFfaActors(actorList);
    setTick(s.tick || 0);

    if (snap.ended && snap.winnerId) {
      setMatchWinner(snap.winnerId);
    }
  }, []);

  /* ── VFX helpers ──────────────────────────────────────────── */
  const spawnVfx = useCallback((cell: { x: number; y: number }, text: string, color: string, type: VfxEvent['type'] = 'burst', duration = 600) => {
    const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setVfxEvents((prev) => [...prev, { id, cell: { ...cell }, text, color, type }]);
    setTimeout(() => setVfxEvents((prev) => prev.filter((e) => e.id !== id)), duration);
  }, []);

  /* ── Host: start FFA ────────────────────────────────────────── */
  const handleStart = async () => {
    setError('');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ hostParticipantId: participantId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to start');
        return;
      }
      const sessRes = await fetch(`/api/sessions/${sessionId}`);
      if (sessRes.ok) {
        const sess: Session = await sessRes.json();
        setSession(sess);
        setLeaderboard(sess.leaderboard);
        if (isHost) runHostFfa(sess);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  /* ── Host: run FFA match with ALL participants ──────────────── */
  const runHostFfa = useCallback(async (sess: Session) => {
    const participants = sess.participants;
    if (participants.length < 2) return;

    setRunning(true);
    setFeed([]);
    setTick(0);
    setVfxEvents([]);
    setArenaFlash(false);
    setMatchWinner(null);
    prevEventsLenRef.current = 0;

    const seed = hashString(`${sess.id}-ffa-${Date.now()}`);
    const positions = getSpawnPositions(participants.length);

    // Build bot configs — use participant IDs as bot IDs for easy mapping
    const bots: BotConfig[] = participants.map((p, i) => ({
      id: p.id,
      name: p.bot.name,
      systemPrompt: p.bot.systemPrompt,
      loadout: p.bot.loadout,
      armor: p.bot.armor,
      position: positions[i],
      temperature: p.bot.temperature,
      llmHeaders: p.bot.llmHeaders || {},
    }));

    // Build name map and initial actor display states
    const nameMap = new Map<string, string>();
    const initialActors: FfaActorDisplay[] = bots.map((bot, i) => {
      nameMap.set(bot.id, bot.name);
      return {
        id: bot.id,
        name: bot.name,
        participantId: bot.id,
        hp: HP_MAX,
        energy: ENERGY_MAX,
        pos: positions[i],
        color: BOT_COLORS[i % BOT_COLORS.length],
      };
    });
    actorNameMapRef.current = nameMap;
    setFfaActors(initialActors);

    const botNamesRecord: Record<string, string> = {};
    for (const bot of bots) botNamesRecord[bot.id] = bot.name;

    const matchLabel = participants.map((p) => p.bot.name).join(' vs ');
    setFeed([`FFA Match: ${matchLabel}`, `Seed: ${seed}`, `${participants.length} bots enter the arena`].reverse());

    const controller = new AbortController();
    abortRef.current = controller;

    const onSnapshot = (snap: MatchSnapshot) => {
      const s = snap.state;
      const actors = s.actors || {};
      const actorIds = Object.keys(actors).sort();

      // Update actor display states
      const updatedActors: FfaActorDisplay[] = actorIds.map((id, i) => {
        const actor = actors[id];
        return {
          id,
          name: nameMap.get(id) || id,
          participantId: id,
          hp: actor.hp,
          energy: actor.energy,
          pos: {
            x: clamp(Math.round(actor.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
            y: clamp(Math.round(actor.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
          },
          color: BOT_COLORS[bots.findIndex((b) => b.id === id) % BOT_COLORS.length],
        };
      });
      setFfaActors(updatedActors);
      setTick(s.tick);

      // Process events for feed
      const events: any[] = s.events || [];
      const prevLen = prevEventsLenRef.current;
      const newEvents = events.slice(prevLen);
      prevEventsLenRef.current = events.length;

      const logEntries: string[] = [];
      for (const evt of newEvents) {
        const who = nameMap.get(evt.actorId) || evt.actorId;
        if (evt.type === 'DAMAGE_APPLIED') {
          const target = nameMap.get(evt.targetId) || evt.targetId;
          logEntries.push(`[${evt.tick}] ${who} hits ${target} for ${evt.data.amount} dmg`);
        } else if (evt.type === 'ACTION_ACCEPTED' && evt.data?.type !== 'NO_OP') {
          logEntries.push(`[${evt.tick}] ${who} uses ${evt.data.type}`);
        } else if (evt.type === 'MATCH_END') {
          const winnerName = snap.winnerId ? (nameMap.get(snap.winnerId) || snap.winnerId) : 'Nobody';
          logEntries.push(`[${evt.tick}] MATCH END - ${winnerName} wins!`);
        }
      }
      if (logEntries.length) {
        setFeed((prev) => [...logEntries.reverse(), ...prev].slice(0, 80));
      }

      // VFX for damage events
      for (const evt of newEvents) {
        if (evt.type === 'DAMAGE_APPLIED') {
          const targetActor = updatedActors.find((a) => a.id === evt.targetId);
          if (targetActor) {
            spawnVfx(targetActor.pos, 'HIT!', targetActor.color, 'burst', 500);
          }
        }
        if (evt.type === 'MATCH_END') {
          setArenaFlash(true);
          setTimeout(() => setArenaFlash(false), 600);
        }
      }

      // Push snapshot to server for spectators
      fetch(`/api/sessions/${sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          matchId: 'ffa',
          botNames: botNamesRecord,
          snapshot: snap,
        }),
      }).catch(() => {});

      // Match ended
      if (snap.ended) {
        setRunning(false);
        setMatchWinner(snap.winnerId);

        // Build placements from final actor states
        const actorEntries = Object.entries(actors)
          .map(([id, actor]: [string, any]) => ({
            participantId: id,
            hp: actor.hp as number,
            damageDealt: (actor.stats?.damageDealt ?? 0) as number,
            alive: actor.hp > 0,
          }))
          .sort((a, b) => {
            // Alive bots ranked higher, then by HP, then by damage
            if (a.alive !== b.alive) return a.alive ? -1 : 1;
            if (a.hp !== b.hp) return b.hp - a.hp;
            return b.damageDealt - a.damageDealt;
          });

        const placements: FfaPlacement[] = actorEntries.map((e, i) => ({
          participantId: e.participantId,
          placement: i + 1,
          damageDealt: e.damageDealt,
          hp: e.hp,
        }));

        // Complete FFA match on server
        fetch(`/api/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            matchId: 'ffa',
            winnerId: snap.winnerId,
            placements,
            hostParticipantId: participantId,
          }),
        })
          .then((r) => r.json())
          .then(async (result) => {
            setLeaderboard(result.leaderboard);
            const sessRes = await fetch(`/api/sessions/${sessionId}`);
            if (sessRes.ok) {
              const freshSess: Session = await sessRes.json();
              setSession(freshSess);
              setLeaderboard(freshSess.leaderboard);
            }
          })
          .catch((err) => console.error('Complete FFA error:', err));
      }
    };

    try {
      await runMatchAsync(seed, bots, onSnapshot, '/api/agent/decide', controller.signal);
    } catch (err) {
      console.error('[match-runner] Error:', err);
      setRunning(false);
    }
  }, [sessionId, participantId, isHost, spawnVfx]);

  /* ── Objective zone ───────────────────────────────────────── */
  const objCenterGrid = { x: 5, y: 5 };
  const isInObjectiveZone = (x: number, y: number) => {
    const dx = x - objCenterGrid.x;
    const dy = y - objCenterGrid.y;
    return Math.sqrt(dx * dx + dy * dy) <= 2;
  };

  const matchTimeSec = (tick / TICK_RATE).toFixed(1);
  const aliveCount = ffaActors.filter((a) => a.hp > 0).length;

  /* ── Render: Arena ────────────────────────────────────────── */
  const renderArena = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const actorHere = ffaActors.find((a) => a.pos.x === x && a.pos.y === y && a.hp > 0);
        const inObj = isInObjectiveZone(x, y);
        const cellVfx = vfxEvents.filter((e) => e.cell.x === x && e.cell.y === y);

        const classNames = [
          'arena-cell',
          inObj ? 'objective-zone' : '',
          actorHere ? 'has-bot' : '',
          cellVfx.length > 0 ? 'cell-vfx-flash' : '',
        ].filter(Boolean).join(' ');

        cells.push(
          <div
            key={`${x}-${y}`}
            className={classNames}
            style={actorHere ? {
              background: `${actorHere.color}22`,
              borderColor: actorHere.color,
              padding: '3px',
            } : undefined}
          >
            {actorHere && <BotSvg color={actorHere.color} />}
            {cellVfx.map((vfx) => (
              <div key={vfx.id} className={`vfx-popup ${vfx.type}`}>
                <span style={{ color: vfx.color }}>{vfx.text}</span>
              </div>
            ))}
          </div>
        );
      }
    }
    return (
      <div
        className={`arena-map${arenaFlash ? ' arena-flash' : ''}`}
        style={{ ['--grid-size' as string]: GRID_SIZE }}
      >
        {cells}
      </div>
    );
  };

  /* ── Render: HP Bars (N actors) ──────────────────────────── */
  const renderHpBars = () => (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginBottom: '0.5rem', justifyContent: 'center' }}>
      {ffaActors.map((actor) => (
        <div key={actor.id} style={{ flex: '1 1 120px', maxWidth: '180px', minWidth: '100px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.15rem' }}>
            <span style={{ fontFamily: 'var(--f-display)', fontSize: '0.85rem', color: actor.color, textTransform: 'uppercase' }}>
              {actor.name}
            </span>
            <span className="hint" style={{ fontSize: '0.7rem' }}>{actor.hp > 0 ? `HP ${actor.hp}` : 'K.O.'}</span>
          </div>
          <div className="bar-shell" style={{ width: '100%', height: '12px' }}>
            <div className="bar-fill" style={{ width: `${actor.hp}%`, background: actor.hp > 0 ? hpBarGradient(actor.hp) : '#333' }} />
          </div>
        </div>
      ))}
    </div>
  );

  /* ── Render: Leaderboard ──────────────────────────────────── */
  const renderLeaderboard = () => (
    <div style={{ marginTop: '1rem' }}>
      <div className="section-label">Leaderboard</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid var(--c-dark)', fontWeight: 900, textTransform: 'uppercase', fontSize: '0.8rem' }}>
            <td style={{ padding: '0.4rem' }}>#</td>
            <td style={{ padding: '0.4rem' }}>Name</td>
            <td style={{ padding: '0.4rem', textAlign: 'center' }}>W</td>
            <td style={{ padding: '0.4rem', textAlign: 'center' }}>L</td>
            <td style={{ padding: '0.4rem', textAlign: 'center' }}>Pts</td>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, i) => (
            <tr key={entry.participantId} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '0.4rem', fontWeight: 900 }}>{i + 1}</td>
              <td style={{ padding: '0.4rem' }}>{entry.name}</td>
              <td style={{ padding: '0.4rem', textAlign: 'center', color: '#2ecc71' }}>{entry.wins}</td>
              <td style={{ padding: '0.4rem', textAlign: 'center', color: '#eb4d4b' }}>{entry.losses}</td>
              <td style={{ padding: '0.4rem', textAlign: 'center', fontWeight: 900 }}>{entry.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  /* ══════════════════════════════════════════════════════════════
     RENDER
     ══════════════════════════════════════════════════════════════ */

  return (
    <div className="play-root">
      <div className="bg-scanlines" />
      <header className="play-header">
        <a className="logo" href="/">COG CAGE</a>
        <div className="header-links">
          <a className="header-link" href="/">Home</a>
          <a className="header-link" href="/play">Play</a>
          <span className="header-link active">Session</span>
        </div>
      </header>

      {/* ======================== LOBBY ======================== */}
      {session.status === 'lobby' && (
        <main className="play-shell">
          <div className="lobby-container">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '2.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                FFA Tournament Lobby
              </h2>
              <p className="hint">Share the code below so others can join. Configure your bot, then the host starts the tournament.</p>
            </div>

            {/* Join code */}
            <div className="panel" style={{ textAlign: 'center', maxWidth: '500px', margin: '0 auto 1.5rem' }}>
              <div className="section-label">Join Code</div>
              <div
                style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '3rem',
                  letterSpacing: '8px',
                  color: 'var(--c-red)',
                  cursor: 'pointer',
                  userSelect: 'all',
                }}
                title="Click to copy"
                onClick={() => navigator.clipboard?.writeText(session.code)}
              >
                {session.code}
              </div>
              <div className="hint" style={{ marginTop: '0.3rem' }}>
                Join URL: {typeof window !== 'undefined' ? `${window.location.origin}/join/${session.code}` : `/join/${session.code}`}
              </div>
            </div>

            {/* Participants */}
            <div className="panel" style={{ maxWidth: '700px', margin: '0 auto 1.5rem' }}>
              <div className="section-label">Participants ({session.participants.length})</div>
              {session.participants.map((p, i) => (
                <div
                  key={p.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '0.5rem 0',
                    borderBottom: '1px solid #eee',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: BOT_COLORS[i % BOT_COLORS.length] }} />
                    <strong>{p.bot.name}</strong>
                    <span className="hint">
                      ({p.bot.armor} armor, {p.bot.loadout.length} abilities)
                    </span>
                    {p.id === session.hostParticipantId && (
                      <span className="tactic-chip">HOST</span>
                    )}
                  </div>
                  <div className="hint">{p.name}</div>
                </div>
              ))}
            </div>

            {/* Edit my bot */}
            {editBot && (
              <div className="panel" style={{ maxWidth: '700px', margin: '0 auto 1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem' }}>Your Bot Config</h2>
                <div className="bot-config-card">
                  <h3>Identity</h3>
                  <input
                    className="prompt-box"
                    style={{ minHeight: 'unset', height: '40px', marginBottom: '0.5rem' }}
                    placeholder="Bot name"
                    value={editBot.name}
                    onChange={(e) => setEditBot({ ...editBot, name: e.target.value })}
                  />
                  <div className="section-label" style={{ marginTop: '0.6rem' }}>System Prompt</div>
                  <textarea
                    className="prompt-box"
                    style={{ minHeight: '80px', marginBottom: '0.6rem', fontSize: '0.85rem' }}
                    value={editBot.systemPrompt}
                    onChange={(e) => setEditBot({ ...editBot, systemPrompt: e.target.value })}
                  />
                  <div className="section-label">Loadout</div>
                  <div className="loadout-grid">
                    {ACTION_TYPES.map((action: string) => {
                      const info = ACTION_INFO[action];
                      if (!info) return null;
                      const isMove = action === 'MOVE';
                      const checked = editBot.loadout.includes(action);
                      return (
                        <label key={action} className="loadout-item">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={isMove}
                            onChange={(e) => {
                              if (isMove) return;
                              const newLoadout = e.target.checked
                                ? [...editBot.loadout, action]
                                : editBot.loadout.filter((a) => a !== action);
                              setEditBot({ ...editBot, loadout: newLoadout });
                            }}
                          />
                          <span><strong>{info.label}</strong> ({info.cost}e)</span>
                        </label>
                      );
                    })}
                  </div>
                  <div className="section-label" style={{ marginTop: '0.6rem' }}>Armor</div>
                  <div className="armor-radios">
                    {(['light', 'medium', 'heavy'] as const).map((a) => (
                      <label key={a}>
                        <input
                          type="radio"
                          name="my-armor"
                          checked={editBot.armor === a}
                          onChange={() => setEditBot({ ...editBot, armor: a })}
                        />
                        {a.charAt(0).toUpperCase() + a.slice(1)}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Host: Start */}
            {isHost && (
              <button
                className="cta-btn enter-arena-btn"
                onClick={handleStart}
                disabled={session.participants.length < 2}
              >
                {session.participants.length < 2 ? 'Waiting for players...' : `Start FFA (${session.participants.length} bots)`}
              </button>
            )}
            {!isHost && (
              <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                <span className="hint">Waiting for host to start the tournament...</span>
              </div>
            )}

            {error && (
              <div style={{ color: 'var(--c-red)', fontWeight: 800, textAlign: 'center', marginTop: '0.5rem' }}>{error}</div>
            )}
          </div>
        </main>
      )}

      {/* ======================== MATCH ======================== */}
      {session.status === 'running' && (
        <main className="play-shell">
          <div className="lobby-container">
            {/* Match header */}
            <div style={{ textAlign: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '1.8rem', textTransform: 'uppercase' }}>
                FFA Arena — {ffaActors.length} Bots ({aliveCount} alive)
              </h2>
              <div className="hint">
                {!isHost && '(spectating) '}Last bot standing wins
              </div>
            </div>

            <div className="match-grid">
              {/* Arena */}
              <section className="panel">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                  <h2 style={{ marginBottom: 0, fontSize: '1.3rem' }}>Arena</h2>
                  <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <span className="turn-counter">Tick {tick}</span>
                    <span className="arena-badge">{matchTimeSec}s</span>
                  </div>
                </div>

                {/* HP bars for all actors */}
                {renderHpBars()}

                {renderArena()}

                {/* Energy bars */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.5rem', justifyContent: 'center' }}>
                  {ffaActors.filter((a) => a.hp > 0).map((actor) => (
                    <div key={actor.id} style={{ flex: '1 1 100px', maxWidth: '160px', textAlign: 'center' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: 900, textTransform: 'uppercase', color: actor.color, marginBottom: '0.1rem' }}>
                        {actor.name} Energy
                      </div>
                      <div className="bar-shell" style={{ height: '10px' }}>
                        <div className="bar-fill" style={{ width: `${(actor.energy / ENERGY_MAX) * 100}%`, background: `linear-gradient(90deg, ${actor.color}88, ${actor.color})` }} />
                      </div>
                      <div className="hint" style={{ fontSize: '0.65rem' }}>{Math.round(actor.energy / 10)}e</div>
                    </div>
                  ))}
                </div>

                {/* Winner display */}
                {matchWinner && (
                  <div style={{
                    textAlign: 'center',
                    marginTop: '1rem',
                    padding: '1rem',
                    background: 'rgba(255,214,0,0.1)',
                    border: '3px solid var(--c-yellow)',
                    borderRadius: '12px',
                  }}>
                    <div style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', color: 'var(--c-yellow)', textTransform: 'uppercase' }}>
                      Winner: {actorNameMapRef.current.get(matchWinner) || ffaActors.find((a) => a.id === matchWinner)?.name || matchWinner}
                    </div>
                  </div>
                )}
              </section>

              {/* Sidebar */}
              <section className="panel match-sidebar">
                {renderLeaderboard()}

                <div className="section-label" style={{ marginTop: '1rem' }}>Combat Log</div>
                <div className="feed" style={{ maxHeight: '300px' }}>
                  {feed.length === 0 && (
                    <div className="feed-item">Waiting for match to start...</div>
                  )}
                  {feed.map((entry, index) => (
                    <div key={`${index}-${entry.slice(0, 20)}`} className="feed-item">{entry}</div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </main>
      )}

      {/* ======================== DONE ======================== */}
      {session.status === 'done' && (
        <main className="play-shell">
          <div className="lobby-container">
            <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
              <h2 style={{
                fontFamily: 'var(--f-display)',
                fontSize: '3rem',
                textTransform: 'uppercase',
                color: 'var(--c-yellow)',
                textShadow: '3px 3px 0 var(--c-dark)',
              }}>
                Tournament Complete!
              </h2>
              {leaderboard.length > 0 && (
                <div style={{
                  fontFamily: 'var(--f-display)',
                  fontSize: '1.6rem',
                  marginTop: '0.5rem',
                }}>
                  Winner: {leaderboard[0].name}
                </div>
              )}
            </div>

            <div className="panel" style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>
              {renderLeaderboard()}
            </div>

            <div style={{ textAlign: 'center' }}>
              <button
                className="cta-btn"
                onClick={() => {
                  window.location.href = '/play';
                }}
              >
                Play Again
              </button>
            </div>
          </div>
        </main>
      )}
    </div>
  );
};

export default SessionRoom;
