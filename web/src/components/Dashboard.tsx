import React, { useEffect, useState, useCallback } from 'react';
import { getCard } from '../lib/cards';

/* ── Types ──────────────────────────────────────────────────── */

interface SavedLoadout {
  id: string;
  name: string;
  cards: string[];
  createdAt: number;
  stats: { totalWeight: number; totalOverhead: number; armorValue: number };
}

interface LobbyInfo {
  id: string;
  hostPlayerId: string;
  hostLoadoutId: string;
  status: string;
  createdAt: number;
}

/* ── Styles ─────────────────────────────────────────────────── */

const dashStyles = `
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

  .dash-root { min-height: 100vh; position: relative; }

  .dash-header {
    position: sticky; top: 0; z-index: 10;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 1rem 2rem;
    background: rgba(26,26,26,0.98);
    border-bottom: 2px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
  }
  .dash-logo {
    font-family: var(--f-display); font-size: 2rem; text-decoration: none;
    color: var(--c-red); text-shadow: 2px 2px 0px #000;
  }
  .dash-nav { display: flex; gap: 0.8rem; align-items: center; }
  .dash-nav a {
    font-weight: 800; text-transform: uppercase; text-decoration: none;
    color: rgba(255,255,255,0.6); padding: 0.4rem 0.8rem;
    border-radius: 8px; font-size: 0.85rem; transition: color 0.15s;
  }
  .dash-nav a:hover { color: #fff; }
  .dash-nav a.active { color: var(--c-yellow); }

  .dash-shell { padding: 2rem; max-width: 800px; margin: 0 auto; }

  .dash-section-title {
    font-family: var(--f-display); font-size: 1.5rem; text-transform: uppercase;
    letter-spacing: 1px; margin-bottom: 0.8rem; color: #fff;
  }

  .dash-bot-card {
    background: rgba(20,20,28,0.8);
    border: 2px solid rgba(255,214,0,0.3);
    border-radius: 12px; padding: 1.2rem;
    backdrop-filter: blur(8px);
    margin-bottom: 1.5rem;
  }
  .dash-bot-card.empty {
    border-style: dashed;
    border-color: rgba(255,255,255,0.15);
    text-align: center;
    padding: 2rem;
  }
  .dash-bot-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.6rem;
  }
  .dash-bot-name {
    font-family: var(--f-display); font-size: 1.3rem; color: #fff;
    text-transform: uppercase;
  }
  .dash-btn {
    font-family: var(--f-display); font-size: 0.9rem; text-transform: uppercase;
    padding: 0.5rem 1.2rem; border-radius: 8px; cursor: pointer; border: none;
    transition: opacity 0.15s; text-decoration: none; display: inline-block;
  }
  .dash-btn:hover { opacity: 0.85; }
  .dash-btn.configure { background: var(--c-cyan); color: #111; }
  .dash-btn.build { background: var(--c-yellow); color: #111; }
  .dash-btn.cta {
    background: var(--c-yellow); color: #111; font-size: 1.3rem;
    padding: 0.9rem 2.5rem; display: block; text-align: center;
    margin: 1.5rem auto; max-width: 400px; border-radius: 12px;
    box-shadow: 0 4px 0 rgba(0,0,0,0.3);
  }
  .dash-btn.cta:active { transform: translateY(2px); box-shadow: none; }
  .dash-btn.cta:disabled { opacity: 0.4; cursor: not-allowed; }
  .dash-btn.join { background: var(--c-green); color: #fff; font-size: 0.8rem; padding: 0.4rem 0.9rem; }

  .dash-bot-info {
    font-size: 0.85rem; color: rgba(255,255,255,0.6); margin-bottom: 0.4rem;
  }
  .dash-bot-icons {
    display: flex; gap: 6px; font-size: 1.2rem; margin-bottom: 0.4rem;
  }
  .dash-bot-stat {
    font-family: var(--f-mono); font-size: 0.75rem; color: rgba(255,255,255,0.5);
  }

  .dash-weight-bar {
    height: 8px; border-radius: 999px; overflow: hidden;
    background: rgba(255,255,255,0.06); margin-top: 0.4rem;
  }
  .dash-weight-fill {
    height: 100%; border-radius: 999px;
    transition: width 0.3s ease;
  }

  .dash-lobby-list {
    display: flex; flex-direction: column; gap: 0.6rem;
    margin-bottom: 1.5rem;
  }
  .dash-lobby-row {
    display: flex; justify-content: space-between; align-items: center;
    padding: 0.7rem 1rem;
    background: rgba(20,20,28,0.8);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 8px;
  }
  .dash-lobby-host {
    font-weight: 800; color: #fff;
  }
  .dash-lobby-vs {
    color: rgba(255,255,255,0.4); font-size: 0.85rem;
  }
  .dash-empty-text {
    color: rgba(255,255,255,0.3); font-size: 0.9rem; text-align: center;
    padding: 1rem;
  }

  @media (max-width: 600px) {
    .dash-header { padding: 1rem; }
    .dash-shell { padding: 1rem; }
    .dash-btn.cta { font-size: 1.1rem; padding: 0.8rem 1.5rem; }
  }
`;

/* ── Helpers ────────────────────────────────────────────────── */

function getPlayerId(): string {
  const match = document.cookie.match(/moltpit_pid=([^;]+)/);
  if (match) return match[1];
  let id = localStorage.getItem('moltpit_pid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('moltpit_pid', id);
  }
  return id;
}

