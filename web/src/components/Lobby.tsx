import React, { useEffect, useState, useCallback } from 'react';
import { getCard } from '../lib/cards';
import { getSkill } from '../lib/skills';
import MatchView from './MatchView';
import type { MatchBotConfig } from './MatchView';

/* ── Types ──────────────────────────────────────────────────── */

interface BotSnapshot {
  botName: string;
  brainPrompt: string;
  skills?: string[];
  cards: string[];
  actionTypes: string[];
  armor: 'light' | 'medium' | 'heavy';
  moveCost: number;
}

interface LobbyState {
  id: string;
  host: BotSnapshot | null;
  guest: BotSnapshot | null;
  status: string;
  hostPlayerId: string;
  createdAt: number;
}

interface LobbyProps {
  lobbyId: string;
}

/* ── Styles ─────────────────────────────────────────────────── */

const lobbyStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&family=IBM+Plex+Mono:wght@400;600&display=swap');

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
    --f-mono: 'IBM Plex Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: #1A1A1A;
    font-family: var(--f-body);
    color: #f0f0f5;
    min-height: 100vh;
  }

  .lby-root { min-height: 100vh; position: relative; }

  .lby-header {
    position: sticky; top: 0; z-index: 10;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 1rem 2rem;
    background: rgba(26,26,26,0.98);
    border-bottom: 2px solid rgba(255,214,0,0.15);
    backdrop-filter: blur(12px);
  }
  .lby-logo {
    font-family: var(--f-display); font-size: 2rem; text-decoration: none;
    color: var(--c-red); text-shadow: 2px 2px 0px #000;
  }
  .lby-title {
    font-family: var(--f-display); font-size: 1.5rem; text-transform: uppercase;
    color: #fff;
  }
  .lby-leave-btn {
    font-family: var(--f-display); font-size: 0.85rem; text-transform: uppercase;
    padding: 0.4rem 1rem; background: var(--c-red); color: #fff;
    border: none; border-radius: 8px; cursor: pointer;
  }

  .lby-shell { padding: 2rem; max-width: 900px; margin: 0 auto; }

  .lby-slots {
    display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;
    margin-bottom: 2rem;
  }

  .lby-slot {
    background: rgba(20,20,28,0.8);
    border: 2px solid rgba(255,214,0,0.3);
    border-radius: 12px; padding: 1.5rem;
    backdrop-filter: blur(8px);
    min-height: 200px;
    display: flex; flex-direction: column;
  }
  .lby-slot.empty {
    border-style: dashed;
    border-color: rgba(255,255,255,0.15);
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  .lby-slot.filled {
    border-color: rgba(0,229,255,0.4);
    box-shadow: 0 0 15px rgba(0,229,255,0.1);
  }
  .lby-slot.guest-filled {
    border-color: rgba(235,77,75,0.4);
    box-shadow: 0 0 15px rgba(235,77,75,0.1);
  }

  .lby-slot-label {
    font-family: var(--f-display); font-size: 0.85rem; text-transform: uppercase;
    color: rgba(255,255,255,0.4); letter-spacing: 1px; margin-bottom: 0.6rem;
  }
  .lby-bot-name {
    font-family: var(--f-display); font-size: 1.3rem; color: #fff;
    text-transform: uppercase; margin-bottom: 0.5rem;
  }
  .lby-bot-icons {
    display: flex; gap: 6px; font-size: 1.2rem; margin-bottom: 0.4rem;
  }
  .lby-bot-stat {
    font-family: var(--f-mono); font-size: 0.75rem; color: rgba(255,255,255,0.5);
    margin-bottom: 0.6rem;
  }

  .lby-btn {
    font-family: var(--f-display); font-size: 0.9rem; text-transform: uppercase;
    padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; border: none;
    transition: opacity 0.15s; text-decoration: none; display: inline-block;
  }
  .lby-btn:hover { opacity: 0.85; }
  .lby-btn.configure { background: var(--c-cyan); color: #111; }
  .lby-btn.dummy { background: rgba(255,255,255,0.1); color: #fff; font-size: 1rem; padding: 0.7rem 1.5rem; }
  .lby-btn.start {
    background: var(--c-yellow); color: #111; font-size: 1.3rem;
    padding: 0.9rem 2.5rem; display: block; text-align: center;
    margin: 0 auto; max-width: 400px; border-radius: 12px;
    box-shadow: 0 4px 0 rgba(0,0,0,0.3);
  }
  .lby-btn.start:disabled { opacity: 0.3; cursor: not-allowed; }
  .lby-btn.start:active:not(:disabled) { transform: translateY(2px); box-shadow: none; }

  .lby-waiting-text {
    color: rgba(255,255,255,0.3); font-size: 1rem;
    margin-bottom: 1rem;
  }
  .lby-share {
    font-size: 0.75rem; color: rgba(255,255,255,0.3);
    margin-top: 0.8rem;
  }
  .lby-share code {
    font-family: var(--f-mono); color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.05); padding: 0.2rem 0.5rem;
    border-radius: 4px; font-size: 0.7rem;
    display: block; margin-top: 0.3rem; word-break: break-all;
  }

  .lby-error {
    color: var(--c-red); font-weight: 800; font-size: 0.85rem;
    text-align: center; margin-bottom: 1rem;
  }

  .lby-loading {
    text-align: center; padding: 4rem 2rem;
    font-family: var(--f-display); font-size: 1.5rem;
    color: rgba(255,255,255,0.3);
  }

  @media (max-width: 700px) {
    .lby-slots { grid-template-columns: 1fr; }
    .lby-header { padding: 1rem; }
    .lby-shell { padding: 1rem; }
  }
`;

/* ── Component ──────────────────────────────────────────────── */

export default function Lobby({ lobbyId }: LobbyProps) {
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [matchData, setMatchData] = useState<{ botA: MatchBotConfig; botB: MatchBotConfig; seed: number } | null>(null);

  // Inject styles
  useEffect(() => {
    const id = 'lobby-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = lobbyStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Fetch lobby state — only show errors on initial load; poll failures are silent
  const fetchLobby = useCallback(async () => {
    try {
      const res = await fetch(`/api/lobby/${lobbyId}`);
      if (!res.ok) {
        if (loading) setError('Lobby not found'); // only show on first load
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLobby(data);
      setError(''); // clear any prior error on success
      setLoading(false);
    } catch {
      if (loading) setError('Connection issue — retrying...'); // only block on first load
      setLoading(false);
      // subsequent poll failures are ignored — stale data stays visible
    }
  }, [lobbyId, loading]);

  useEffect(() => {
    fetchLobby();
    const interval = setInterval(fetchLobby, 3000);
    return () => clearInterval(interval);
  }, [fetchLobby]);

  // If match started externally, stop polling
  useEffect(() => {
    if (matchData) return;
    if (lobby?.status === 'in-match') {
      // Someone else started — try to get match data
      handleStartMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.status]);

  const handleAddDummy = async () => {
    setActionBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/lobby/${lobbyId}/dummy`, { method: 'POST' });
      const data = await res.json();
      if (!data.ok) setError(data.error || 'Failed to add dummy');
      else fetchLobby();
    } catch {
      setError('Network error');
    }
    setActionBusy(false);
  };

  const handleLeave = async () => {
    try {
      await fetch(`/api/lobby/${lobbyId}`, { method: 'DELETE' });
      window.location.href = '/play';
    } catch { /* ignore */ }
  };

  const handleStartMatch = async () => {
    setActionBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/lobby/${lobbyId}/start`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        setActionBusy(false);
        return;
      }
      setMatchData({
        botA: data.botA,
        botB: data.botB,
        seed: data.seed,
      });
    } catch {
      setError('Network error');
      setActionBusy(false);
    }
  };

  // If we have match data, render MatchView
  if (matchData) {
    return (
      <div className="lby-root">
        <MatchView
          botA={matchData.botA}
          botB={matchData.botB}
          seed={matchData.seed}
          onBack={() => { window.location.href = '/play'; }}
          backLabel="Back to Dashboard"
          onTweakBot={() => { window.location.href = '/armory'; }}
        />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="lby-root">
        <header className="lby-header">
          <a href="/" className="lby-logo">The Molt Pit</a>
          <span className="lby-title">Lobby</span>
          <div />
        </header>
        <div className="lby-loading">Loading lobby...</div>
      </div>
    );
  }

  if (!lobby) {
    return (
      <div className="lby-root">
        <header className="lby-header">
          <a href="/" className="lby-logo">The Molt Pit</a>
          <span className="lby-title">Lobby</span>
          <div />
        </header>
        <div className="lby-loading">
          {error || 'Lobby not found'}
          <div style={{ marginTop: '1rem' }}>
            <a href="/play" style={{ color: '#FFD600', textDecoration: 'underline' }}>Back to Dashboard</a>
          </div>
        </div>
      </div>
    );
  }

  const isReady = lobby.status === 'ready';
  const hasGuest = !!lobby.guest;
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="lby-root">
      {/* Header */}
      <header className="lby-header">
        <a href="/" className="lby-logo">The Molt Pit</a>
        <span className="lby-title">Lobby</span>
        <button className="lby-leave-btn" onClick={handleLeave}>Leave</button>
      </header>

      <main className="lby-shell">
        {error && <div className="lby-error">{error}</div>}

        <div className="lby-slots">
          {/* SLOT 1 — Host */}
          <div className={`lby-slot ${lobby.host ? 'filled' : 'empty'}`}>
            <div className="lby-slot-label">Slot 1 (You)</div>
            {lobby.host ? (
              <>
                <div className="lby-bot-name">{lobby.host.botName}</div>
                <div className="lby-bot-icons">
                  {lobby.host.cards.map((cid, i) => {
                    const c = getCard(cid);
                    return <span key={i} title={c?.name}>{c?.icon ?? '?'}</span>;
                  })}
                </div>
                {lobby.host.skills && lobby.host.skills.length > 0 && (
                  <div className="lby-bot-icons" style={{ fontSize: '0.9rem' }}>
                    {lobby.host.skills.map((sid, i) => {
                      const s = getSkill(sid);
                      return <span key={i} title={s?.name} style={{ padding: '2px 6px', background: 'rgba(0,229,255,0.1)', borderRadius: '6px', fontSize: '0.75rem' }}>{s?.icon ?? '?'} {s?.name ?? sid}</span>;
                    })}
                  </div>
                )}
                <div className="lby-bot-stat">
                  Actions: {lobby.host.actionTypes.join(', ')}
                </div>
                <div className="lby-bot-stat">
                  Armor: {lobby.host.armor} &middot; Move cost: {lobby.host.moveCost}e
                </div>
                {lobby.host.brainPrompt && (
                  <div className="lby-bot-stat" style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.35)' }}>
                    Brain: &ldquo;{lobby.host.brainPrompt.slice(0, 60)}{lobby.host.brainPrompt.length > 60 ? '...' : ''}&rdquo;
                  </div>
                )}
                <div style={{ marginTop: 'auto', paddingTop: '0.8rem' }}>
                  <a href={`/armory?returnTo=/lobby/${lobbyId}`} className="lby-btn configure">
                    Configure Bot
                  </a>
                </div>
              </>
            ) : (
              <div className="lby-waiting-text">Loading...</div>
            )}
          </div>

          {/* SLOT 2 — Guest */}
          <div className={`lby-slot ${hasGuest ? 'guest-filled' : 'empty'}`}>
            <div className="lby-slot-label">Slot 2</div>
            {hasGuest && lobby.guest ? (
              <>
                <div className="lby-bot-name">{lobby.guest.botName}</div>
                <div className="lby-bot-icons">
                  {lobby.guest.cards.map((cid, i) => {
                    const c = getCard(cid);
                    return <span key={i} title={c?.name}>{c?.icon ?? '?'}</span>;
                  })}
                </div>
                {lobby.guest.skills && lobby.guest.skills.length > 0 && (
                  <div className="lby-bot-icons" style={{ fontSize: '0.9rem' }}>
                    {lobby.guest.skills.map((sid, i) => {
                      const s = getSkill(sid);
                      return <span key={i} title={s?.name} style={{ padding: '2px 6px', background: 'rgba(235,77,75,0.1)', borderRadius: '6px', fontSize: '0.75rem' }}>{s?.icon ?? '?'} {s?.name ?? sid}</span>;
                    })}
                  </div>
                )}
                <div className="lby-bot-stat">
                  Actions: {lobby.guest.actionTypes.join(', ')}
                </div>
                <div className="lby-bot-stat">
                  Armor: {lobby.guest.armor} &middot; Move cost: {lobby.guest.moveCost}e
                </div>
                {lobby.guest.brainPrompt && (
                  <div className="lby-bot-stat" style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.35)' }}>
                    Brain: &ldquo;{lobby.guest.brainPrompt.slice(0, 60)}{lobby.guest.brainPrompt.length > 60 ? '...' : ''}&rdquo;
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="lby-waiting-text">Waiting for opponent...</div>
                <button
                  className="lby-btn dummy"
                  onClick={handleAddDummy}
                  disabled={actionBusy}
                >
                  {actionBusy ? '...' : '+ Add Dummy'}
                </button>
                <div className="lby-share">
                  Or share this link to invite a friend:
                  <code>{shareUrl}</code>
                </div>
              </>
            )}
          </div>
        </div>

        {/* START MATCH */}
        <button
          className="lby-btn start"
          disabled={!isReady || actionBusy}
          onClick={handleStartMatch}
        >
          {actionBusy ? 'Starting...' : 'Start Match'}
        </button>
      </main>
    </div>
  );
}
