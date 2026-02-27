import React, { useEffect, useState, useCallback } from 'react';
import Card from './cards/Card';
import {
  ALL_CARDS,
  calculateLoadoutStats,
  validateLoadout,
  getCard,
  MAX_LOADOUT_SLOTS,
  MAX_ARMOR_CARDS,
} from '../lib/cards';
import type { Card as CardData, CardType, LoadoutStats, ComplexityTier } from '../lib/cards';

/* ── Saved loadout type (matches Redis schema) ───────────────── */

interface SavedLoadout {
  id: string;
  name: string;
  cards: string[];
  createdAt: number;
  stats: { totalWeight: number; totalOverhead: number; armorValue: number };
}

/* ── Styles ──────────────────────────────────────────────────── */

const armoryStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&family=IBM+Plex+Mono:wght@400;600&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --c-white: #FFFFFF;
    --c-green: #2ecc71;
    --c-purple: #7c3aed;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --f-mono: 'IBM Plex Mono', monospace;
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: radial-gradient(circle at 30% 10%, rgba(124,58,237,0.12), transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(0,229,255,0.08), transparent 35%),
      linear-gradient(180deg, #0a0a0f 0%, #111118 100%);
    font-family: var(--f-body);
    color: #f0f0f5;
    min-height: 100vh;
  }

  .armory-root { min-height: 100vh; position: relative; }

  .armory-header {
    position: sticky; top: 0; z-index: 10;
    display: flex; justify-content: space-between; align-items: center; gap: 1rem;
    padding: 1rem 2rem;
    background: rgba(15,15,20,0.95);
    border-bottom: 2px solid rgba(255,255,255,0.08);
    backdrop-filter: blur(12px);
  }
  .armory-logo {
    font-family: var(--f-display); font-size: 2rem; text-decoration: none;
    color: var(--c-red); text-shadow: 2px 2px 0px #000;
  }
  .armory-nav { display: flex; gap: 0.8rem; align-items: center; }
  .armory-nav a {
    font-weight: 800; text-transform: uppercase; text-decoration: none;
    color: rgba(255,255,255,0.6); padding: 0.4rem 0.8rem;
    border-radius: 8px; font-size: 0.85rem; transition: color 0.15s;
  }
  .armory-nav a:hover { color: #fff; }
  .armory-nav a.active { color: var(--c-yellow); }

  .armory-shell { padding: 1.5rem 2rem 3rem; max-width: 1400px; margin: 0 auto; }

  .armory-layout {
    display: grid; grid-template-columns: 1fr 340px; gap: 2rem;
    align-items: start;
  }

  .gallery-panel, .builder-panel, .saved-panel {
    background: rgba(20,20,28,0.8);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px; padding: 1.2rem;
    backdrop-filter: blur(8px);
  }

  .panel-title {
    font-family: var(--f-display); font-size: 1.5rem; text-transform: uppercase;
    letter-spacing: 1px; margin-bottom: 0.8rem; color: #fff;
  }

  .filter-tabs {
    display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;
  }
  .filter-tab {
    font-family: var(--f-body); font-weight: 800; font-size: 0.8rem;
    text-transform: uppercase; padding: 0.35rem 0.8rem; border-radius: 999px;
    border: 2px solid rgba(255,255,255,0.15); background: transparent;
    color: rgba(255,255,255,0.6); cursor: pointer; transition: all 0.15s;
  }
  .filter-tab:hover { border-color: rgba(255,255,255,0.3); color: #fff; }
  .filter-tab.active { border-color: var(--c-yellow); color: var(--c-yellow); background: rgba(255,214,0,0.08); }

  .card-grid {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
  }

  .armory-card:hover {
    transform: scale(1.08);
    z-index: 5;
  }

  /* Builder */
  .slot-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    margin-bottom: 1rem;
  }
  .slot {
    width: 100%; aspect-ratio: 4/5; border-radius: 8px;
    border: 2px dashed rgba(255,255,255,0.15);
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    cursor: pointer; transition: border-color 0.15s;
    position: relative; overflow: hidden;
    background: rgba(255,255,255,0.02);
  }
  .slot:hover { border-color: rgba(255,255,255,0.3); }
  .slot .slot-empty {
    font-size: 1.5rem; color: rgba(255,255,255,0.15);
  }
  .slot .slot-remove {
    position: absolute; top: 2px; right: 2px; width: 16px; height: 16px;
    border-radius: 50%; background: var(--c-red); color: #fff;
    font-size: 0.55rem; display: grid; place-items: center;
    cursor: pointer; border: none; opacity: 0; transition: opacity 0.15s;
  }
  .slot:hover .slot-remove { opacity: 1; }

  .stats-summary {
    display: flex; flex-direction: column; gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .stat-row {
    display: flex; align-items: center; gap: 0.5rem;
  }
  .stat-label {
    font-weight: 800; font-size: 0.75rem; text-transform: uppercase;
    color: rgba(255,255,255,0.5); width: 80px; flex-shrink: 0;
  }
  .stat-bar-shell {
    flex: 1; height: 10px; background: rgba(255,255,255,0.06);
    border-radius: 999px; overflow: hidden;
  }
  .stat-bar-fill {
    height: 100%; border-radius: 999px;
    transition: width 0.3s ease, background 0.3s ease;
  }
  .stat-value {
    font-family: var(--f-mono); font-size: 0.75rem; color: rgba(255,255,255,0.7);
    min-width: 60px; text-align: right;
  }

  .save-row {
    display: flex; gap: 0.5rem; align-items: center;
  }
  .save-input {
    flex: 1; padding: 0.5rem 0.75rem; border-radius: 8px;
    border: 2px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.04);
    color: #fff; font-family: var(--f-body); font-size: 0.85rem;
    outline: none; transition: border-color 0.15s;
  }
  .save-input:focus { border-color: var(--c-yellow); }
  .save-input::placeholder { color: rgba(255,255,255,0.25); }

  .save-btn {
    font-family: var(--f-display); font-size: 1rem; text-transform: uppercase;
    padding: 0.5rem 1.2rem; background: var(--c-yellow); color: #111;
    border: none; border-radius: 8px; cursor: pointer;
    transition: opacity 0.15s;
  }
  .save-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* Saved loadouts strip */
  .saved-strip {
    display: flex; gap: 12px; overflow-x: auto; padding: 0.5rem 0;
  }
  .saved-strip::-webkit-scrollbar { height: 4px; }
  .saved-strip::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); border-radius: 2px; }

  .saved-card {
    flex-shrink: 0; width: 240px; padding: 0.8rem;
    background: rgba(20,20,28,0.9); border: 1px solid rgba(255,255,255,0.1);
    border-radius: 10px; position: relative;
  }
  .saved-card-name {
    font-family: var(--f-display); font-size: 1.1rem; color: #fff;
    text-transform: uppercase; margin-bottom: 0.3rem;
  }
  .saved-card-icons {
    display: flex; gap: 4px; margin-bottom: 0.4rem;
  }
  .saved-card-stat {
    font-family: var(--f-mono); font-size: 0.7rem;
    color: rgba(255,255,255,0.5);
  }
  .saved-card-actions {
    display: flex; gap: 0.5rem; margin-top: 0.5rem;
  }
  .saved-card-btn {
    font-family: var(--f-display); font-size: 0.75rem; text-transform: uppercase;
    padding: 0.3rem 0.7rem; border-radius: 6px; cursor: pointer; border: none;
    transition: opacity 0.15s;
  }
  .saved-card-btn.enter { background: var(--c-green); color: #fff; }
  .saved-card-btn.delete { background: var(--c-red); color: #fff; }
  .saved-card-btn:hover { opacity: 0.85; }

  .clear-btn {
    background: none; border: none; color: rgba(255,255,255,0.4);
    font-size: 0.75rem; cursor: pointer; text-decoration: underline;
    font-family: var(--f-body);
  }
  .clear-btn:hover { color: var(--c-red); }

  @media (max-width: 900px) {
    .armory-layout { grid-template-columns: 1fr; }
    .armory-header { padding: 1rem; }
    .armory-shell { padding: 1rem; }
  }
`;

/* ── Complexity tier display ──────────────────────────────────── */

const TIER_LABELS: Record<ComplexityTier, { label: string; color: string }> = {
  lean: { label: 'Lean', color: '#2ecc71' },
  tactical: { label: 'Tactical', color: '#FFD600' },
  heavy: { label: 'Heavy', color: '#FF9F1C' },
  overloaded: { label: 'Overloaded', color: '#eb4d4b' },
};

function weightColor(w: number): string {
  if (w <= 6) return '#2ecc71';
  if (w <= 12) return '#FFD600';
  if (w <= 18) return '#FF9F1C';
  return '#eb4d4b';
}

/* ── Player ID helper ─────────────────────────────────────────── */

function getPlayerId(): string {
  // Read from cookie
  const match = document.cookie.match(/cogcage_pid=([^;]+)/);
  if (match) return match[1];
  // Fallback: localStorage
  let id = localStorage.getItem('cogcage_pid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('cogcage_pid', id);
  }
  return id;
}

/* ── Component ────────────────────────────────────────────────── */

export default function Armory({ returnTo }: { returnTo?: string }) {
  const [filter, setFilter] = useState<'all' | CardType>('all');
  const [loadout, setLoadout] = useState<string[]>([]);
  const [savedLoadouts, setSavedLoadouts] = useState<SavedLoadout[]>([]);
  const [loadoutName, setLoadoutName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [resolvedReturnTo, setResolvedReturnTo] = useState(returnTo || '');

  // Inject styles
  useEffect(() => {
    const id = 'armory-global-styles';
    if (!document.getElementById(id)) {
      const style = document.createElement('style');
      style.id = id;
      style.textContent = armoryStyles;
      document.head.appendChild(style);
    }
    // Store playerId in localStorage as fallback
    const pid = getPlayerId();
    localStorage.setItem('cogcage_pid', pid);
    // Read returnTo from URL if not passed as prop
    if (!returnTo) {
      const params = new URLSearchParams(window.location.search);
      const rt = params.get('returnTo');
      if (rt) setResolvedReturnTo(rt);
    }
  }, [returnTo]);

  // Fetch saved loadouts
  const fetchLoadouts = useCallback(async () => {
    try {
      const res = await fetch('/api/armory');
      const data = await res.json();
      setSavedLoadouts(data.loadouts ?? []);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLoadouts(); }, [fetchLoadouts]);

  // Stats
  const stats: LoadoutStats = calculateLoadoutStats(loadout);

  // Filter cards
  const displayCards = filter === 'all'
    ? ALL_CARDS
    : ALL_CARDS.filter((c) => c.type === filter);

  // Can we add this card?
  const canAdd = (card: CardData): boolean => {
    if (loadout.length >= MAX_LOADOUT_SLOTS) return false;
    if (card.type === 'armor') {
      const armorCount = loadout.filter((id) => getCard(id)?.type === 'armor').length;
      if (armorCount >= MAX_ARMOR_CARDS) return false;
    }
    return true;
  };

  const isInLoadout = (cardId: string): boolean => loadout.includes(cardId);

  const toggleCard = (cardId: string) => {
    setError('');
    if (isInLoadout(cardId)) {
      setLoadout((prev) => {
        const idx = prev.indexOf(cardId);
        return [...prev.slice(0, idx), ...prev.slice(idx + 1)];
      });
    } else {
      const card = getCard(cardId);
      if (!card) return;
      if (!canAdd(card)) {
        if (loadout.length >= MAX_LOADOUT_SLOTS) setError('Loadout full (6 cards max)');
        else setError('Only 1 armor card allowed');
        return;
      }
      setLoadout((prev) => [...prev, cardId]);
    }
  };

  const removeSlot = (index: number) => {
    setLoadout((prev) => [...prev.slice(0, index), ...prev.slice(index + 1)]);
    setError('');
  };

  const handleSave = async () => {
    if (!loadoutName.trim() || loadout.length === 0) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/armory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name: loadoutName.trim(), cards: loadout }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSavedLoadouts(data.loadouts);
        setLoadoutName('');
        setLoadout([]);
      }
    } catch {
      setError('Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (loadoutId: string) => {
    try {
      const res = await fetch(`/api/armory/${loadoutId}`, { method: 'DELETE' });
      const data = await res.json();
      setSavedLoadouts(data.loadouts ?? []);
    } catch { /* ignore */ }
  };

  const handleEnterArena = (saved: SavedLoadout) => {
    // Navigate to play page with loadout params in URL
    const params = new URLSearchParams();
    params.set('loadout', saved.cards.join(','));
    params.set('loadoutName', saved.name);
    window.location.href = `/play?${params.toString()}`;
  };

  const handleLoadFromSaved = (saved: SavedLoadout) => {
    setLoadout([...saved.cards]);
    setLoadoutName(saved.name);
  };

  const tierInfo = TIER_LABELS[stats.complexityTier];

  return (
    <div className="armory-root">
      {/* Header */}
      <header className="armory-header">
        <a href="/" className="armory-logo">CogCage</a>
        <nav className="armory-nav">
          {resolvedReturnTo ? (
            <a href={resolvedReturnTo} style={{ color: '#FFD600', fontFamily: "'Bangers', display", fontSize: '1rem' }}>
              Back to Lobby
            </a>
          ) : (
            <>
              <a href="/play">Play</a>
              <a href="/armory" className="active">Armory</a>
            </>
          )}
        </nav>
      </header>

      <main className="armory-shell">
        <div className="armory-layout">
          {/* Left: Card Gallery */}
          <div className="gallery-panel">
            <div className="panel-title">Card Gallery</div>

            <div className="filter-tabs">
              {(['all', 'weapon', 'armor', 'tool'] as const).map((f) => (
                <button
                  key={f}
                  className={`filter-tab ${filter === f ? 'active' : ''}`}
                  onClick={() => setFilter(f)}
                >
                  {f === 'all' ? 'All' : f === 'weapon' ? 'Weapons' : f === 'armor' ? 'Armor' : 'Tools'}
                  {f !== 'all' && (
                    <span style={{ marginLeft: 4, opacity: 0.5 }}>
                      ({ALL_CARDS.filter((c) => c.type === f).length})
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="card-grid">
              {displayCards.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  selected={isInLoadout(card.id)}
                  disabled={!isInLoadout(card.id) && !canAdd(card)}
                  onClick={() => toggleCard(card.id)}
                />
              ))}
            </div>
          </div>

          {/* Right: Loadout Builder */}
          <div className="builder-panel" style={{ position: 'sticky', top: 70 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.6rem' }}>
              <div className="panel-title" style={{ marginBottom: 0 }}>Loadout</div>
              {loadout.length > 0 && (
                <button className="clear-btn" onClick={() => { setLoadout([]); setError(''); }}>
                  Clear all
                </button>
              )}
            </div>

            {/* Slot grid */}
            <div className="slot-grid">
              {Array.from({ length: MAX_LOADOUT_SLOTS }).map((_, i) => {
                const cardId = loadout[i];
                const card = cardId ? getCard(cardId) : undefined;
                return (
                  <div key={i} className="slot">
                    {card ? (
                      <>
                        <Card card={card} mini onClick={() => removeSlot(i)} />
                        <button className="slot-remove" onClick={(e) => { e.stopPropagation(); removeSlot(i); }}>✕</button>
                      </>
                    ) : (
                      <span className="slot-empty">+</span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Stats summary */}
            <div className="stats-summary">
              {/* Weight */}
              <div className="stat-row">
                <span className="stat-label">Weight</span>
                <div className="stat-bar-shell">
                  <div className="stat-bar-fill" style={{
                    width: `${Math.min(100, (stats.totalWeight / 24) * 100)}%`,
                    background: weightColor(stats.totalWeight),
                  }} />
                </div>
                <span className="stat-value">{stats.totalWeight}</span>
              </div>

              {/* Complexity */}
              <div className="stat-row">
                <span className="stat-label">Complexity</span>
                <div className="stat-bar-shell">
                  <div className="stat-bar-fill" style={{
                    width: `${Math.min(100, (stats.totalOverhead / 12) * 100)}%`,
                    background: tierInfo.color,
                  }} />
                </div>
                <span className="stat-value" style={{ color: tierInfo.color }}>{tierInfo.label}</span>
              </div>

              {/* Armor */}
              <div className="stat-row">
                <span className="stat-label">Armor</span>
                <div className="stat-bar-shell">
                  <div className="stat-bar-fill" style={{
                    width: `${(stats.armorValue / 60) * 100}%`,
                    background: '#00e5ff',
                  }} />
                </div>
                <span className="stat-value">{stats.armorValue}% red.</span>
              </div>

              {/* Move cost */}
              <div className="stat-row">
                <span className="stat-label">Move Cost</span>
                <div style={{ flex: 1 }} />
                <span className="stat-value" style={{
                  color: stats.moveCost <= 4 ? '#2ecc71' : stats.moveCost <= 6 ? '#FFD600' : '#eb4d4b',
                }}>
                  {stats.moveCost}e/move
                </span>
              </div>
            </div>

            {error && (
              <div style={{ color: '#eb4d4b', fontSize: '0.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
                {error}
              </div>
            )}

            {/* Save */}
            <div className="save-row">
              <input
                className="save-input"
                type="text"
                placeholder="Loadout name..."
                value={loadoutName}
                onChange={(e) => setLoadoutName(e.target.value)}
                maxLength={30}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
              />
              <button
                className="save-btn"
                disabled={!loadoutName.trim() || loadout.length === 0 || saving}
                onClick={handleSave}
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
            {resolvedReturnTo && savedLoadouts.length > 0 && (
              <a
                href={resolvedReturnTo}
                style={{
                  display: 'block', marginTop: '0.8rem', textAlign: 'center',
                  fontFamily: "'Bangers', display", fontSize: '1.1rem', textTransform: 'uppercase',
                  padding: '0.6rem 1.2rem', background: '#FFD600', color: '#111',
                  borderRadius: '8px', textDecoration: 'none',
                }}
              >
                Back to Lobby
              </a>
            )}
          </div>
        </div>

        {/* Bottom: Saved Loadouts */}
        {savedLoadouts.length > 0 && (
          <div className="saved-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-title">Saved Loadouts</div>
            <div className="saved-strip">
              {savedLoadouts.map((saved) => (
                <div key={saved.id} className="saved-card">
                  <div className="saved-card-name">{saved.name}</div>
                  <div className="saved-card-icons">
                    {saved.cards.map((cid, i) => {
                      const c = getCard(cid);
                      return (
                        <span key={i} title={c?.name} style={{ fontSize: '1.1rem' }}>
                          {c?.icon ?? '?'}
                        </span>
                      );
                    })}
                  </div>
                  <div className="saved-card-stat">
                    ⚖️{saved.stats.totalWeight} wt · 🧠{saved.stats.totalOverhead} oh · 🛡️{saved.stats.armorValue}% def
                  </div>
                  <div className="saved-card-actions">
                    <button className="saved-card-btn enter" onClick={() => handleEnterArena(saved)}>
                      Enter Arena
                    </button>
                    <button
                      className="saved-card-btn"
                      style={{ background: 'rgba(255,255,255,0.1)', color: '#fff' }}
                      onClick={() => handleLoadFromSaved(saved)}
                    >
                      Edit
                    </button>
                    <button className="saved-card-btn delete" onClick={() => handleDelete(saved.id)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
