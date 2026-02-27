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

/* ============================================================
   STYLES — same CSS vars / fonts as Play.tsx
   ============================================================ */

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

  .sr-root { min-height: 100vh; position: relative; overflow-x: hidden; }
  .bg-scanlines {
    position: fixed; inset: 0; pointer-events: none; opacity: 0.12; z-index: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px);
  }

  .sr-header {
    position: sticky; top: 0; z-index: 5;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 1.5rem 2.5rem;
    background: rgba(255,255,255,0.9);
    border-bottom: 4px solid var(--c-dark);
    backdrop-filter: blur(8px);
  }
  .logo { font-family: var(--f-display); font-size: 2.2rem; text-decoration: none; color: var(--c-red); text-shadow: 2px 2px 0px var(--c-dark); }
  .header-links { display: flex; gap: 1rem; align-items: center; }
  .header-link { font-weight: 800; text-transform: uppercase; text-decoration: none; color: var(--c-dark); padding: 0.5rem 1rem; border: 3px solid var(--c-dark); border-radius: 999px; background: var(--c-white); box-shadow: var(--shadow-hard); font-size: 0.95rem; }

  .sr-shell { position: relative; z-index: 1; padding: 2.5rem 3rem 3.5rem; max-width: 1100px; margin: 0 auto; }
  .panel { background: var(--c-white); border: 3px solid var(--c-dark); border-radius: var(--radius); box-shadow: var(--shadow-hard); padding: 2rem; }
  .panel h2 { font-family: var(--f-display); font-size: 2rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; }
  .section-label { font-weight: 900; text-transform: uppercase; font-size: 0.9rem; margin-bottom: 0.5rem; letter-spacing: 1px; }
  .prompt-box { width: 100%; min-height: 72px; resize: vertical; border: 3px solid var(--c-dark); border-radius: 12px; padding: 0.75rem 1rem; font-family: var(--f-body); font-size: 1rem; }
  .hint { font-size: 0.9rem; opacity: 0.7; }

  .cta-btn {
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--f-display); font-size: 1.3rem; text-transform: uppercase;
    padding: 0.9rem 2.5rem; background: var(--c-red); color: var(--c-white);
    border: 4px solid var(--c-dark); border-radius: 999px; box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer; transition: transform 0.1s ease;
  }
  .cta-btn:active { transform: translateY(4px); box-shadow: none; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .action-btn { border: 3px solid var(--c-dark); border-radius: 12px; background: var(--c-yellow); font-weight: 900; padding: 0.65rem 0.5rem; cursor: pointer; font-size: 0.95rem; text-transform: uppercase; }
  .action-btn.secondary { background: var(--c-white); }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .status-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 900; padding: 0.35rem 0.8rem; border-radius: 999px; border: 2px solid var(--c-dark); background: var(--c-white); font-size: 0.85rem; }

  .bot-config-card { background: rgba(255,214,0,0.07); border: 2px dashed var(--c-yellow); border-radius: 10px; padding: 0.9rem; margin-bottom: 1rem; }
  .bot-config-card h3 { font-family: var(--f-display); font-size: 1.2rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.6rem; }
  .loadout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin: 0.5rem 0; }
  .loadout-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
  .loadout-item input[type="checkbox"] { accent-color: var(--c-yellow); width: 18px; height: 18px; }
  .armor-radios { display: flex; gap: 0.8rem; margin: 0.4rem 0; }
  .armor-radios label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
  .armor-radios input[type="radio"] { accent-color: var(--c-yellow); }

  .join-code-display {
    font-family: var(--f-display); font-size: 3rem; letter-spacing: 6px;
    color: var(--c-cyan); text-shadow: 3px 3px 0 var(--c-dark);
    text-align: center; margin: 1rem 0;
  }

  .participant-list { list-style: none; padding: 0; margin: 1rem 0; }
  .participant-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.7rem 1rem; border-bottom: 2px solid rgba(0,0,0,0.08);
  }
  .participant-item:last-child { border-bottom: none; }
  .participant-name { font-weight: 800; font-size: 1.1rem; }
  .participant-badge { font-size: 0.75rem; font-weight: 900; text-transform: uppercase; padding: 0.2rem 0.6rem; border-radius: 999px; border: 2px solid var(--c-dark); }

  .match-header {
    text-align: center; margin-bottom: 1.5rem;
    font-family: var(--f-display); font-size: 1.4rem;
    text-transform: uppercase; letter-spacing: 1px;
  }
  .match-header .vs { color: var(--c-red); font-size: 2rem; margin: 0 0.5rem; }

  .leaderboard-table { width: 100%; border-collapse: collapse; font-size: 0.95rem; }
  .leaderboard-table th { font-weight: 900; text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; padding: 0.5rem; text-align: left; border-bottom: 3px solid var(--c-dark); }
  .leaderboard-table td { padding: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.1); }
  .leaderboard-table tr:first-child td { font-weight: 800; }

  .sr-match-layout { display: grid; grid-template-columns: 1fr 300px; gap: 2rem; }

  .stat-block { margin-bottom: 1.2rem; }
  .stat-title { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 0.35rem; }
  .bar-shell { height: 16px; background: #101010; border-radius: 999px; overflow: hidden; border: 2px solid var(--c-dark); }
  .bar-fill { height: 100%; transition: width 0.35s ease, background 0.35s ease; }

  .feed {
    background: #0f0f0f; color: #f5f5f5; border-radius: 12px; border: 3px solid var(--c-dark);
    padding: 1rem; max-height: 320px; overflow-y: auto; font-size: 0.95rem; line-height: 1.5;
  }
  .feed-item { padding: 0.6rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .feed-item:last-child { border-bottom: none; }

  .ko-overlay { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.92); overflow: hidden; }
  .ko-radial-bg { position: absolute; width: 250%; height: 250%; top: -75%; left: -75%; background: repeating-conic-gradient(from 0deg, #FFD233 0deg 5deg, #111 5deg 10deg); animation: ko-spin 20s linear infinite; opacity: 0.15; pointer-events: none; }
  .ko-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2rem; }
  .ko-title { font-family: var(--f-display); font-size: 5rem; color: #FFD233; text-shadow: 4px 4px 0px #111; text-transform: uppercase; }
  .ko-btn { font-family: var(--f-display); font-size: 1.4rem; text-transform: uppercase; padding: 0.9rem 2.5rem; background: #FFD233; color: #111; border: 4px solid #111; border-radius: 999px; box-shadow: 0 6px 0 #111; cursor: pointer; }
  .ko-btn:active { transform: translateY(4px); box-shadow: none; }
  .ko-btn.secondary { background: #fff; }

  @keyframes ko-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

  @media (max-width: 960px) {
    .sr-header { flex-direction: column; align-items: flex-start; }
    .sr-shell { padding: 2rem 1.5rem 3rem; }
    .sr-match-layout { grid-template-columns: 1fr; }
  }
  @media (max-width: 640px) {
    .sr-header { padding: 1.2rem; }
    .logo { font-size: 1.8rem; }
    .panel { padding: 1.5rem; }
    .cta-btn { width: 100%; }
    .join-code-display { font-size: 2rem; letter-spacing: 3px; }
  }
`;

/* --- Types --- */

type SessionParticipant = {
  id: string;
  name: string;
  bot: {
    systemPrompt: string;
    loadout: string[];
    armor: 'light' | 'medium' | 'heavy';
    temperature: number;
  };
};

type BracketMatch = {
  matchId: string;
  botA: string;
  botB: string;
  status: 'pending' | 'running' | 'done';
  winnerId: string | null;
  scoreA: number;
  scoreB: number;
};

type LeaderboardEntry = {
  participantId: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
  hpTotal: number;
};

type Session = {
  id: string;
  code: string;
  status: 'lobby' | 'running' | 'done';
  hostId: string;
  participants: SessionParticipant[];
  bracket: BracketMatch[];
  leaderboard: LeaderboardEntry[];
  currentMatchId: string | null;
  createdAt: number;
};

const ACTION_INFO: Record<string, { label: string; cost: number; desc: string }> = {
  MOVE: { label: 'Move', cost: 4, desc: 'Move 1 cell' },
  MELEE_STRIKE: { label: 'Melee', cost: 18, desc: '22 base dmg, range 1.5' },
  RANGED_SHOT: { label: 'Ranged', cost: 14, desc: '16 base dmg, range 2-10' },
  GUARD: { label: 'Guard', cost: 10, desc: 'Block 35% frontal' },
  DASH: { label: 'Dash', cost: 22, desc: 'Leap 3 units' },
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

/* ============================================================
   COMPONENT
   ============================================================ */

interface SessionRoomProps {
  sessionId: string;
}

const SessionRoom: React.FC<SessionRoomProps> = ({ sessionId }) => {
  // --- Identity (stored in sessionStorage) ---
  const [participantId, setParticipantId] = useState<string | null>(null);
  const [isHost, setIsHost] = useState(false);

  // --- Session data ---
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- Bot config for joining ---
  const [botConfig, setBotConfig] = useState({
    name: '',
    systemPrompt: 'You are an aggressive fighter. Close distance and strike hard.',
    loadout: ['MOVE', 'MELEE_STRIKE', 'GUARD', 'DASH'],
    armor: 'medium' as const,
    temperature: 0.7,
  });
  const [joinName, setJoinName] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [joining, setJoining] = useState(false);
  const [hasJoined, setHasJoined] = useState(false);

  // --- Match state ---
  const [botAHp, setBotAHp] = useState(HP_MAX);
  const [botBHp, setBotBHp] = useState(HP_MAX);
  const [tick, setTick] = useState(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [matchRunning, setMatchRunning] = useState(false);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  // --- Snapshot (for spectators) ---
  const [remoteSnapshot, setRemoteSnapshot] = useState<any>(null);

  // --- PlayCanvas ---
  const [pcActive, setPcActive] = useState(false);
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<any>(null);

  // --- Refs ---
  const abortRef = useRef<AbortController | null>(null);
  const prevEventsLenRef = useRef(0);
  const matchRunningRef = useRef(false);

  // --- Effects ---
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  // Load participantId from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem(`session-${sessionId}-pid`);
    if (stored) {
      setParticipantId(stored);
      setHasJoined(true);
    }
  }, [sessionId]);

  // Poll session data
  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}`);
        if (!res.ok) {
          setError('Session not found or expired');
          return;
        }
        const data = await res.json();
        if (active) {
          setSession(data.session);
          if (participantId && data.session.hostId === participantId) {
            setIsHost(true);
          }
        }
      } catch {
        if (active) setError('Failed to load session');
      }
    };

    poll();
    const interval = setInterval(poll, 2000);
    return () => { active = false; clearInterval(interval); };
  }, [sessionId, participantId]);

  // Poll snapshots during match phase (for spectators)
  useEffect(() => {
    if (!session || session.status !== 'running') return;
    // Host doesn't need to poll snapshots — it produces them
    if (isHost && matchRunningRef.current) return;

    let active = true;
    const poll = async () => {
      try {
        const res = await fetch(`/api/sessions/${sessionId}/snapshot`);
        if (res.ok) {
          const data = await res.json();
          if (active && data.snapshot) {
            setRemoteSnapshot(data);
            // Update HP from remote snapshot
            const s = data.snapshot?.state;
            if (s?.actors) {
              const actors = Object.values(s.actors) as any[];
              if (actors[0]) setBotAHp(actors[0].hp);
              if (actors[1]) setBotBHp(actors[1].hp);
              setTick(s.tick || 0);
            }
          }
        }
      } catch { /* ignore */ }
    };

    poll();
    const interval = setInterval(poll, 500);
    return () => { active = false; clearInterval(interval); };
  }, [session?.status, sessionId, isHost]);

  // PlayCanvas lifecycle
  useEffect(() => {
    if (!session || session.status !== 'running') return;
    if (!playCanvasRef.current) return;

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
    }).catch(() => setPcActive(false));

    return () => {
      destroyed = true;
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
      setPcActive(false);
    };
  }, [session?.status]);

  // Forward remote snapshots to PlayCanvas
  useEffect(() => {
    if (!remoteSnapshot?.snapshot || !sceneRef.current) return;
    sceneRef.current.update?.(remoteSnapshot.snapshot);
  }, [remoteSnapshot]);

  // --- Host match runner ---
  const runNextMatch = useCallback(async (sess: Session, matchIdx: number) => {
    const bracket = sess.bracket;
    const match = bracket[matchIdx];
    if (!match || match.status === 'done') return;

    const pA = sess.participants.find((p) => p.id === match.botA);
    const pB = sess.participants.find((p) => p.id === match.botB);
    if (!pA || !pB) return;

    setMatchRunning(true);
    matchRunningRef.current = true;
    setCurrentMatchIndex(matchIdx);
    setBotAHp(HP_MAX);
    setBotBHp(HP_MAX);
    setTick(0);
    setFeed([`Match ${matchIdx + 1}: ${pA.name} vs ${pB.name}`]);
    prevEventsLenRef.current = 0;

    const seed = hashString(`${sess.id}-${match.matchId}`) || 1;

    const configA: BotConfig = {
      id: 'botA',
      name: pA.name,
      systemPrompt: pA.bot.systemPrompt,
      loadout: pA.bot.loadout,
      armor: pA.bot.armor,
      position: { x: 1, y: 4 },
      temperature: pA.bot.temperature,
    };

    const configB: BotConfig = {
      id: 'botB',
      name: pB.name,
      systemPrompt: pB.bot.systemPrompt,
      loadout: pB.bot.loadout,
      armor: pB.bot.armor,
      position: { x: 6, y: 3 },
      temperature: pB.bot.temperature,
    };

    const controller = new AbortController();
    abortRef.current = controller;

    const handleSnapshot = async (snap: MatchSnapshot) => {
      sceneRef.current?.update?.(snap);

      const s = snap.state;
      const actorA = s.actors?.botA;
      const actorB = s.actors?.botB;
      if (actorA) setBotAHp(actorA.hp);
      if (actorB) setBotBHp(actorB.hp);
      if (s.tick) setTick(s.tick);

      // Process events for feed
      const events: any[] = s.events || [];
      const prevLen = prevEventsLenRef.current;
      const newEvents = events.slice(prevLen);
      prevEventsLenRef.current = events.length;

      const logEntries = newEvents.map((evt: any) => {
        const who = evt.actorId === 'botA' ? pA.name : pB.name;
        const t = evt.tick ?? '?';
        if (evt.type === 'DAMAGE_APPLIED') {
          const target = evt.targetId === 'botA' ? pA.name : pB.name;
          return `[${t}] ${who} hits ${target} for ${evt.data?.amount} dmg`;
        }
        if (evt.type === 'ACTION_ACCEPTED' && evt.data?.type !== 'NO_OP') {
          return `[${t}] ${who} uses ${evt.data?.type}`;
        }
        if (evt.type === 'MATCH_END') return `[${t}] MATCH END`;
        return null;
      }).filter(Boolean) as string[];

      if (logEntries.length) {
        setFeed((prev) => [...logEntries.reverse(), ...prev].slice(0, 40));
      }

      // Post snapshot to Redis for spectators
      try {
        await fetch(`/api/sessions/${sessionId}/snapshot`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: match.matchId,
            botAName: pA.name,
            botBName: pB.name,
            snapshot: snap,
          }),
        });
      } catch { /* best-effort */ }
    };

    try {
      const finalSnap = await runMatchAsync(
        seed, configA, configB, handleSnapshot, '/api/agent/decide', controller.signal,
      );

      // Determine winner participant ID
      let winnerPid: string | null = null;
      let scoreA = 0;
      let scoreB = 0;
      if (finalSnap.state?.actors) {
        scoreA = finalSnap.state.actors.botA?.hp ?? 0;
        scoreB = finalSnap.state.actors.botB?.hp ?? 0;
      }
      if (finalSnap.winnerId === 'botA') winnerPid = pA.id;
      else if (finalSnap.winnerId === 'botB') winnerPid = pB.id;

      // POST match complete
      const completeRes = await fetch(`/api/sessions/${sessionId}/match/${match.matchId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          winnerId: winnerPid,
          scoreA,
          scoreB,
          hostParticipantId: participantId,
        }),
      });

      const completeData = await completeRes.json();

      setMatchRunning(false);
      matchRunningRef.current = false;

      if (completeData.nextMatchId && !completeData.done) {
        // Brief pause between matches
        await new Promise((r) => setTimeout(r, 3000));
        // Re-fetch session to get updated state
        const freshRes = await fetch(`/api/sessions/${sessionId}`);
        if (freshRes.ok) {
          const freshData = await freshRes.json();
          const freshSess = freshData.session;
          setSession(freshSess);
          const nextIdx = freshSess.bracket.findIndex((m: any) => m.matchId === completeData.nextMatchId);
          if (nextIdx >= 0) {
            runNextMatch(freshSess, nextIdx);
          }
        }
      }
    } catch (err) {
      console.error('[SessionRoom] Match error:', err);
      setMatchRunning(false);
      matchRunningRef.current = false;
    }
  }, [sessionId, participantId]);

  // Auto-start matches when session transitions to 'running' and we're host
  useEffect(() => {
    if (!session || session.status !== 'running' || !isHost || matchRunningRef.current) return;

    const currentMatch = session.bracket.find((m) => m.status === 'running');
    if (!currentMatch) return;

    const idx = session.bracket.indexOf(currentMatch);
    runNextMatch(session, idx);
  }, [session?.status, isHost, runNextMatch]);

  // --- Handlers ---
  const handleJoin = async () => {
    if (!joinName.trim()) return;
    setJoining(true);
    try {
      const res = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: joinName,
          bot: botConfig,
          password: joinPassword || undefined,
        }),
      });
      const data = await res.json();
      if (data.participantId) {
        setParticipantId(data.participantId);
        sessionStorage.setItem(`session-${sessionId}-pid`, data.participantId);
        setHasJoined(true);
      } else {
        setError(data.error || 'Failed to join');
      }
    } catch {
      setError('Network error');
    }
    setJoining(false);
  };

  const handleStart = async () => {
    if (!participantId) return;
    try {
      const res = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hostParticipantId: participantId }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      }
    } catch {
      setError('Failed to start tournament');
    }
  };

  // --- Render helpers ---
  const updateLoadout = (action: string, checked: boolean) => {
    setBotConfig((prev) => {
      if (action === 'MOVE') return prev;
      const newLoadout = checked
        ? [...prev.loadout, action]
        : prev.loadout.filter((a) => a !== action);
      return { ...prev, loadout: newLoadout };
    });
  };

  const renderBotConfigPanel = () => (
    <div className="bot-config-card">
      <h3>Your Bot</h3>
      <div className="section-label">System Prompt (Brain)</div>
      <textarea
        className="prompt-box"
        style={{ minHeight: '80px', marginBottom: '0.6rem', fontSize: '0.85rem' }}
        placeholder="You are an aggressive melee fighter..."
        value={botConfig.systemPrompt}
        onChange={(e) => setBotConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
      />

      <div className="section-label">Loadout</div>
      <div className="loadout-grid">
        {ACTION_TYPES.map((action: string) => {
          const info = ACTION_INFO[action];
          if (!info) return null;
          const isMove = action === 'MOVE';
          return (
            <label key={action} className="loadout-item">
              <input
                type="checkbox"
                checked={botConfig.loadout.includes(action)}
                disabled={isMove}
                onChange={(e) => updateLoadout(action, e.target.checked)}
              />
              <span>
                <strong>{info.label}</strong> ({info.cost}e)
              </span>
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
              name="armor"
              checked={botConfig.armor === a}
              onChange={() => setBotConfig((prev) => ({ ...prev, armor: a }))}
            />
            {a.charAt(0).toUpperCase() + a.slice(1)}
          </label>
        ))}
      </div>

      <div className="section-label" style={{ marginTop: '0.6rem' }}>
        Aggression: {botConfig.temperature.toFixed(2)}
      </div>
      <input
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={botConfig.temperature}
        onChange={(e) => setBotConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
        style={{ width: '100%', accentColor: 'var(--c-red)' }}
      />
    </div>
  );

  const renderLeaderboard = (leaderboard: LeaderboardEntry[]) => (
    <div className="panel" style={{ marginTop: '1.5rem' }}>
      <h2 style={{ fontSize: '1.4rem' }}>Leaderboard</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>W</th>
            <th>L</th>
            <th>Pts</th>
            <th>HP</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((entry, i) => (
            <tr key={entry.participantId}>
              <td>{i + 1}</td>
              <td style={{ fontWeight: 800 }}>{entry.name}</td>
              <td style={{ color: 'var(--c-green)' }}>{entry.wins}</td>
              <td style={{ color: 'var(--c-red)' }}>{entry.losses}</td>
              <td style={{ fontWeight: 900 }}>{entry.points}</td>
              <td>{entry.hpTotal}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // --- Phase rendering ---
  if (error && !session) {
    return (
      <div className="sr-root">
        <div className="bg-scanlines" />
        <header className="sr-header">
          <a className="logo" href="/">COG CAGE</a>
          <div className="header-links">
            <a className="header-link" href="/">Home</a>
            <a className="header-link" href="/play">Play</a>
          </div>
        </header>
        <main className="sr-shell">
          <div className="panel" style={{ textAlign: 'center', padding: '3rem' }}>
            <h2 style={{ color: 'var(--c-red)' }}>Error</h2>
            <p>{error}</p>
            <a href="/play" className="cta-btn" style={{ marginTop: '1rem', textDecoration: 'none' }}>Back to Play</a>
          </div>
        </main>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="sr-root">
        <div className="bg-scanlines" />
        <header className="sr-header">
          <a className="logo" href="/">COG CAGE</a>
        </header>
        <main className="sr-shell" style={{ textAlign: 'center', padding: '4rem' }}>
          <div style={{ fontFamily: 'var(--f-display)', fontSize: '2rem' }}>LOADING SESSION...</div>
        </main>
      </div>
    );
  }

  // Current match info
  const currentMatch = session.bracket.find((m) => m.matchId === session.currentMatchId);
  const matchNumber = currentMatch ? session.bracket.indexOf(currentMatch) + 1 : 0;
  const totalMatches = session.bracket.length;
  const currentBotA = currentMatch ? session.participants.find((p) => p.id === currentMatch.botA) : null;
  const currentBotB = currentMatch ? session.participants.find((p) => p.id === currentMatch.botB) : null;

  return (
    <div className="sr-root">
      <div className="bg-scanlines" />
      <header className="sr-header">
        <a className="logo" href="/">COG CAGE</a>
        <div className="header-links">
          <a className="header-link" href="/">Home</a>
          <a className="header-link" href="/play">Play</a>
        </div>
      </header>

      {/* ======================== LOBBY ======================== */}
      {session.status === 'lobby' && (
        <main className="sr-shell">
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '2.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
              FFA Tournament Lobby
            </h2>
            <div style={{ marginTop: '0.5rem' }}>
              <div className="section-label">Join Code</div>
              <div className="join-code-display">{session.code}</div>
              <div className="hint">Share this code with other players to join</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: hasJoined ? '1fr' : '1fr 1fr', gap: '2rem' }}>
            {/* Participant list */}
            <div className="panel">
              <h2 style={{ fontSize: '1.4rem' }}>
                Participants ({session.participants.length}/6)
              </h2>
              <ul className="participant-list">
                {session.participants.map((p) => (
                  <li key={p.id} className="participant-item">
                    <span className="participant-name">{p.name}</span>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span className="participant-badge" style={{ background: 'rgba(0,229,255,0.15)', borderColor: 'var(--c-cyan)' }}>
                        {p.bot.armor}
                      </span>
                      {p.id === session.hostId && (
                        <span className="participant-badge" style={{ background: 'var(--c-yellow)', borderColor: 'var(--c-dark)' }}>
                          HOST
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {isHost && (
                <button
                  className="cta-btn"
                  style={{ width: '100%', marginTop: '1rem' }}
                  disabled={session.participants.length < 2}
                  onClick={handleStart}
                >
                  Start Tournament ({session.participants.length} players)
                </button>
              )}

              {hasJoined && !isHost && (
                <div style={{ textAlign: 'center', marginTop: '1rem' }}>
                  <span className="status-pill" style={{ background: 'rgba(46,204,113,0.15)', borderColor: 'var(--c-green)' }}>
                    Ready — Waiting for host to start
                  </span>
                </div>
              )}
            </div>

            {/* Join form (if not yet joined) */}
            {!hasJoined && (
              <div className="panel">
                <h2 style={{ fontSize: '1.4rem' }}>Join Tournament</h2>

                <div className="section-label">Your Name</div>
                <input
                  className="prompt-box"
                  style={{ minHeight: 'unset', height: '44px', marginBottom: '0.8rem' }}
                  placeholder="Enter your name"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                />

                <input
                  className="prompt-box"
                  type="password"
                  style={{ minHeight: 'unset', height: '44px', marginBottom: '0.8rem' }}
                  placeholder="Password (if required)"
                  value={joinPassword}
                  onChange={(e) => setJoinPassword(e.target.value)}
                />

                {renderBotConfigPanel()}

                <button
                  className="cta-btn"
                  style={{ width: '100%', background: 'var(--c-cyan)', color: 'var(--c-dark)' }}
                  onClick={handleJoin}
                  disabled={joining || !joinName.trim()}
                >
                  {joining ? 'Joining...' : 'Join Tournament'}
                </button>

                {error && <div style={{ color: 'var(--c-red)', fontWeight: 800, marginTop: '0.5rem' }}>{error}</div>}
              </div>
            )}
          </div>
        </main>
      )}

      {/* ======================== MATCH ======================== */}
      {session.status === 'running' && (
        <main className="sr-shell">
          {/* Match header */}
          {currentBotA && currentBotB && (
            <div className="match-header">
              <span style={{ color: 'var(--c-cyan)' }}>{currentBotA.name}</span>
              <span className="vs">VS</span>
              <span style={{ color: 'var(--c-red)' }}>{currentBotB.name}</span>
              <div className="hint" style={{ fontSize: '0.85rem', marginTop: '0.3rem' }}>
                Match {matchNumber} of {totalMatches}
              </div>
            </div>
          )}

          {/* HP bars */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: '2rem', marginBottom: '1rem' }}>
            <div style={{ textAlign: 'center', flex: '0 1 200px' }}>
              <div style={{ fontWeight: 800, color: 'var(--c-cyan)', marginBottom: '0.3rem' }}>
                {currentBotA?.name || 'Bot A'} — HP {botAHp}
              </div>
              <div className="bar-shell">
                <div className="bar-fill" style={{ width: `${botAHp}%`, background: hpBarGradient(botAHp) }} />
              </div>
            </div>
            <div style={{ textAlign: 'center', flex: '0 1 200px' }}>
              <div style={{ fontWeight: 800, color: 'var(--c-red)', marginBottom: '0.3rem' }}>
                {currentBotB?.name || 'Bot B'} — HP {botBHp}
              </div>
              <div className="bar-shell">
                <div className="bar-fill" style={{ width: `${botBHp}%`, background: hpBarGradient(botBHp) }} />
              </div>
            </div>
          </div>

          <div className="sr-match-layout">
            {/* Arena */}
            <div>
              <div style={{
                position: 'relative', width: '100%', maxWidth: '700px', margin: '0 auto',
                height: '480px', overflow: 'hidden', borderRadius: '14px',
                border: '4px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A', background: '#F9F7F2',
              }}>
                <canvas
                  ref={playCanvasRef}
                  style={{ width: '100%', height: '100%', display: 'block' }}
                />
                {!pcActive && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: '1rem', background: '#F9F7F2',
                  }}>
                    <div style={{ fontFamily: 'Bangers, display', fontSize: '2rem', color: '#1A1A1A' }}>
                      {matchRunning || (session.status === 'running' && !isHost) ? 'LOADING ARENA...' : 'WAITING FOR MATCH...'}
                    </div>
                  </div>
                )}
              </div>

              {/* Tick info */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', margin: '0.5rem 0', flexWrap: 'wrap' }}>
                <span style={{ fontFamily: 'var(--f-display)', fontSize: '1rem', textTransform: 'uppercase' }}>Tick {tick}</span>
                <span className="status-pill" style={{ background: 'rgba(0,229,255,0.15)', borderColor: 'var(--c-cyan)' }}>
                  {(tick / TICK_RATE).toFixed(1)}s
                </span>
                {isHost && <span className="status-pill" style={{ background: 'var(--c-yellow)' }}>HOST</span>}
              </div>

              {/* Combat log */}
              <div className="panel" style={{ marginTop: '0.5rem' }}>
                <div className="section-label">Combat Log</div>
                <div className="feed" style={{ maxHeight: '200px' }}>
                  {feed.length === 0 && <div className="feed-item">Waiting for match data...</div>}
                  {feed.map((entry, i) => (
                    <div key={`${i}-${entry.slice(0, 15)}`} className="feed-item">{entry}</div>
                  ))}
                </div>
              </div>
            </div>

            {/* Leaderboard sidebar */}
            <div>
              {session.leaderboard.length > 0 && renderLeaderboard(session.leaderboard)}

              {/* Bracket progress */}
              <div className="panel" style={{ marginTop: '1rem' }}>
                <h2 style={{ fontSize: '1.2rem' }}>Bracket</h2>
                {session.bracket.map((m, i) => {
                  const pA = session.participants.find((p) => p.id === m.botA);
                  const pB = session.participants.find((p) => p.id === m.botB);
                  const statusColor = m.status === 'done' ? 'var(--c-green)' : m.status === 'running' ? 'var(--c-cyan)' : '#999';
                  return (
                    <div key={m.matchId} style={{
                      padding: '0.4rem 0', borderBottom: '1px solid rgba(0,0,0,0.08)',
                      display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem',
                    }}>
                      <span>
                        <strong>{i + 1}.</strong> {pA?.name || '?'} vs {pB?.name || '?'}
                      </span>
                      <span style={{ color: statusColor, fontWeight: 800, textTransform: 'uppercase', fontSize: '0.75rem' }}>
                        {m.status === 'done' && m.winnerId
                          ? `${session.participants.find((p) => p.id === m.winnerId)?.name || '?'} wins`
                          : m.status}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* ======================== DONE ======================== */}
      {session.status === 'done' && (
        <div className="ko-overlay">
          <div className="ko-radial-bg" />
          <div className="ko-content">
            <div className="ko-title">Tournament Complete</div>
            {session.leaderboard[0] && (
              <div style={{ fontFamily: 'var(--f-display)', fontSize: '2.5rem', color: '#fff', textShadow: '2px 2px 0 #111' }}>
                {session.leaderboard[0].name} WINS!
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '12px', padding: '1.5rem', marginTop: '1rem', minWidth: '300px' }}>
              <table className="leaderboard-table" style={{ color: '#fff' }}>
                <thead>
                  <tr>
                    <th style={{ color: '#aaa' }}>#</th>
                    <th style={{ color: '#aaa' }}>Name</th>
                    <th style={{ color: '#aaa' }}>W</th>
                    <th style={{ color: '#aaa' }}>L</th>
                    <th style={{ color: '#aaa' }}>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {session.leaderboard.map((entry, i) => (
                    <tr key={entry.participantId}>
                      <td style={{ color: i === 0 ? '#FFD233' : '#fff' }}>{i + 1}</td>
                      <td style={{ fontWeight: 800, color: i === 0 ? '#FFD233' : '#fff' }}>{entry.name}</td>
                      <td style={{ color: 'var(--c-green)' }}>{entry.wins}</td>
                      <td style={{ color: 'var(--c-red)' }}>{entry.losses}</td>
                      <td style={{ fontWeight: 900 }}>{entry.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
              <a href="/play" className="ko-btn" style={{ textDecoration: 'none' }}>
                Back to Play
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionRoom;
