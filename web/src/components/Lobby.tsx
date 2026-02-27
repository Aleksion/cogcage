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

type LobbyRole = 'owner' | 'challenger' | 'spectator';

interface LobbyState {
  id: string;
  ownerId: string;
  challengerId?: string;
  ownerBot: BotSnapshot;
  challengerBot: BotSnapshot | null;
  ownerReady: boolean;
  challengerReady: boolean;
  status: string;
  createdAt: number;
  role: LobbyRole;
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

  .lby-slot.ready-glow {
    border-color: rgba(46,204,113,0.6);
    box-shadow: 0 0 20px rgba(46,204,113,0.15);
  }

  .lby-ready-badge {
    display: inline-block; font-family: var(--f-display); font-size: 0.7rem;
    text-transform: uppercase; letter-spacing: 1px;
    padding: 0.2rem 0.6rem; border-radius: 6px; margin-bottom: 0.5rem;
  }
  .lby-ready-badge.is-ready { background: rgba(46,204,113,0.2); color: var(--c-green); }
  .lby-ready-badge.not-ready { background: rgba(255,255,255,0.05); color: rgba(255,255,255,0.3); }

  .lby-btn.ready {
    background: var(--c-green); color: #fff; margin-top: 0.6rem;
  }
  .lby-btn.unready {
    background: rgba(255,255,255,0.1); color: #fff; margin-top: 0.6rem;
  }

  .lby-spectator-banner {
    text-align: center; padding: 0.6rem 1rem;
    background: rgba(255,214,0,0.08); border-radius: 8px;
    font-family: var(--f-mono); font-size: 0.8rem;
    color: rgba(255,255,255,0.5); margin-bottom: 1.5rem;
  }

  .lby-copy-btn {
    font-family: var(--f-mono); font-size: 0.7rem;
    padding: 0.3rem 0.8rem; background: rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.6); border: 1px solid rgba(255,255,255,0.15);
    border-radius: 6px; cursor: pointer; margin-top: 0.4rem;
    transition: background 0.15s;
  }
  .lby-copy-btn:hover { background: rgba(255,255,255,0.15); }

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

/* ── BotPanel (reused for both sides) ──────────────────────── */

function BotPanel({ bot, label, isOwn, isReady, accentBg }: {
  bot: BotSnapshot;
  label: string;
  isOwn: boolean;
  isReady: boolean;
  accentBg: string;
}) {
  return (
    <>
      <div className="lby-slot-label">{label}{isOwn ? ' (You)' : ''}</div>
      <span className={`lby-ready-badge ${isReady ? 'is-ready' : 'not-ready'}`}>
        {isReady ? 'Ready' : 'Not Ready'}
      </span>
      <div className="lby-bot-name">{bot.botName}</div>
      <div className="lby-bot-icons">
        {bot.cards.map((cid, i) => {
          const c = getCard(cid);
          return <span key={i} title={c?.name}>{c?.icon ?? '?'}</span>;
        })}
      </div>
      {bot.skills && bot.skills.length > 0 && (
        <div className="lby-bot-icons" style={{ fontSize: '0.9rem' }}>
          {bot.skills.map((sid, i) => {
            const s = getSkill(sid);
            return <span key={i} title={s?.name} style={{ padding: '2px 6px', background: accentBg, borderRadius: '6px', fontSize: '0.75rem' }}>{s?.icon ?? '?'} {s?.name ?? sid}</span>;
          })}
        </div>
      )}
      <div className="lby-bot-stat">
        Actions: {bot.actionTypes.join(', ')}
      </div>
      <div className="lby-bot-stat">
        Armor: {bot.armor} &middot; Move cost: {bot.moveCost}e
      </div>
      {bot.brainPrompt && (
        <div className="lby-bot-stat" style={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.35)' }}>
          Brain: &ldquo;{bot.brainPrompt.slice(0, 60)}{bot.brainPrompt.length > 60 ? '...' : ''}&rdquo;
        </div>
      )}
    </>
  );
}

/* ── Component ──────────────────────────────────────────────── */

