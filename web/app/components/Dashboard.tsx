import React, { useEffect, useState, useCallback } from 'react';
import { getCard } from '../lib/cards';
import QuickDemo from './QuickDemo';

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

  .dash-root { min-height: 100vh; position: relative; font-family: var(--f-body); }

  .dash-header {
    position: sticky; top: 0; z-index: 10;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 0.8rem 2rem;
    background: #000;
    border-bottom: 3px solid #FFD600;
  }
  .dash-logo {
    font-family: var(--f-display); font-size: 2rem; text-decoration: none;
    color: #EB4D4B; text-shadow: 2px 2px 0 #000;
  }
  .dash-nav { display: flex; gap: 0.8rem; align-items: center; }
  .dash-nav a {
    font-weight: 800; text-transform: uppercase; text-decoration: none;
    color: rgba(255,255,255,0.6); padding: 0.4rem 0.8rem;
    font-size: 0.85rem; transition: color 0.15s;
  }
  .dash-nav a:hover { color: #fff; }
  .dash-nav a.active { color: #FFD600; border-bottom: 3px solid #FFD600; }

  .dash-shell { padding: 2rem; max-width: 800px; margin: 0 auto; }

  .dash-section-title {
    font-family: var(--f-display); font-size: 2rem; text-transform: uppercase;
    letter-spacing: 2px; margin-bottom: 0.8rem; color: #fff;
    text-shadow: 2px 2px 0 var(--c-orange);
  }

  .dash-bot-card {
    background: #111;
    border: 3px solid #FFD600;
    box-shadow: 6px 6px 0 #000;
    border-radius: 12px; padding: 1.5rem;
    margin-bottom: 1.5rem;
  }
  .dash-bot-card.empty {
    border-style: dashed;
    border-color: rgba(255,255,255,0.25);
    box-shadow: none;
    text-align: center;
    padding: 2rem;
  }
  .dash-bot-header {
    display: flex; justify-content: space-between; align-items: center;
    margin-bottom: 0.6rem;
  }
  .dash-bot-name {
    font-family: var(--f-display); font-size: 2.5rem; color: #FFD600;
    text-transform: uppercase; text-shadow: 3px 3px 0 #000;
  }
  .dash-btn {
    font-family: var(--f-display); font-size: 1.2rem; text-transform: uppercase;
    padding: 0.6rem 2rem; border-radius: 8px; cursor: pointer;
    border: 3px solid #000; box-shadow: 3px 3px 0 #000;
    transition: transform 0.1s, box-shadow 0.1s, opacity 0.15s;
    text-decoration: none; display: inline-block;
  }
  .dash-btn:active { transform: translateY(3px); box-shadow: none; }
  .dash-btn:hover { opacity: 0.9; }
  .dash-btn.configure {
    background: transparent; color: #fff;
    border: 3px solid rgba(255,255,255,0.5);
    box-shadow: 3px 3px 0 rgba(255,255,255,0.2);
  }
  .dash-btn.build {
    background: #FFD600; color: #000;
    border: 3px solid #000; box-shadow: 3px 3px 0 #000;
  }
  .dash-btn.cta {
    background: #EB4D4B; color: #fff; font-size: 1.8rem;
    padding: 1rem 2rem; display: block; text-align: center;
    margin: 1.5rem auto; max-width: 400px; width: 100%;
    border: 4px solid #000; box-shadow: 0 6px 0 #000;
    border-radius: 12px;
  }
  .dash-btn.cta:active { transform: translateY(6px); box-shadow: none; }
  .dash-btn.cta:disabled { opacity: 0.4; cursor: not-allowed; }
  .dash-btn.join {
    background: #2ecc71; color: #fff; font-size: 0.8rem;
    padding: 0.4rem 0.9rem; border: 2px solid #000; box-shadow: 2px 2px 0 #000;
  }

  .dash-bot-info {
    font-family: var(--f-body); font-weight: 800;
    font-size: 1rem; color: rgba(255,255,255,0.4); margin-bottom: 0.4rem;
  }
  .dash-bot-icons {
    display: flex; gap: 6px; font-size: 1.2rem; margin-bottom: 0.4rem;
  }
  .dash-bot-stat {
    font-family: var(--f-mono); font-size: 0.75rem; color: rgba(255,255,255,0.5);
  }

  .dash-weight-bar {
    height: 10px; border-radius: 999px; overflow: hidden;
    background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.15);
    margin-top: 0.4rem;
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
    background: #111;
    border: 3px solid #000;
    box-shadow: 4px 4px 0 #000;
    border-radius: 10px;
  }
  .dash-lobby-host {
    font-family: var(--f-display); font-weight: 800; color: #fff; font-size: 1.1rem;
  }
  .dash-lobby-vs {
    color: rgba(255,255,255,0.4); font-size: 0.85rem;
  }
  .dash-empty-text {
    font-family: var(--f-body); font-weight: 800;
    color: rgba(255,255,255,0.4); font-size: 1rem; text-align: center;
    padding: 1rem;
  }

  @media (max-width: 600px) {
    .dash-header { padding: 0.8rem 1rem; }
    .dash-shell { padding: 1rem; }
    .dash-btn.cta { font-size: 1.4rem; padding: 0.8rem 1.5rem; }
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
      <main className="dash-shell">
        {/* WATCH A LIVE MOLT */}
        <div className="dash-section-title">Watch a Live Molt</div>
        <QuickDemo />
        <hr style={{ border: 'none', borderTop: '2px solid rgba(255,255,255,0.08)', margin: '1.5rem 0' }} />

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