function weightColor(w: number): string {
  if (w <= 6) return '#2ecc71';
  if (w <= 12) return '#FFD600';
  if (w <= 18) return '#FF9F1C';
  return '#eb4d4b';
}

/* ── Component ──────────────────────────────────────────────── */

export default function Dashboard() {
  const [loadouts, setLoadouts] = useState<SavedLoadout[]>([]);
  const [lobbies, setLobbies] = useState<LobbyInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [joining, setJoining] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Inject styles
  useEffect(() => {
    const id = 'dashboard-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = dashStyles;
      document.head.appendChild(style);
    }
  }, []);

  // Fetch loadouts
  const fetchLoadouts = useCallback(async () => {
    try {
      const res = await fetch('/api/shell');
      const data = await res.json();
      setLoadouts(data.loadouts ?? []);
    } catch { /* ignore */ }
  }, []);

  // Fetch open lobbies
  const fetchLobbies = useCallback(async () => {
    try {
      const res = await fetch('/api/tank');
      const data = await res.json();
      setLobbies(data.lobbies ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchLoadouts();
    fetchLobbies();
    const interval = setInterval(fetchLobbies, 5000);
    return () => clearInterval(interval);
  }, [fetchLoadouts, fetchLobbies]);

  const myBot = loadouts.length > 0 ? loadouts[0] : null;

  const handleStartLobby = async () => {
    if (!myBot) return;
    setCreating(true);
    setError('');
    try {
      const res = await fetch('/api/tank', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ loadoutId: myBot.id }),
      });
      const data = await res.json();
      if (data.lobbyId) {
        window.location.href = `/tank/${data.lobbyId}`;
      } else {
        setError(data.error || 'Failed to create tank');
        setCreating(false);
      }
    } catch {
      setError('Network error');
      setCreating(false);
    }
  };

  const handleJoin = async (lobbyId: string) => {
    if (!myBot) {
      setError('Build a crawler first!');
      return;
    }
    setJoining(lobbyId);
    setError('');
    try {
      const res = await fetch(`/api/tank/${lobbyId}/join`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ loadoutId: myBot.id }),
      });
      const data = await res.json();
      if (data.ok) {
        window.location.href = `/tank/${lobbyId}`;
      } else {
        setError(data.error || 'Failed to join');
        setJoining(null);
      }
    } catch {
      setError('Network error');
      setJoining(null);
    }
  };

  const pid = typeof document !== 'undefined' ? getPlayerId() : '';
  const otherLobbies = lobbies.filter((l) => l.hostPlayerId !== pid);

  return (
    <div className="dash-root">
      {/* Header */}
      <header className="dash-header">
        <a href="/" className="dash-logo">The Molt Pit</a>
        <nav className="dash-nav">
          <a href="/">Home</a>
          <a href="/play" className="active">Play</a>
          <a href="/shell">The Shell</a>
        </nav>
      </header>

      <main className="dash-shell">
        {/* YOUR CRAWLER */}
        <div className="dash-section-title">Your Crawler</div>
        {myBot ? (
          <div className="dash-bot-card">
            <div className="dash-bot-header">
              <span className="dash-bot-name">{myBot.name}</span>
              <a href="/shell" className="dash-btn configure">Configure</a>
            </div>
            <div className="dash-bot-icons">
              {myBot.cards.map((cid, i) => {
                const c = getCard(cid);
                return <span key={i} title={c?.name}>{c?.icon ?? '?'}</span>;
              })}
            </div>
            <div className="dash-bot-stat">
              Weight: {myBot.stats.totalWeight} &middot; Complexity: {myBot.stats.totalOverhead} oh &middot; Armor: {myBot.stats.armorValue}% def
            </div>
            <div className="dash-weight-bar">
              <div
                className="dash-weight-fill"
                style={{
                  width: `${Math.min(100, (myBot.stats.totalWeight / 24) * 100)}%`,
                  background: weightColor(myBot.stats.totalWeight),
                }}
              />
            </div>
          </div>
        ) : (
          <div className="dash-bot-card empty">
            <div className="dash-bot-info">No crawler configured yet</div>
            <a href="/shell" className="dash-btn build">Build Your Crawler</a>
          </div>
        )}

        {/* START TANK */}
        <button
          className="dash-btn cta"
          onClick={handleStartLobby}
          disabled={creating || !myBot}
        >
          {creating ? 'Creating...' : 'Start Tank'}
        </button>

        {error && (
          <div style={{ color: '#eb4d4b', fontSize: '0.85rem', fontWeight: 800, textAlign: 'center', marginBottom: '1rem' }}>
            {error}
          </div>
        )}

        {/* OPEN MOLTS */}
        <div className="dash-section-title">Open Molts</div>
        {otherLobbies.length > 0 ? (
          <div className="dash-lobby-list">
            {otherLobbies.map((lobby) => (
              <div key={lobby.id} className="dash-lobby-row">
                <div>
                  <span className="dash-lobby-host">Tank</span>
                  <span className="dash-lobby-vs"> vs ???</span>
                </div>
                <button
                  className="dash-btn join"
                  disabled={joining === lobby.id}
                  onClick={() => handleJoin(lobby.id)}
                >
                  {joining === lobby.id ? '...' : 'Join'}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="dash-empty-text">No open molts. Be first!</div>
        )}
      </main>
    </div>
  );
}