export default function Lobby({ lobbyId }: LobbyProps) {
  const [lobby, setLobby] = useState<LobbyState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);
  const [copied, setCopied] = useState(false);
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
        if (loading) setError('Lobby not found');
        setLoading(false);
        return;
      }
      const data = await res.json();
      setLobby(data);
      setError('');
      setLoading(false);
    } catch {
      if (loading) setError('Connection issue — retrying...');
      setLoading(false);
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
    if (lobby?.status === 'active') {
      handleStartMatch();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lobby?.status]);

  const challengeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/tank/${lobbyId}`
    : '';

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(challengeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* ignore */ }
  };

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

  const handleReady = async (ready: boolean) => {
    setActionBusy(true);
    setError('');
    try {
      const res = await fetch(`/api/lobby/${lobbyId}/ready`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ ready }),
      });
      const data = await res.json();
      if (!data.ok) setError(data.error || 'Failed to update ready state');
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
          <span className="lby-title">The Tank</span>
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
          <span className="lby-title">The Tank</span>
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

  const role = lobby.role;
  const isParticipant = role === 'owner' || role === 'challenger';
  const bothReady = lobby.status === 'ready';
  const hasChallenger = !!lobby.challengerBot;

  // Determine which bot is "yours" and which is "opponent's"
  const myBot = role === 'owner' ? lobby.ownerBot : role === 'challenger' ? lobby.challengerBot : null;
  const myReady = role === 'owner' ? lobby.ownerReady : lobby.challengerReady;
  const opponentBot = role === 'owner' ? lobby.challengerBot : lobby.ownerBot;
  const opponentReady = role === 'owner' ? lobby.challengerReady : lobby.ownerReady;

  return (
    <div className="lby-root">
      {/* Header */}
      <header className="lby-header">
        <a href="/" className="lby-logo">The Molt Pit</a>
        <span className="lby-title">The Tank</span>
        {isParticipant ? (
          <button className="lby-leave-btn" onClick={handleLeave}>Leave</button>
        ) : (
          <div />
        )}
      </header>

      <main className="lby-shell">
        {role === 'spectator' && (
          <div className="lby-spectator-banner">
            Spectator mode — you are watching this match
          </div>
        )}

        {error && <div className="lby-error">{error}</div>}

        <div className="lby-slots">
          {/* LEFT PANEL — Your Shell (or Owner's shell for spectators) */}
          <div className={`lby-slot ${myBot || role === 'spectator' ? (myReady || (role === 'spectator' && lobby.ownerReady) ? 'filled ready-glow' : 'filled') : 'empty'}`}>
            {role === 'spectator' ? (
              /* Spectator sees owner's bot read-only */
              <BotPanel
                bot={lobby.ownerBot}
                label="Owner's Shell"
                isOwn={false}
                isReady={lobby.ownerReady}
                accentBg="rgba(0,229,255,0.1)"
              />
            ) : myBot ? (
              <>
                <BotPanel
                  bot={myBot}
                  label="Your Shell"
                  isOwn={true}
                  isReady={myReady}
                  accentBg="rgba(0,229,255,0.1)"
                />
                <div style={{ marginTop: 'auto', paddingTop: '0.8rem', display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <a href={`/armory?returnTo=/tank/${lobbyId}`} className="lby-btn configure">
                    Configure
                  </a>
                  {hasChallenger && (
                    <button
                      className={`lby-btn ${myReady ? 'unready' : 'ready'}`}
                      onClick={() => handleReady(!myReady)}
                      disabled={actionBusy}
                    >
                      {myReady ? 'Unready' : 'Ready'}
                    </button>
                  )}
                </div>
              </>
            ) : (
              <div className="lby-waiting-text">Loading...</div>
            )}
          </div>

          {/* RIGHT PANEL — Opponent's Shell (or empty waiting slot) */}
          <div className={`lby-slot ${hasChallenger ? (opponentReady || (role === 'spectator' && lobby.challengerReady) ? 'guest-filled ready-glow' : 'guest-filled') : 'empty'}`}>
            {role === 'spectator' && hasChallenger && lobby.challengerBot ? (
              /* Spectator sees challenger's bot read-only */
              <BotPanel
                bot={lobby.challengerBot}
                label="Challenger's Shell"
                isOwn={false}
                isReady={lobby.challengerReady}
                accentBg="rgba(235,77,75,0.1)"
              />
            ) : hasChallenger && opponentBot ? (
              /* Participant sees opponent read-only */
              <BotPanel
                bot={opponentBot}
                label="Opponent's Shell"
                isOwn={false}
                isReady={opponentReady}
                accentBg="rgba(235,77,75,0.1)"
              />
            ) : (
              /* No challenger yet */
              <>
                <div className="lby-slot-label">Challenger</div>
                <div className="lby-waiting-text">Waiting for opponent...</div>
                {role === 'owner' && (
                  <>
                    <button
                      className="lby-btn dummy"
                      onClick={handleAddDummy}
                      disabled={actionBusy}
                    >
                      {actionBusy ? '...' : '+ Add Dummy'}
                    </button>
                    <div className="lby-share">
                      Share this challenge link:
                      <code>{challengeUrl}</code>
                      <button className="lby-copy-btn" onClick={handleCopyUrl}>
                        {copied ? 'Copied!' : 'Copy URL'}
                      </button>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
        </div>

        {/* START MATCH — only for participants when both ready */}
        {isParticipant && (
          <button
            className="lby-btn start"
            disabled={!bothReady || actionBusy}
            onClick={handleStartMatch}
          >
            {actionBusy ? 'Starting...' : bothReady ? 'Start Match' : 'Waiting for both players to ready up...'}
          </button>
        )}
      </main>
    </div>
  );
}
