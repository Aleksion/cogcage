import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  UNIT_SCALE,
  ENERGY_MAX,
  HP_MAX,
  ACTION_TYPES,
  TICK_RATE,
} from '../lib/ws2/index.js';
import { runMatchAsync } from '../lib/ws2/match-runner';
import type { BotConfig, MatchSnapshot } from '../lib/ws2/match-runner';
import type { Session, BracketMatch, LeaderboardEntry, SessionBot } from '../lib/session';

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

/* ── Constants ──────────────────────────────────────────────── */

const GRID_SIZE = 8;

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
  const dark = color === '#2ecc71' ? '#27ae60' : '#c0392b';
  const accent = color === '#2ecc71' ? '#27D9E8' : '#FFD233';
  return (
    <svg viewBox="0 0 40 40" style={{ width: '88%', height: '88%', display: 'block' }}>
      <rect x="12" y="2" width="16" height="10" rx="3" fill={color} stroke="#111" strokeWidth="2" />
      <rect x="15" y="5" width="10" height="4" rx="1.5" fill="#111" />
      <circle cx="18" cy="7" r="1.5" fill={accent} />
      <circle cx="22" cy="7" r="1.5" fill={accent} />
      <rect x="10" y="12" width="20" height="13" rx="2" fill={color} stroke="#111" strokeWidth="2" />
      <rect x="15" y="15" width="10" height="6" rx="1" fill={dark} stroke="#111" strokeWidth="1" />
      <circle cx="20" cy="18" r="2" fill={accent} />
      <rect x="3" y="13" width="7" height="10" rx="3" fill={dark} stroke="#111" strokeWidth="2" />
      <rect x="30" y="13" width="7" height="10" rx="3" fill={dark} stroke="#111" strokeWidth="2" />
      <rect x="12" y="25" width="7" height="10" rx="2" fill={dark} stroke="#111" strokeWidth="2" />
      <rect x="21" y="25" width="7" height="10" rx="2" fill={dark} stroke="#111" strokeWidth="2" />
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

  /* ── Match state ──────────────────────────────────────────── */
  const [currentMatch, setCurrentMatch] = useState<BracketMatch | null>(null);
  const [botAHp, setBotAHp] = useState(HP_MAX);
  const [botBHp, setBotBHp] = useState(HP_MAX);
  const [botAEnergy, setBotAEnergy] = useState(ENERGY_MAX);
  const [botBEnergy, setBotBEnergy] = useState(ENERGY_MAX);
  const [botAPos, setBotAPos] = useState({ x: 1, y: 4 });
  const [botBPos, setBotBPos] = useState({ x: 6, y: 3 });
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [vfxEvents, setVfxEvents] = useState<VfxEvent[]>([]);
  const [arenaFlash, setArenaFlash] = useState(false);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(initialSession.leaderboard || []);

  const abortRef = useRef<AbortController | null>(null);
  const prevEventsLenRef = useRef(0);
  const pollRef = useRef<number | null>(null);

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
            const match = data.bracket.find((m) => m.id === data.currentMatchId);
            if (match) setCurrentMatch(match);
          }
        }
      } catch { /* ignore */ }
    };
    const id = window.setInterval(poll, 3000);
    pollRef.current = id;
    return () => window.clearInterval(id);
  }, [session.status, sessionId]);

  /* ── Poll session when running (non-host) ─────────────────── */
  useEffect(() => {
    if (session.status !== 'running' || isHost) return;

    const poll = async () => {
      try {
        // Poll snapshot
        const snapRes = await fetch(`/api/sessions/${sessionId}/snapshot`);
        if (snapRes.ok) {
          const { snapshot } = await snapRes.json();
          if (snapshot?.snapshot) {
            applyRemoteSnapshot(snapshot);
          }
        }
        // Poll session for leaderboard/status changes
        const sessRes = await fetch(`/api/sessions/${sessionId}`);
        if (sessRes.ok) {
          const data: Session = await sessRes.json();
          setSession(data);
          setLeaderboard(data.leaderboard);
          if (data.currentMatchId) {
            const match = data.bracket.find((m) => m.id === data.currentMatchId);
            if (match) setCurrentMatch(match);
          }
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
    const actorIds = Object.keys(actors).sort();
    const actorA = actors[actorIds[0]];
    const actorB = actors[actorIds[1]];
    if (!actorA || !actorB) return;

    setBotAHp(actorA.hp);
    setBotBHp(actorB.hp);
    setBotAEnergy(actorA.energy);
    setBotBEnergy(actorB.energy);
    setTick(s.tick || 0);

    setBotAPos({
      x: clamp(Math.round(actorA.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
      y: clamp(Math.round(actorA.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
    });
    setBotBPos({
      x: clamp(Math.round(actorB.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
      y: clamp(Math.round(actorB.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
    });
  }, []);

  /* ── VFX helpers ──────────────────────────────────────────── */
  const spawnVfx = useCallback((cell: { x: number; y: number }, text: string, color: string, type: VfxEvent['type'] = 'burst', duration = 600) => {
    const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    setVfxEvents((prev) => [...prev, { id, cell: { ...cell }, text, color, type }]);
    setTimeout(() => setVfxEvents((prev) => prev.filter((e) => e.id !== id)), duration);
  }, []);

  /* ── Host: start tournament ───────────────────────────────── */
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
      // Re-fetch session
      const sessRes = await fetch(`/api/sessions/${sessionId}`);
      if (sessRes.ok) {
        const sess: Session = await sessRes.json();
        setSession(sess);
        setLeaderboard(sess.leaderboard);
        const match = sess.bracket.find((m) => m.id === sess.currentMatchId);
        if (match) {
          setCurrentMatch(match);
          if (isHost) runHostMatch(sess, match);
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  /* ── Host: run a match ────────────────────────────────────── */
  const runHostMatch = useCallback(async (sess: Session, match: BracketMatch) => {
    const pA = sess.participants.find((p) => p.id === match.participantA);
    const pB = sess.participants.find((p) => p.id === match.participantB);
    if (!pA || !pB) return;

    setRunning(true);
    setFeed([]);
    setBotAHp(HP_MAX);
    setBotBHp(HP_MAX);
    setBotAEnergy(ENERGY_MAX);
    setBotBEnergy(ENERGY_MAX);
    setTick(0);
    setVfxEvents([]);
    setArenaFlash(false);
    prevEventsLenRef.current = 0;

    const seed = hashString(`${sess.id}-${match.id}-${Date.now()}`);

    const configA: BotConfig = {
      id: 'botA',
      name: pA.bot.name,
      systemPrompt: pA.bot.systemPrompt,
      loadout: pA.bot.loadout,
      armor: pA.bot.armor,
      position: { x: 1, y: 4 },
      temperature: pA.bot.temperature,
      llmHeaders: pA.bot.llmHeaders || {},
    };

    const configB: BotConfig = {
      id: 'botB',
      name: pB.bot.name,
      systemPrompt: pB.bot.systemPrompt,
      loadout: pB.bot.loadout,
      armor: pB.bot.armor,
      position: { x: 6, y: 3 },
      temperature: pB.bot.temperature,
      llmHeaders: pB.bot.llmHeaders || {},
    };

    setBotAPos({ x: 1, y: 4 });
    setBotBPos({ x: 6, y: 3 });
    setFeed([`Match: ${pA.bot.name} vs ${pB.bot.name}`, `Seed: ${seed}`].reverse());

    const controller = new AbortController();
    abortRef.current = controller;

    const onSnapshot = (snap: MatchSnapshot) => {
      const s = snap.state;
      const actorA = s.actors?.botA;
      const actorB = s.actors?.botB;
      if (!actorA || !actorB) return;

      setBotAHp(actorA.hp);
      setBotBHp(actorB.hp);
      setBotAEnergy(actorA.energy);
      setBotBEnergy(actorB.energy);
      setTick(s.tick);

      setBotAPos({
        x: clamp(Math.round(actorA.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
        y: clamp(Math.round(actorA.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
      });
      setBotBPos({
        x: clamp(Math.round(actorB.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
        y: clamp(Math.round(actorB.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
      });

      // Process events for feed
      const events: any[] = s.events || [];
      const prevLen = prevEventsLenRef.current;
      const newEvents = events.slice(prevLen);
      prevEventsLenRef.current = events.length;

      const aName = pA.bot.name;
      const bName = pB.bot.name;
      const logEntries: string[] = [];
      for (const evt of newEvents) {
        const who = evt.actorId === 'botA' ? aName : bName;
        if (evt.type === 'DAMAGE_APPLIED') {
          const target = evt.targetId === 'botA' ? aName : bName;
          logEntries.push(`[${evt.tick}] ${who} hits ${target} for ${evt.data.amount} dmg`);
        } else if (evt.type === 'ACTION_ACCEPTED' && evt.data?.type !== 'NO_OP') {
          logEntries.push(`[${evt.tick}] ${who} uses ${evt.data.type}`);
        }
      }
      if (logEntries.length) {
        setFeed((prev) => [...logEntries.reverse(), ...prev].slice(0, 50));
      }

      // Push snapshot to server for spectators
      fetch(`/api/sessions/${sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          matchId: match.id,
          botAName: pA.bot.name,
          botBName: pB.bot.name,
          snapshot: snap,
        }),
      }).catch(() => {});

      // Match ended
      if (snap.ended) {
        setRunning(false);
        // Determine winner participant
        const winnerPid = snap.winnerId === 'botA' ? pA.id : snap.winnerId === 'botB' ? pB.id : pA.id;
        const scoreA = actorA.stats?.damageDealt ?? 0;
        const scoreB = actorB.stats?.damageDealt ?? 0;

        // Complete match on server
        fetch(`/api/sessions/${sessionId}/complete`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            matchId: match.id,
            winnerId: winnerPid,
            scoreA,
            scoreB,
            hostParticipantId: participantId,
          }),
        })
          .then((r) => r.json())
          .then(async (result) => {
            setLeaderboard(result.leaderboard);
            if (result.done) {
              // Tournament done
              const sessRes = await fetch(`/api/sessions/${sessionId}`);
              if (sessRes.ok) {
                const freshSess: Session = await sessRes.json();
                setSession(freshSess);
                setLeaderboard(freshSess.leaderboard);
              }
            } else if (result.nextMatchId) {
              // Start next match after a brief pause
              setTimeout(async () => {
                const sessRes = await fetch(`/api/sessions/${sessionId}`);
                if (sessRes.ok) {
                  const freshSess: Session = await sessRes.json();
                  setSession(freshSess);
                  const nextMatch = freshSess.bracket.find((m) => m.id === result.nextMatchId);
                  if (nextMatch) {
                    setCurrentMatch(nextMatch);
                    runHostMatch(freshSess, nextMatch);
                  }
                }
              }, 2000);
            }
          })
          .catch((err) => console.error('Complete match error:', err));
      }
    };

    try {
      await runMatchAsync(seed, configA, configB, onSnapshot, '/api/agent/decide', controller.signal);
    } catch (err) {
      console.error('[match-runner] Error:', err);
      setRunning(false);
    }
  }, [sessionId, participantId, isHost]);

  /* ── Objective zone ───────────────────────────────────────── */
  const objCenterGrid = { x: 5, y: 5 };
  const isInObjectiveZone = (x: number, y: number) => {
    const dx = x - objCenterGrid.x;
    const dy = y - objCenterGrid.y;
    return Math.sqrt(dx * dx + dy * dy) <= 2;
  };

  /* ── Get current match participants ───────────────────────── */
  const getMatchNames = () => {
    if (!currentMatch) return { aName: 'Bot A', bName: 'Bot B' };
    const pA = session.participants.find((p) => p.id === currentMatch.participantA);
    const pB = session.participants.find((p) => p.id === currentMatch.participantB);
    return { aName: pA?.bot.name ?? 'Bot A', bName: pB?.bot.name ?? 'Bot B' };
  };

  const matchTimeSec = (tick / TICK_RATE).toFixed(1);
  const totalMatches = session.bracket.length;
  const completedMatches = session.bracket.filter((m) => m.status === 'done').length;
  const currentMatchIndex = currentMatch ? session.bracket.findIndex((m) => m.id === currentMatch.id) + 1 : 0;

  /* ── Render: Arena ────────────────────────────────────────── */
  const renderArena = () => {
    const { aName, bName } = getMatchNames();
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isA = botAPos.x === x && botAPos.y === y;
        const isB = botBPos.x === x && botBPos.y === y;
        const inObj = isInObjectiveZone(x, y);
        const cellVfx = vfxEvents.filter((e) => e.cell.x === x && e.cell.y === y);
        const className = [
          'arena-cell',
          inObj ? 'objective-zone' : '',
          isA ? 'player' : '',
          isB ? 'enemy' : '',
          cellVfx.length > 0 ? 'cell-vfx-flash' : '',
        ].filter(Boolean).join(' ');

        cells.push(
          <div key={`${x}-${y}`} className={className}>
            {isA && <BotSvg color="#2ecc71" />}
            {isB && <BotSvg color="#eb4d4b" />}
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
              {session.participants.map((p) => (
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
                  <div>
                    <strong>{p.bot.name}</strong>
                    <span className="hint" style={{ marginLeft: '0.5rem' }}>
                      ({p.bot.armor} armor, {p.bot.loadout.length} abilities)
                    </span>
                    {p.id === session.hostParticipantId && (
                      <span className="tactic-chip" style={{ marginLeft: '0.5rem' }}>HOST</span>
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
                {session.participants.length < 2 ? 'Waiting for players...' : 'Start Tournament'}
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
                Match {currentMatchIndex} of {totalMatches}: {getMatchNames().aName} vs {getMatchNames().bName}
              </h2>
              <div className="hint">
                {completedMatches} of {totalMatches} matches completed
                {!isHost && ' (spectating)'}
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

                {/* HP bars */}
                <div className="match-topbar" style={{ marginBottom: '0.5rem' }}>
                  <div style={{ textAlign: 'right', flex: 1 }}>
                    <span className="bot-name" style={{ color: '#2ecc71', fontSize: '1.1rem' }}>{getMatchNames().aName}</span>
                    <div className="bar-shell" style={{ width: '100%', marginTop: '0.2rem' }}>
                      <div className="bar-fill" style={{ width: `${botAHp}%`, background: hpBarGradient(botAHp) }} />
                    </div>
                    <span className="hint" style={{ fontSize: '0.75rem' }}>HP {botAHp}</span>
                  </div>
                  <span className="vs" style={{ fontSize: '1.4rem' }}>VS</span>
                  <div style={{ flex: 1 }}>
                    <span className="bot-name" style={{ color: '#eb4d4b', fontSize: '1.1rem' }}>{getMatchNames().bName}</span>
                    <div className="bar-shell" style={{ width: '100%', marginTop: '0.2rem' }}>
                      <div className="bar-fill" style={{ width: `${botBHp}%`, background: hpBarGradient(botBHp) }} />
                    </div>
                    <span className="hint" style={{ fontSize: '0.75rem' }}>HP {botBHp}</span>
                  </div>
                </div>

                {renderArena()}

                {/* Energy */}
                <div className="energy-row" style={{ marginTop: '0.5rem' }}>
                  <div className="energy-block">
                    <div className="energy-label" style={{ color: '#2ecc71' }}>Energy</div>
                    <div className="bar-shell">
                      <div className="bar-fill" style={{ width: `${(botAEnergy / ENERGY_MAX) * 100}%`, background: 'linear-gradient(90deg, #00e5ff, #0077b6)' }} />
                    </div>
                    <div className="hint" style={{ fontSize: '0.75rem' }}>{Math.round(botAEnergy / 10)}e</div>
                  </div>
                  <div className="energy-block">
                    <div className="energy-label" style={{ color: '#eb4d4b' }}>Energy</div>
                    <div className="bar-shell">
                      <div className="bar-fill" style={{ width: `${(botBEnergy / ENERGY_MAX) * 100}%`, background: 'linear-gradient(90deg, #ff6b6b, #c0392b)' }} />
                    </div>
                    <div className="hint" style={{ fontSize: '0.75rem' }}>{Math.round(botBEnergy / 10)}e</div>
                  </div>
                </div>
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
