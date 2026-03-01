import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from '@tanstack/react-router';
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
import { SKILL_POOL, getSkill } from '../lib/skills';
import type { SkillDefinition } from '../lib/skills';

/* ── Saved shell type (matches Redis schema) ───────────────── */

interface SavedLoadout {
  id: string;
  name: string;
  cards: string[];
  brainPrompt: string;
  skills: string[];
  createdAt: number;
  stats: { totalWeight: number; totalOverhead: number; armorValue: number };
}

/* ── Brain presets ────────────────────────────────────────────── */

const MAX_SKILLS = 3;
const MAX_BRAIN_CHARS = 600;

const BRAIN_PRESETS: Record<string, { label: string; prompt: string }> = {
  aggressive: {
    label: 'Aggressive',
    prompt: 'You are an aggressive melee fighter. ALWAYS close distance toward the enemy. Use MELEE_STRIKE when dist <= 1.5 and it\'s usable. Use DASH to close distance fast. Never retreat.',
  },
  defensive: {
    label: 'Defensive',
    prompt: 'You are a defensive fighter. Prioritize GUARD when your HP is below 50%. Stay at range 3-5. Use RANGED_SHOT when available. Only engage in melee as a last resort.',
  },
  sniper: {
    label: 'Sniper',
    prompt: 'You are a ranged specialist. ALWAYS maintain distance 3-8 from enemy. Use RANGED_SHOT when dist 2-8 and usable. MOVE away if enemy gets within range 2. Never use melee.',
  },
  balanced: {
    label: 'Balanced',
    prompt: 'You are a balanced tactical fighter. Use RANGED_SHOT at range 3-6. Close to melee when enemy HP is below 40%. Use GUARD when your HP < 40% and energy is low.',
  },
  glass_cannon: {
    label: 'Glass Cannon',
    prompt: 'You are a glass cannon. Maximize damage output every turn. Always attack \u2014 never GUARD. Use highest-damage attack available. Use DASH to stay in attack range.',
  },
};

const SKILL_CATEGORY_COLORS: Record<string, string> = {
  intel: '#00E5FF',
  combat: '#EB4D4B',
  utility: '#FFD600',
  control: '#7C3AED',
};

/* ── Styles ──────────────────────────────────────────────────── */

const armoryStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&family=IBM+Plex+Mono:wght@400;600&display=swap');

  /* ── Landing-page visual system ── */
  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --f-mono: 'IBM Plex Mono', monospace;
  }

  .armory-root {
    min-height: 100vh;
    font-family: var(--f-body);
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    background-image:
      radial-gradient(circle at 10% 20%, rgba(255,214,0,0.12) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(235,77,75,0.07) 0%, transparent 40%),
      repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.025) 10px, rgba(0,0,0,0.025) 20px);
    color: var(--c-dark);
  }

  .armory-back-link {
    display: inline-flex; align-items: center; gap: 0.4rem;
    font-family: var(--f-display); font-size: 1rem; text-decoration: none;
    color: var(--c-red); text-shadow: 1px 1px 0 rgba(0,0,0,0.15);
    padding: 0.4rem 0; margin-bottom: 0.75rem;
  }
  .armory-back-link:hover { opacity: 0.8; }

  .armory-shell { padding: 1.5rem 2rem 3rem; max-width: 1400px; margin: 0 auto; }

  .armory-layout {
    display: grid; grid-template-columns: 1fr 340px; gap: 2rem;
    align-items: start;
  }

  /* ── Panels — white cards with hard shadow (landing DNA) ── */
  .gallery-panel, .builder-panel, .saved-panel {
    background: #fff;
    border: 3px solid #000;
    box-shadow: 6px 6px 0 #000;
    border-radius: 12px; padding: 1.2rem;
  }

  .panel-title {
    font-family: var(--f-display); font-size: 2.5rem; text-transform: uppercase;
    letter-spacing: 2px; margin-bottom: 1.2rem; color: var(--c-dark);
    text-shadow: 3px 3px 0 var(--c-orange);
  }

  .filter-tabs {
    display: flex; gap: 0.5rem; margin-bottom: 1rem; flex-wrap: wrap;
  }
  .filter-tab {
    font-family: var(--f-body); font-weight: 800; font-size: 0.8rem;
    text-transform: uppercase; padding: 0.35rem 0.8rem; border-radius: 6px;
    border: 2px solid rgba(0,0,0,0.2); background: #fff;
    color: rgba(0,0,0,0.45); cursor: pointer; transition: all 0.15s;
  }
  .filter-tab:hover { border-color: rgba(0,0,0,0.5); color: #000; }
  .filter-tab.active {
    background: var(--c-yellow); color: #000;
    border: 3px solid #000; box-shadow: 3px 3px 0 #000;
    font-family: var(--f-display); font-size: 1rem;
  }

  .card-grid {
    display: flex; flex-wrap: wrap; gap: 10px; justify-content: center;
  }

  .armory-card:hover {
    transform: scale(1.06) translateY(-2px);
    z-index: 5;
  }

  /* ── Builder / Shell panel ── */
  .slot-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    margin-bottom: 1rem;
  }
  .slot {
    width: 120px; height: 180px; border-radius: 10px;
    border: 3px dashed rgba(0,0,0,0.18);
    display: grid; place-items: center;
    cursor: pointer; transition: border-color 0.15s, background 0.15s;
    position: relative; overflow: hidden;
    background: rgba(0,0,0,0.03);
    color: rgba(0,0,0,0.18); font-size: 2rem;
  }
  .slot:hover { border-color: rgba(0,0,0,0.35); background: rgba(0,0,0,0.06); }
  .slot .slot-empty {
    font-size: 2rem; color: rgba(0,0,0,0.18);
  }
  .slot .slot-remove {
    position: absolute; top: 2px; right: 2px; width: 16px; height: 16px;
    border-radius: 50%; background: var(--c-red); color: #fff;
    font-size: 0.55rem; display: grid; place-items: center;
    cursor: pointer; border: 2px solid #000; opacity: 0; transition: opacity 0.15s;
  }
  .slot:hover .slot-remove { opacity: 1; }

  .stats-summary {
    display: flex; flex-direction: column; gap: 0.6rem;
    margin-bottom: 1rem;
  }
  .stat-row { display: flex; align-items: center; gap: 0.5rem; }
  .stat-label {
    font-family: var(--f-display); font-size: 1rem;
    color: var(--c-dark); width: 80px; flex-shrink: 0;
    text-transform: uppercase;
  }
  .stat-bar-shell {
    flex: 1; height: 10px; background: rgba(0,0,0,0.08);
    border: 1px solid rgba(0,0,0,0.12);
    border-radius: 999px; overflow: hidden;
  }
  .stat-bar-fill {
    height: 100%; border-radius: 999px;
    transition: width 0.3s ease, background 0.3s ease;
  }
  .stat-value {
    font-family: var(--f-mono); font-size: 0.75rem; color: rgba(0,0,0,0.5);
    min-width: 60px; text-align: right;
  }

  .save-row { display: flex; gap: 0.5rem; align-items: center; }
  .save-input {
    flex: 1; padding: 0.6rem 1rem; border-radius: 6px;
    border: 3px solid rgba(0,0,0,0.25); background: #f8f9fa;
    color: var(--c-dark); font-family: var(--f-body); font-weight: 800; font-size: 1rem;
    outline: none; transition: border-color 0.15s;
  }
  .save-input:focus { border-color: #000; box-shadow: 3px 3px 0 #000; }
  .save-input::placeholder { color: rgba(0,0,0,0.3); }

  .save-btn {
    font-family: var(--f-display); font-size: 1.3rem; text-transform: uppercase;
    padding: 0.6rem 2rem; background: var(--c-red); color: #fff;
    border: 3px solid #000; box-shadow: 4px 4px 0 #000;
    border-radius: 8px; cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .save-btn:active { transform: translateY(4px); box-shadow: none; }
  .save-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  /* ── Saved shells strip ── */
  .saved-strip { display: flex; gap: 12px; overflow-x: auto; padding: 0.5rem 0; }
  .saved-strip::-webkit-scrollbar { height: 4px; }
  .saved-strip::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 2px; }

  .saved-card {
    flex-shrink: 0; width: 240px; padding: 0.8rem;
    background: #fff; border: 3px solid #000;
    box-shadow: 4px 4px 0 #000;
    border-radius: 10px; position: relative;
  }
  .saved-card-name {
    font-family: var(--f-display); font-size: 1.1rem; color: var(--c-dark);
    text-transform: uppercase; margin-bottom: 0.3rem;
    text-shadow: 1px 1px 0 var(--c-orange);
  }
  .saved-card-icons { display: flex; gap: 4px; margin-bottom: 0.4rem; }
  .saved-card-stat {
    font-family: var(--f-mono); font-size: 0.7rem;
    color: rgba(0,0,0,0.45);
  }
  .saved-card-actions { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
  .saved-card-btn {
    font-family: var(--f-display); font-size: 0.75rem; text-transform: uppercase;
    padding: 0.3rem 0.7rem; border-radius: 6px; cursor: pointer;
    border: 2px solid #000; box-shadow: 2px 2px 0 #000;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .saved-card-btn:active { transform: translateY(2px); box-shadow: none; }
  .saved-card-btn.enter { background: #2ecc71; color: #fff; }
  .saved-card-btn.delete { background: var(--c-red); color: #fff; }
  .saved-card-btn:hover { opacity: 0.85; }

  .clear-btn {
    background: none; border: none; color: rgba(0,0,0,0.35);
    font-size: 0.75rem; cursor: pointer; text-decoration: underline;
    font-family: var(--f-body);
  }
  .clear-btn:hover { color: var(--c-red); }

  /* ── Skills + Brain panels ── */
  .skills-panel, .brain-panel {
    background: #fff;
    border: 3px solid #000;
    box-shadow: 6px 6px 0 #000;
    border-radius: 12px; padding: 1.2rem;
    margin-top: 1.5rem;
  }

  .skill-grid { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 0.6rem; }
  .skill-chip {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 4px 10px; border-radius: 6px;
    font-family: var(--f-body); font-size: 0.8rem; font-weight: 800;
    cursor: pointer; transition: all 0.15s;
    border: 2px solid rgba(0,0,0,0.2);
    background: #f8f9fa;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.15);
    color: rgba(0,0,0,0.55);
  }
  .skill-chip:hover { border-color: #000; color: #000; background: #fff; }
  .skill-chip.equipped {
    background: var(--c-dark); color: #fff;
    border-color: #000; box-shadow: 2px 2px 0 #000;
  }
  .skill-chip .skill-icon { font-size: 1.1rem; }
  .skill-chip .skill-meta {
    font-size: 0.65rem; font-weight: 600;
    color: rgba(0,0,0,0.35); margin-left: 2px;
  }
  .skill-chip.equipped .skill-meta { color: rgba(255,255,255,0.5); }

  .skill-slots { display: flex; gap: 8px; margin-bottom: 0.8rem; flex-wrap: wrap; }
  .skill-slot {
    display: inline-flex; align-items: center; gap: 6px;
    padding: 8px 14px; border-radius: 6px;
    font-size: 0.85rem; font-weight: 800;
    border: 3px dashed rgba(0,0,0,0.2);
    background: rgba(0,0,0,0.04);
    color: rgba(0,0,0,0.25);
    min-width: 80px; justify-content: center;
  }
  .skill-slot.filled {
    border-style: solid; border-color: #000;
    background: var(--c-dark); color: #fff;
    cursor: pointer; box-shadow: 2px 2px 0 #000;
  }
  .skill-slot.filled:hover { opacity: 0.8; }

  /* ── Brain panel ── */
  .brain-textarea {
    width: 100%; min-height: 100px; padding: 0.75rem;
    border-radius: 6px; border: 3px solid rgba(0,0,0,0.2);
    background: #f8f9fa; color: var(--c-dark);
    font-family: var(--f-mono); font-size: 0.8rem;
    outline: none; resize: vertical; transition: border-color 0.15s, box-shadow 0.15s;
  }
  .brain-textarea:focus { border-color: #000; box-shadow: 3px 3px 0 #000; }
  .brain-textarea::placeholder { color: rgba(0,0,0,0.28); }

  .preset-row { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 0.6rem; }
  .preset-btn {
    font-family: var(--f-body); font-weight: 800; font-size: 0.72rem;
    text-transform: uppercase; padding: 4px 10px; border-radius: 6px;
    border: 2px solid rgba(0,0,0,0.2); background: #fff;
    box-shadow: 2px 2px 0 rgba(0,0,0,0.12);
    color: rgba(0,0,0,0.5); cursor: pointer; transition: all 0.15s;
  }
  .preset-btn:hover { border-color: #000; color: #000; background: var(--c-yellow); box-shadow: 2px 2px 0 #000; }
  .preset-btn.active { background: var(--c-dark); color: #fff; border-color: #000; box-shadow: 2px 2px 0 #000; }

  .char-count {
    font-family: var(--f-mono); font-size: 0.7rem;
    color: rgba(0,0,0,0.3); text-align: right; margin-top: 0.3rem;
  }

  @media (max-width: 900px) {
    .armory-layout { grid-template-columns: 1fr; }
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
  const match = document.cookie.match(/moltpit_pid=([^;]+)/);
  if (match) return match[1];
  // Fallback: localStorage
  let id = localStorage.getItem('moltpit_pid');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('moltpit_pid', id);
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
  const [equippedSkills, setEquippedSkills] = useState<string[]>([]);
  const [brainPrompt, setBrainPrompt] = useState('');
  const navigate = useNavigate();

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
    localStorage.setItem('moltpit_pid', pid);
    // Read returnTo from URL if not passed as prop
    if (!returnTo) {
      const params = new URLSearchParams(window.location.search);
      const rt = params.get('returnTo');
      if (rt) setResolvedReturnTo(rt);
    }
  }, [returnTo]);

  // Fetch saved shells
  const fetchLoadouts = useCallback(async () => {
    try {
      const res = await fetch('/api/shell');
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
        if (loadout.length >= MAX_LOADOUT_SLOTS) setError('Shell full (6 cards max)');
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
    const wasFirstSave = savedLoadouts.length === 0;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/shell', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: loadoutName.trim(),
          cards: loadout,
          brainPrompt,
          skills: equippedSkills,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setSavedLoadouts(data.loadouts);
        setLoadoutName('');
        setLoadout([]);
        setBrainPrompt('');
        setEquippedSkills([]);
        if (wasFirstSave) {
          navigate({ to: '/play' });
          return;
        }
      }
    } catch {
      setError('Failed to save');
    }
    setSaving(false);
  };

  const handleDelete = async (loadoutId: string) => {
    try {
      const res = await fetch(`/api/shell/${loadoutId}`, { method: 'DELETE' });
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
    setBrainPrompt(saved.brainPrompt || '');
    setEquippedSkills(saved.skills || []);
  };

  const tierInfo = TIER_LABELS[stats.complexityTier];

  return (
    <div className="armory-root">
      {/* Header */}
      <header className="armory-header">
        <a href="/" className="armory-logo">The Molt Pit</a>
        <nav className="armory-nav">
          {resolvedReturnTo ? (
            <a href={resolvedReturnTo} style={{ color: '#FFD600', fontFamily: "'Bangers', display", fontSize: '1rem' }}>
              Back to The Tank
            </a>
          ) : (
            <>
              <a href="/play">Play</a>
              <a href="/shell" className="active">The Shell</a>
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
              <div className="panel-title" style={{ marginBottom: 0 }}>Shell</div>
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
                placeholder="Shell name..."
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
                Back to The Tank
              </a>
            )}
          </div>
        </div>

        {/* Skills Panel */}
        <div className="skills-panel">
          <div className="panel-title">Claws (max {MAX_SKILLS})</div>

          {/* Equipped skill slots */}
          <div className="skill-slots">
            {Array.from({ length: MAX_SKILLS }).map((_, i) => {
              const sid = equippedSkills[i];
              const skill = sid ? getSkill(sid) : undefined;
              return skill ? (
                <div
                  key={i}
                  className="skill-slot filled"
                  style={{ borderColor: SKILL_CATEGORY_COLORS[skill.category] }}
                  onClick={() => setEquippedSkills(prev => prev.filter((_, idx) => idx !== i))}
                  title="Click to unequip"
                >
                  <span className="skill-icon">{skill.icon}</span> {skill.name}
                </div>
              ) : (
                <div key={i} className="skill-slot">+</div>
              );
            })}
          </div>

          {/* Available skills */}
          <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', marginBottom: '0.4rem' }}>
            Available Claws (click to equip)
          </div>
          <div className="skill-grid">
            {SKILL_POOL.map((skill) => {
              const isEquipped = equippedSkills.includes(skill.id);
              const isFull = equippedSkills.length >= MAX_SKILLS && !isEquipped;
              return (
                <div
                  key={skill.id}
                  className={`skill-chip ${isEquipped ? 'equipped' : ''}`}
                  style={{
                    borderColor: isEquipped ? SKILL_CATEGORY_COLORS[skill.category] : 'transparent',
                    opacity: isFull ? 0.4 : 1,
                    cursor: isFull ? 'not-allowed' : 'pointer',
                  }}
                  onClick={() => {
                    if (isEquipped) {
                      setEquippedSkills(prev => prev.filter(id => id !== skill.id));
                    } else if (!isFull) {
                      setEquippedSkills(prev => [...prev, skill.id]);
                    }
                  }}
                  title={`${skill.description}\nEnergy: ${skill.energyCost} | CD: ${skill.cooldownTurns}t | ${skill.rarity}`}
                >
                  <span className="skill-icon">{skill.icon}</span>
                  {skill.name}
                  <span className="skill-meta">{skill.energyCost}e {skill.cooldownTurns > 0 ? `${skill.cooldownTurns}cd` : ''}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Brain Panel */}
        <div className="brain-panel">
          <div className="panel-title">Brain (Directive)</div>

          <div className="preset-row">
            {Object.entries(BRAIN_PRESETS).map(([key, { label }]) => (
              <button
                key={key}
                className="preset-btn"
                onClick={() => setBrainPrompt(BRAIN_PRESETS[key].prompt)}
              >
                {label}
              </button>
            ))}
          </div>

          <textarea
            className="brain-textarea"
            placeholder="Write your crawler's directive... (or click a preset above)"
            value={brainPrompt}
            onChange={(e) => setBrainPrompt(e.target.value.slice(0, MAX_BRAIN_CHARS))}
            maxLength={MAX_BRAIN_CHARS}
          />
          <div className="char-count">{brainPrompt.length} / {MAX_BRAIN_CHARS} chars</div>
        </div>

        {/* Bottom: Saved Shells */}
        {savedLoadouts.length > 0 && (
          <div className="saved-panel" style={{ marginTop: '1.5rem' }}>
            <div className="panel-title">Saved Shells</div>
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
