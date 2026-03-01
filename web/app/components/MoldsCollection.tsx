import { useState, useCallback, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import {
  ALL_CARDS,
  getCard,
  calculateLoadoutStats,
  MAX_LOADOUT_SLOTS,
  MAX_ARMOR_CARDS,
} from '../lib/cards'
import type { Card, CardType } from '../lib/cards'

/* ── Constants ─────────────────────────────────────────── */

const ACTIVE_MOLD_KEY = 'moltpit_active_mold'
const MAX_DIRECTIVE_CHARS = 2000

const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o-mini', provider: 'OpenAI', bolt: '\u26A1' },
  { id: 'claude-haiku', name: 'Claude Haiku', provider: 'Anthropic', bolt: '\u26A1\u26A1' },
  { id: 'gemini-flash', name: 'Gemini Flash', provider: 'Google', bolt: '\u26A1' },
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'OpenAI', bolt: '\u26A1\u26A1' },
]

const ARMOR_TIERS = [
  { id: 'light', label: 'Light', value: 33, desc: '1.0x dmg taken' },
  { id: 'medium', label: 'Medium', value: 66, desc: '0.9x dmg taken' },
  { id: 'heavy', label: 'Heavy', value: 100, desc: '0.82x dmg taken' },
]

const CARD_TYPE_COLORS: Record<string, string> = {
  'weapon-melee': '#EB4D4B',
  'weapon-ranged': '#00E5FF',
  armor: '#FFD600',
  tool: '#FF9F1C',
}

/* ── Helpers ───────────────────────────────────────────── */

function parseDirective(raw: string): { model: string; text: string } {
  const match = raw.match(/^\[model:([^\]]+)\]\n?/)
  if (match) return { model: match[1], text: raw.slice(match[0].length) }
  return { model: 'gpt-4o-mini', text: raw }
}

function encodeDirective(model: string, text: string): string {
  return `[model:${model}]\n${text}`
}

function getMoldType(cards: string[]): string {
  const cardData = cards.map(getCard).filter((c): c is Card => !!c)
  const hasMelee = cardData.some((c) => c.type === 'weapon' && c.subtype === 'melee')
  const hasRanged = cardData.some((c) => c.type === 'weapon' && c.subtype === 'ranged')
  if (hasMelee && hasRanged) return 'Hybrid'
  if (hasMelee) return 'Melee'
  if (hasRanged) return 'Ranged'
  return 'Utility'
}

function getArmorLabel(armorValue: number): string {
  if (armorValue >= 80) return 'Heavy'
  if (armorValue >= 50) return 'Medium'
  return 'Light'
}

function getCardTypeColor(card: Card): string {
  if (card.type === 'weapon')
    return CARD_TYPE_COLORS[`weapon-${card.subtype}`] || '#EB4D4B'
  return CARD_TYPE_COLORS[card.type] || '#666'
}

function getComplexity(cardCount: number) {
  if (cardCount <= 2) return { label: 'LOW', color: '#2ecc71', desc: 'Easy decisions' }
  if (cardCount === 3) return { label: 'MEDIUM', color: '#FFD600', desc: 'Normal' }
  if (cardCount === 4) return { label: 'HIGH', color: '#FF9F1C', desc: 'Hard for LLM' }
  return { label: 'OVERLOADED', color: '#EB4D4B', desc: 'Expect NO_OPs' }
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

/* ── Styles ────────────────────────────────────────────── */

const STYLES = `
  .molds-root {
    min-height: 100vh;
    background: #1A1A1A;
    color: #f0f0f5;
    font-family: 'Kanit', sans-serif;
  }

  .molds-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 2rem;
    border-bottom: 2px solid rgba(255,255,255,0.08);
  }

  .molds-title {
    font-family: 'Bangers', cursive;
    font-size: 2.4rem;
    letter-spacing: 2px;
    color: #fff;
    text-shadow: 3px 3px 0 rgba(0,0,0,0.5);
    margin: 0;
  }

  .btn-new-mold {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.7rem 1.4rem;
    font-family: 'Bangers', cursive;
    font-size: 1.1rem;
    letter-spacing: 1px;
    color: #1A1A1A;
    background: #FFD600;
    border: 3px solid #000;
    border-radius: 8px;
    box-shadow: 4px 4px 0 #000;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
    text-transform: uppercase;
  }
  .btn-new-mold:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #000;
  }
  .btn-new-mold:active {
    transform: translate(2px, 2px);
    box-shadow: 2px 2px 0 #000;
  }

  .molds-active-indicator {
    padding: 0.8rem 2rem;
    font-size: 0.9rem;
    color: rgba(255,255,255,0.5);
    border-bottom: 1px solid rgba(255,255,255,0.06);
  }
  .molds-active-indicator strong {
    color: #FFD600;
    font-weight: 700;
  }

  .molds-filters {
    display: flex;
    gap: 0.5rem;
    padding: 1rem 2rem;
    flex-wrap: wrap;
  }

  .filter-pill {
    padding: 0.4rem 1rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.85rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: rgba(255,255,255,0.5);
    background: rgba(255,255,255,0.05);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 20px;
    cursor: pointer;
    transition: all 0.15s;
  }
  .filter-pill:hover {
    color: rgba(255,255,255,0.8);
    border-color: rgba(255,255,255,0.2);
  }
  .filter-pill.active {
    color: #1A1A1A;
    background: #FFD600;
    border-color: #FFD600;
  }

  .molds-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1.5rem;
    padding: 1.5rem 2rem;
  }
  @media (max-width: 1024px) {
    .molds-grid { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 640px) {
    .molds-grid { grid-template-columns: 1fr; }
    .molds-header { padding: 1rem 1.2rem; }
    .molds-filters { padding: 0.8rem 1.2rem; }
    .molds-grid { padding: 1rem 1.2rem; }
  }

  /* ── Mold Card ──────────────────────────────────── */

  .mold-card {
    background: rgba(20, 20, 28, 0.9);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 12px;
    padding: 1.2rem;
    position: relative;
    transition: border-color 0.15s, transform 0.15s;
  }
  .mold-card:hover {
    border-color: rgba(255,255,255,0.2);
    transform: translateY(-2px);
  }
  .mold-card.active {
    border: 3px solid #FFD600;
    box-shadow: 0 0 20px rgba(255,214,0,0.15);
  }

  .mold-card-badge {
    position: absolute;
    top: 0.8rem;
    left: 0.8rem;
    padding: 0.2rem 0.6rem;
    font-family: 'Bangers', cursive;
    font-size: 0.75rem;
    letter-spacing: 1px;
    color: #1A1A1A;
    background: #FFD600;
    border-radius: 4px;
  }

  .mold-card-art {
    width: 100%;
    height: 100px;
    background: linear-gradient(135deg, rgba(255,214,0,0.08), rgba(0,229,255,0.08));
    border-radius: 8px;
    margin-bottom: 0.8rem;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    opacity: 0.5;
  }

  .mold-card-name {
    font-family: 'Bangers', cursive;
    font-size: 1.3rem;
    letter-spacing: 1px;
    color: #fff;
    text-transform: uppercase;
    margin: 0 0 0.3rem;
  }

  .mold-card-meta {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.45);
    margin-bottom: 0.1rem;
  }

  .mold-card-model {
    font-size: 0.8rem;
    color: rgba(255,255,255,0.4);
    margin-bottom: 0.8rem;
  }

  .stat-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .stat-label {
    width: 28px;
    color: rgba(255,255,255,0.5);
    font-family: 'IBM Plex Mono', monospace;
  }

  .stat-bar {
    flex: 1;
    height: 8px;
    background: rgba(255,255,255,0.08);
    border-radius: 4px;
    overflow: hidden;
  }

  .stat-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .stat-pct {
    width: 32px;
    text-align: right;
    color: rgba(255,255,255,0.6);
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
  }

  .mold-card-actions {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .btn-edit {
    flex: 1;
    padding: 0.5rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #fff;
    background: rgba(255,255,255,0.1);
    border: 2px solid rgba(255,255,255,0.15);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-edit:hover { background: rgba(255,255,255,0.18); }

  .btn-equip {
    flex: 1;
    padding: 0.5rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #1A1A1A;
    background: #00E5FF;
    border: 2px solid #00E5FF;
    border-radius: 6px;
    cursor: pointer;
    transition: opacity 0.15s;
  }
  .btn-equip:hover { opacity: 0.85; }
  .btn-equip.equipped {
    background: rgba(255,214,0,0.15);
    border-color: rgba(255,214,0,0.3);
    color: #FFD600;
    cursor: default;
  }

  /* ── Empty State ────────────────────────────────── */

  .molds-empty {
    grid-column: 1 / -1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 4rem 2rem;
    text-align: center;
  }

  .molds-empty-title {
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    letter-spacing: 2px;
    color: rgba(255,255,255,0.3);
    margin-bottom: 0.5rem;
  }

  .molds-empty-sub {
    font-size: 0.95rem;
    color: rgba(255,255,255,0.25);
    margin-bottom: 1.5rem;
  }

  .btn-create-first {
    padding: 0.85rem 2rem;
    font-family: 'Bangers', cursive;
    font-size: 1.3rem;
    letter-spacing: 2px;
    color: #1A1A1A;
    background: #FFD600;
    border: 3px solid #000;
    border-radius: 10px;
    box-shadow: 4px 4px 0 #000;
    cursor: pointer;
    transition: transform 0.1s, box-shadow 0.1s;
  }
  .btn-create-first:hover {
    transform: translate(-2px, -2px);
    box-shadow: 6px 6px 0 #000;
  }

  /* ── Editor Overlay ─────────────────────────────── */

  .editor-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    background: rgba(0,0,0,0.7);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    overflow-y: auto;
  }

  .editor-panel {
    width: 100%;
    max-width: 1200px;
    background: #1A1A1A;
    min-height: 100vh;
  }

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.2rem 1.5rem;
    border-bottom: 2px solid rgba(255,255,255,0.08);
    gap: 0.5rem;
  }

  .editor-back {
    font-size: 0.85rem;
    font-weight: 700;
    color: rgba(255,255,255,0.4);
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Kanit', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
  }
  .editor-back:hover { color: rgba(255,255,255,0.7); }

  .editor-title {
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
    letter-spacing: 1px;
    color: #fff;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .editor-actions {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-shrink: 0;
  }

  .btn-save {
    padding: 0.6rem 1.5rem;
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    letter-spacing: 1px;
    color: #1A1A1A;
    background: #FFD600;
    border: 2px solid #000;
    border-radius: 6px;
    box-shadow: 3px 3px 0 #000;
    cursor: pointer;
    transition: transform 0.1s;
    white-space: nowrap;
  }
  .btn-save:hover { transform: translate(-1px, -1px); box-shadow: 4px 4px 0 #000; }
  .btn-save:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }

  .editor-body {
    display: grid;
    grid-template-columns: 280px 1fr 240px;
    gap: 0;
    min-height: calc(100vh - 60px);
  }
  @media (max-width: 900px) {
    .editor-body { grid-template-columns: 1fr; }
  }

  .editor-col {
    padding: 1.2rem;
    border-right: 1px solid rgba(255,255,255,0.06);
  }
  .editor-col:last-child { border-right: none; }

  .editor-section-title {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    letter-spacing: 1px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.6);
    margin: 0 0 0.8rem;
  }

  /* ── Claw Browser ──────────────────────────────── */

  .claw-filters {
    display: flex;
    gap: 0.3rem;
    margin-bottom: 0.8rem;
    flex-wrap: wrap;
  }

  .claw-filter {
    padding: 0.25rem 0.6rem;
    font-size: 0.72rem;
    font-weight: 600;
    text-transform: uppercase;
    color: rgba(255,255,255,0.4);
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 4px;
    cursor: pointer;
    font-family: 'Kanit', sans-serif;
  }
  .claw-filter:hover { color: rgba(255,255,255,0.7); }
  .claw-filter.active {
    color: #fff;
    background: rgba(255,255,255,0.12);
    border-color: rgba(255,255,255,0.2);
  }

  .claw-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-height: calc(100vh - 200px);
    overflow-y: auto;
  }

  .claw-card {
    padding: 0.7rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    border-left: 3px solid;
    transition: background 0.15s;
  }
  .claw-card:hover { background: rgba(255,255,255,0.06); }
  .claw-card.equipped {
    background: rgba(255,214,0,0.05);
    border-color: rgba(255,214,0,0.2);
  }

  .claw-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.3rem;
  }

  .claw-card-name {
    font-weight: 700;
    font-size: 0.82rem;
    color: #fff;
  }

  .claw-card-stats {
    font-size: 0.7rem;
    color: rgba(255,255,255,0.4);
    font-family: 'IBM Plex Mono', monospace;
  }

  .claw-btn {
    padding: 0.2rem 0.5rem;
    font-size: 0.68rem;
    font-weight: 700;
    text-transform: uppercase;
    border-radius: 3px;
    border: none;
    cursor: pointer;
    font-family: 'Kanit', sans-serif;
  }
  .claw-btn.add {
    color: #1A1A1A;
    background: #00E5FF;
  }
  .claw-btn.equipped-badge {
    color: #FFD600;
    background: rgba(255,214,0,0.1);
    cursor: default;
  }

  /* ── Mold Config ────────────────────────────────── */

  .config-input {
    width: 100%;
    padding: 0.6rem 0.8rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.95rem;
    font-weight: 700;
    background: rgba(255,255,255,0.05);
    border: 2px solid rgba(255,255,255,0.12);
    border-radius: 6px;
    color: #fff;
    outline: none;
    margin-bottom: 1rem;
    box-sizing: border-box;
  }
  .config-input:focus { border-color: #00E5FF; }

  .equipped-list {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1rem;
  }

  .equipped-item {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.5rem 0.7rem;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    font-size: 0.85rem;
  }

  .equipped-remove {
    font-size: 0.7rem;
    font-weight: 700;
    color: #EB4D4B;
    background: none;
    border: none;
    cursor: pointer;
    font-family: 'Kanit', sans-serif;
    text-transform: uppercase;
  }
  .equipped-remove:hover { color: #ff6b6b; }

  .armor-selector {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
    margin-bottom: 1.2rem;
  }

  .armor-option {
    display: flex;
    align-items: center;
    gap: 0.6rem;
    padding: 0.5rem 0.7rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.85rem;
    transition: border-color 0.15s;
  }
  .armor-option:hover { border-color: rgba(255,255,255,0.2); }
  .armor-option.selected {
    border-color: #FFD600;
    background: rgba(255,214,0,0.05);
  }

  .armor-radio {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .armor-option.selected .armor-radio {
    border-color: #FFD600;
  }
  .armor-option.selected .armor-radio::after {
    content: '';
    width: 8px;
    height: 8px;
    background: #FFD600;
    border-radius: 50%;
  }

  .armor-label { font-weight: 600; color: #fff; }
  .armor-desc { font-size: 0.75rem; color: rgba(255,255,255,0.35); margin-left: auto; }

  .directive-area {
    width: 100%;
    min-height: 120px;
    padding: 0.7rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.82rem;
    line-height: 1.5;
    background: rgba(255,255,255,0.04);
    border: 2px solid rgba(255,255,255,0.1);
    border-radius: 6px;
    color: #fff;
    outline: none;
    resize: vertical;
    box-sizing: border-box;
  }
  .directive-area:focus { border-color: #00E5FF; }
  .directive-area::placeholder { color: rgba(255,255,255,0.2); }

  .directive-counter {
    text-align: right;
    font-size: 0.72rem;
    font-family: 'IBM Plex Mono', monospace;
    color: rgba(255,255,255,0.3);
    margin-top: 0.3rem;
    margin-bottom: 0.6rem;
  }
  .directive-counter.warn { color: #FF9F1C; }
  .directive-counter.over { color: #EB4D4B; }

  .directive-tips {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.3);
    line-height: 1.6;
    margin-bottom: 1rem;
  }
  .directive-tips span { display: block; }

  .model-selector {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .model-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.5rem 0.7rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 6px;
    cursor: pointer;
    font-size: 0.82rem;
    transition: border-color 0.15s;
  }
  .model-option:hover { border-color: rgba(255,255,255,0.2); }
  .model-option.selected {
    border-color: #00E5FF;
    background: rgba(0,229,255,0.05);
  }

  .model-name { font-weight: 600; color: #fff; }
  .model-provider { font-size: 0.72rem; color: rgba(255,255,255,0.35); }
  .model-bolt { font-size: 0.85rem; }

  /* ── Live Stats ─────────────────────────────────── */

  .live-stat-block { margin-bottom: 1rem; }

  .live-stat-label {
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: rgba(255,255,255,0.5);
    margin-bottom: 0.3rem;
    font-family: 'IBM Plex Mono', monospace;
  }

  .live-stat-bar {
    height: 10px;
    background: rgba(255,255,255,0.08);
    border-radius: 5px;
    overflow: hidden;
    margin-bottom: 0.2rem;
  }

  .live-stat-bar-fill {
    height: 100%;
    border-radius: 5px;
    transition: width 0.3s;
  }

  .live-stat-pct {
    font-size: 0.7rem;
    font-family: 'IBM Plex Mono', monospace;
    color: rgba(255,255,255,0.4);
    text-align: right;
  }

  .complexity-badge {
    display: inline-block;
    padding: 0.3rem 0.7rem;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-radius: 4px;
    font-family: 'Kanit', sans-serif;
  }

  .complexity-desc {
    font-size: 0.75rem;
    color: rgba(255,255,255,0.35);
    margin-top: 0.3rem;
  }

  .tips-box {
    margin-top: 1.5rem;
    padding: 0.8rem;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 6px;
    font-size: 0.75rem;
    color: rgba(255,255,255,0.35);
    line-height: 1.6;
  }
  .tips-box strong {
    color: rgba(255,255,255,0.5);
    display: block;
    margin-bottom: 0.3rem;
    font-family: 'IBM Plex Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-size: 0.68rem;
  }

  /* ── Toast ──────────────────────────────────────── */

  .molds-toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 0.8rem 1.5rem;
    background: #2ecc71;
    color: #fff;
    font-weight: 700;
    border-radius: 8px;
    box-shadow: 4px 4px 0 rgba(0,0,0,0.3);
    z-index: 200;
    animation: molds-toast-in 0.3s ease-out;
    font-family: 'Kanit', sans-serif;
    font-size: 0.9rem;
  }
  .molds-toast.error { background: #EB4D4B; }

  @keyframes molds-toast-in {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  /* ── Mobile editor tabs ─────────────────────────── */

  .editor-tabs {
    display: none;
    border-bottom: 1px solid rgba(255,255,255,0.08);
  }

  @media (max-width: 900px) {
    .editor-tabs {
      display: flex;
      gap: 0;
    }
    .editor-tab {
      flex: 1;
      padding: 0.6rem;
      font-size: 0.72rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: rgba(255,255,255,0.4);
      background: none;
      border: none;
      border-bottom: 2px solid transparent;
      cursor: pointer;
      text-align: center;
      font-family: 'Kanit', sans-serif;
    }
    .editor-tab.active {
      color: #FFD600;
      border-bottom-color: #FFD600;
    }

    .editor-col.mobile-hidden { display: none; }
    .editor-col.mobile-visible { display: block; }
  }

  /* ── Delete button ──────────────────────────────── */

  .btn-delete {
    padding: 0.5rem 1rem;
    font-family: 'Kanit', sans-serif;
    font-size: 0.8rem;
    font-weight: 700;
    text-transform: uppercase;
    color: #EB4D4B;
    background: rgba(235, 77, 75, 0.08);
    border: 1px solid rgba(235, 77, 75, 0.2);
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.15s;
  }
  .btn-delete:hover { background: rgba(235, 77, 75, 0.15); }
`

/* ── Main Component ────────────────────────────────── */

export default function MoldsCollection() {
  const shells = useQuery(api.shells.list)
  const createShell = useMutation(api.shells.create)
  const updateShell = useMutation(api.shells.update)
  const removeShell = useMutation(api.shells.remove)

  const [activeMoldId, setActiveMoldId] = useState<string>(() => {
    try {
      return localStorage.getItem(ACTIVE_MOLD_KEY) || ''
    } catch {
      return ''
    }
  })
  const [filter, setFilter] = useState('all')
  const [editorShellId, setEditorShellId] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null)

  const setActiveMold = useCallback((id: string) => {
    setActiveMoldId(id)
    try {
      localStorage.setItem(ACTIVE_MOLD_KEY, id)
    } catch {
      /* noop */
    }
  }, [])

  const showToast = useCallback((msg: string, error = false) => {
    setToast({ msg, error })
    setTimeout(() => setToast(null), 2500)
  }, [])

  const filteredShells = useMemo(() => {
    if (!shells) return []
    if (filter === 'all') return shells
    return shells.filter((s) => getMoldType(s.cards).toLowerCase() === filter)
  }, [shells, filter])

  const handleSave = useCallback(
    async (data: {
      name: string
      cards: string[]
      directive: string
      skills: string[]
      stats: { totalWeight: number; totalOverhead: number; armorValue: number }
    }) => {
      try {
        if (editorShellId === 'new') {
          const id = await createShell(data)
          if (!activeMoldId && id) setActiveMold(id as string)
          showToast('Mold created!')
        } else if (editorShellId) {
          await updateShell({ shellId: editorShellId as any, ...data })
          showToast('Mold saved!')
        }
        setEditorShellId(null)
      } catch (e: any) {
        showToast(e.message || 'Save failed', true)
      }
    },
    [editorShellId, createShell, updateShell, activeMoldId, setActiveMold, showToast],
  )

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await removeShell({ shellId: id as any })
        if (activeMoldId === id) setActiveMold('')
        showToast('Mold deleted')
        setEditorShellId(null)
      } catch (e: any) {
        showToast(e.message || 'Delete failed', true)
      }
    },
    [removeShell, activeMoldId, setActiveMold, showToast],
  )

  const activeMold = shells?.find((s) => (s as any)._id === activeMoldId)
  const isLoading = shells === undefined

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />
      <div className="molds-root">
        {/* Header */}
        <div className="molds-header">
          <h1 className="molds-title">MY MOLDS</h1>
          <button className="btn-new-mold" onClick={() => setEditorShellId('new')}>
            + NEW MOLD
          </button>
        </div>

        {/* Active mold indicator */}
        {activeMold && (
          <div className="molds-active-indicator">
            Active Mold: <strong>{(activeMold as any).name}</strong>
          </div>
        )}

        {/* Filter pills */}
        <div className="molds-filters">
          {['all', 'melee', 'ranged', 'hybrid'].map((f) => (
            <button
              key={f}
              className={`filter-pill ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="molds-grid">
          {isLoading ? (
            <div className="molds-empty">
              <div
                style={{
                  color: 'rgba(255,255,255,0.25)',
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: '0.8rem',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                Loading molds...
              </div>
            </div>
          ) : filteredShells.length === 0 && filter === 'all' ? (
            <div className="molds-empty">
              <div className="molds-empty-title">NO MOLDS YET</div>
              <div className="molds-empty-sub">
                Create your first mold to start fighting.
              </div>
              <button
                className="btn-create-first"
                onClick={() => setEditorShellId('new')}
              >
                + CREATE YOUR FIRST MOLD
              </button>
            </div>
          ) : filteredShells.length === 0 ? (
            <div className="molds-empty">
              <div className="molds-empty-title">
                NO {filter.toUpperCase()} MOLDS
              </div>
              <div className="molds-empty-sub">
                Try a different filter or create a new mold.
              </div>
            </div>
          ) : (
            filteredShells.map((shell: any) => (
              <MoldCard
                key={shell._id}
                shell={shell}
                isActive={shell._id === activeMoldId}
                onEdit={() => setEditorShellId(shell._id)}
                onEquip={() => setActiveMold(shell._id)}
              />
            ))
          )}
        </div>

        {/* Editor overlay */}
        {editorShellId !== null && (
          <MoldEditor
            shellId={editorShellId}
            shells={shells || []}
            onClose={() => setEditorShellId(null)}
            onSave={handleSave}
            onDelete={handleDelete}
          />
        )}

        {/* Toast */}
        {toast && (
          <div className={`molds-toast ${toast.error ? 'error' : ''}`}>
            {toast.msg}
          </div>
        )}
      </div>
    </>
  )
}

/* ── Mold Card ─────────────────────────────────────── */

function MoldCard({
  shell,
  isActive,
  onEdit,
  onEquip,
}: {
  shell: any
  isActive: boolean
  onEdit: () => void
  onEquip: () => void
}) {
  const { model } = parseDirective(shell.directive || '')
  const moldType = getMoldType(shell.cards || [])
  const armorLabel = getArmorLabel(shell.stats?.armorValue || 0)
  const modelInfo = MODELS.find((m) => m.id === model) || MODELS[0]

  const aggPct = Math.round(clamp01((shell.stats?.totalOverhead || 0) / 100) * 100)
  const armPct = Math.round(clamp01((shell.stats?.armorValue || 0) / 100) * 100)
  const iqPct = 80

  return (
    <div className={`mold-card ${isActive ? 'active' : ''}`}>
      {isActive && <div className="mold-card-badge">{'\u2605'} ACTIVE</div>}

      <div className="mold-card-art">{'\u{1F916}'}</div>

      <div className="mold-card-name">{shell.name || 'Unnamed'}</div>
      <div className="mold-card-meta">
        {moldType} / {armorLabel}
      </div>
      <div className="mold-card-model">
        {modelInfo.name} {modelInfo.bolt}
      </div>

      <StatBar label="AGG" pct={aggPct} color="#EB4D4B" />
      <StatBar label="ARM" pct={armPct} color="#FFD600" />
      <StatBar label="IQ" pct={iqPct} color="#00E5FF" />

      <div className="mold-card-actions">
        <button className="btn-edit" onClick={onEdit}>
          {'\u270F\uFE0F'} EDIT
        </button>
        {isActive ? (
          <button className="btn-equip equipped">{'\u2713'} EQUIPPED</button>
        ) : (
          <button className="btn-equip" onClick={onEquip}>
            {'\u26A1'} EQUIP
          </button>
        )}
      </div>
    </div>
  )
}

/* ── Stat Bar ──────────────────────────────────────── */

function StatBar({
  label,
  pct,
  color,
}: {
  label: string
  pct: number
  color: string
}) {
  return (
    <div className="stat-row">
      <span className="stat-label">{label}</span>
      <div className="stat-bar">
        <div
          className="stat-bar-fill"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="stat-pct">{pct}%</span>
    </div>
  )
}

/* ── Mold Editor ───────────────────────────────────── */

function MoldEditor({
  shellId,
  shells,
  onClose,
  onSave,
  onDelete,
}: {
  shellId: string
  shells: any[]
  onClose: () => void
  onSave: (data: {
    name: string
    cards: string[]
    directive: string
    skills: string[]
    stats: { totalWeight: number; totalOverhead: number; armorValue: number }
  }) => void
  onDelete: (id: string) => void
}) {
  const existingShell =
    shellId !== 'new' ? shells.find((s: any) => s._id === shellId) : null
  const parsed = existingShell
    ? parseDirective(existingShell.directive || '')
    : { model: 'gpt-4o-mini', text: '' }

  const [name, setName] = useState(existingShell?.name || '')
  const [cards, setCards] = useState<string[]>(existingShell?.cards || [])
  const [directiveText, setDirectiveText] = useState(parsed.text)
  const [model, setModel] = useState(parsed.model)
  const [armorTier, setArmorTier] = useState(() => {
    const av = existingShell?.stats?.armorValue || 33
    if (av >= 80) return 'heavy'
    if (av >= 50) return 'medium'
    return 'light'
  })
  const [saving, setSaving] = useState(false)
  const [mobileTab, setMobileTab] = useState<'claws' | 'config' | 'stats'>(
    'config',
  )
  const [clawFilter, setClawFilter] = useState<'all' | CardType>('all')

  const armorValue = ARMOR_TIERS.find((a) => a.id === armorTier)?.value || 33

  const stats = useMemo(() => {
    const calculated = calculateLoadoutStats(cards)
    return {
      totalWeight: calculated.totalWeight,
      totalOverhead: calculated.totalOverhead,
      armorValue,
    }
  }, [cards, armorValue])

  const aggPct = Math.round(clamp01(stats.totalOverhead / 100) * 100)
  const armPct = Math.round(clamp01(armorValue / 100) * 100)
  const iqPct = 80
  const complexity = getComplexity(cards.length)

  const filteredCards = useMemo(() => {
    if (clawFilter === 'all') return ALL_CARDS
    return ALL_CARDS.filter((c) => c.type === clawFilter)
  }, [clawFilter])

  const addCard = useCallback(
    (cardId: string) => {
      if (cards.includes(cardId)) return
      if (cards.length >= MAX_LOADOUT_SLOTS) return
      const card = getCard(cardId)
      if (!card) return
      if (card.type === 'armor') {
        const armorCount = cards.filter(
          (id) => getCard(id)?.type === 'armor',
        ).length
        if (armorCount >= MAX_ARMOR_CARDS) return
      }
      setCards((prev) => [...prev, cardId])
    },
    [cards],
  )

  const removeCard = useCallback((cardId: string) => {
    setCards((prev) => prev.filter((id) => id !== cardId))
  }, [])

  const handleSave = useCallback(async () => {
    if (!name.trim()) return
    setSaving(true)
    try {
      await onSave({
        name: name.trim(),
        cards,
        directive: encodeDirective(model, directiveText),
        skills: [],
        stats,
      })
    } finally {
      setSaving(false)
    }
  }, [name, cards, model, directiveText, stats, onSave])

  return (
    <div
      className="editor-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="editor-panel">
        {/* Header */}
        <div className="editor-header">
          <button className="editor-back" onClick={onClose}>
            {'\u2190'} Back to Molds
          </button>
          <div className="editor-title">
            {shellId === 'new' ? 'NEW MOLD' : name || 'EDIT MOLD'}
          </div>
          <div className="editor-actions">
            {shellId !== 'new' && (
              <button className="btn-delete" onClick={() => onDelete(shellId)}>
                Delete
              </button>
            )}
            <button
              className="btn-save"
              onClick={handleSave}
              disabled={saving || !name.trim()}
            >
              {saving ? 'Saving...' : '\u{1F4BE} SAVE'}
            </button>
          </div>
        </div>

        {/* Mobile tabs */}
        <div className="editor-tabs">
          {(['claws', 'config', 'stats'] as const).map((tab) => (
            <button
              key={tab}
              className={`editor-tab ${mobileTab === tab ? 'active' : ''}`}
              onClick={() => setMobileTab(tab)}
            >
              {tab.toUpperCase()}
            </button>
          ))}
        </div>

        <div className="editor-body">
          {/* Panel 1: Claw Browser */}
          <div
            className={`editor-col ${mobileTab === 'claws' ? 'mobile-visible' : 'mobile-hidden'}`}
          >
            <div className="editor-section-title">Claw Browser</div>
            <div className="claw-filters">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'weapon', label: 'Weapons' },
                  { id: 'armor', label: 'Armor' },
                  { id: 'tool', label: 'Tools' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  className={`claw-filter ${clawFilter === f.id ? 'active' : ''}`}
                  onClick={() => setClawFilter(f.id as any)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="claw-list">
              {filteredCards.map((card) => {
                const isEquipped = cards.includes(card.id)
                const typeColor = getCardTypeColor(card)
                const statParts: string[] = []
                if (card.stats.damage) statParts.push(`${card.stats.damage} dmg`)
                if (card.stats.range) statParts.push(`range ${card.stats.range}`)
                if (card.stats.energyCost)
                  statParts.push(`${card.stats.energyCost}e`)
                if (card.stats.defense) statParts.push(`${card.stats.defense} def`)
                const statText = statParts.length > 0
                  ? statParts.join(' \u00B7 ')
                  : card.flavorText

                return (
                  <div
                    key={card.id}
                    className={`claw-card ${isEquipped ? 'equipped' : ''}`}
                    style={{ borderLeftColor: typeColor }}
                  >
                    <div className="claw-card-header">
                      <span className="claw-card-name">
                        {card.icon} {card.name}
                      </span>
                      {isEquipped ? (
                        <span className="claw-btn equipped-badge">
                          EQUIPPED {'\u2713'}
                        </span>
                      ) : (
                        <button
                          className="claw-btn add"
                          onClick={() => addCard(card.id)}
                        >
                          + ADD
                        </button>
                      )}
                    </div>
                    <div className="claw-card-stats">{statText}</div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Panel 2: Mold Config */}
          <div
            className={`editor-col ${mobileTab === 'config' ? 'mobile-visible' : 'mobile-hidden'}`}
          >
            <div className="editor-section-title">Mold Configuration</div>

            <input
              className="config-input"
              type="text"
              placeholder="Mold Name..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={40}
            />

            <div
              className="editor-section-title"
              style={{ fontSize: '0.85rem' }}
            >
              Equipped ({cards.length}/{MAX_LOADOUT_SLOTS})
            </div>
            <div className="equipped-list">
              {cards.length === 0 ? (
                <div
                  style={{
                    fontSize: '0.8rem',
                    color: 'rgba(255,255,255,0.25)',
                    padding: '0.5rem',
                    textAlign: 'center',
                  }}
                >
                  No claws equipped. Add from the browser.
                </div>
              ) : (
                cards.map((cardId) => {
                  const card = getCard(cardId)
                  if (!card) return null
                  return (
                    <div key={cardId} className="equipped-item">
                      <span>
                        {card.icon} {card.name}
                      </span>
                      <button
                        className="equipped-remove"
                        onClick={() => removeCard(cardId)}
                      >
                        Remove
                      </button>
                    </div>
                  )
                })
              )}
            </div>

            <div
              className="editor-section-title"
              style={{ fontSize: '0.85rem' }}
            >
              Armor
            </div>
            <div className="armor-selector">
              {ARMOR_TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`armor-option ${armorTier === tier.id ? 'selected' : ''}`}
                  onClick={() => setArmorTier(tier.id)}
                >
                  <div className="armor-radio" />
                  <span className="armor-label">{tier.label}</span>
                  <span className="armor-desc">{tier.desc}</span>
                </div>
              ))}
            </div>

            <div
              className="editor-section-title"
              style={{ fontSize: '0.85rem' }}
            >
              Directive (Brain)
            </div>
            <textarea
              className="directive-area"
              placeholder="You are a ranged specialist. ALWAYS prioritize RANGED_SHOT when dist 2-10..."
              value={directiveText}
              onChange={(e) => setDirectiveText(e.target.value)}
              maxLength={MAX_DIRECTIVE_CHARS}
            />
            <div
              className={`directive-counter ${directiveText.length > 1800 ? 'warn' : ''} ${directiveText.length >= MAX_DIRECTIVE_CHARS ? 'over' : ''}`}
            >
              {directiveText.length} / {MAX_DIRECTIVE_CHARS}
            </div>
            <div className="directive-tips">
              <span>{'\u2022'} Name claws explicitly in your directive</span>
              <span>{'\u2022'} Say "Never NO_OP"</span>
              <span>{'\u2022'} Under 200 words {'\u2192'} faster decisions</span>
            </div>

            <div
              className="editor-section-title"
              style={{ fontSize: '0.85rem' }}
            >
              Model
            </div>
            <div className="model-selector">
              {MODELS.map((m) => (
                <div
                  key={m.id}
                  className={`model-option ${model === m.id ? 'selected' : ''}`}
                  onClick={() => setModel(m.id)}
                >
                  <div>
                    <span className="model-name">{m.name}</span>
                    <span className="model-provider"> {'\u00B7'} {m.provider}</span>
                  </div>
                  <span className="model-bolt">{m.bolt}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Panel 3: Live Stats */}
          <div
            className={`editor-col ${mobileTab === 'stats' ? 'mobile-visible' : 'mobile-hidden'}`}
          >
            <div className="editor-section-title">Live Stats</div>

            <div className="live-stat-block">
              <div className="live-stat-label">Aggression</div>
              <div className="live-stat-bar">
                <div
                  className="live-stat-bar-fill"
                  style={{ width: `${aggPct}%`, background: '#EB4D4B' }}
                />
              </div>
              <div className="live-stat-pct">{aggPct}%</div>
            </div>

            <div className="live-stat-block">
              <div className="live-stat-label">Armor Rating</div>
              <div className="live-stat-bar">
                <div
                  className="live-stat-bar-fill"
                  style={{ width: `${armPct}%`, background: '#FFD600' }}
                />
              </div>
              <div className="live-stat-pct">{armPct}%</div>
            </div>

            <div className="live-stat-block">
              <div className="live-stat-label">Compute Speed</div>
              <div className="live-stat-bar">
                <div
                  className="live-stat-bar-fill"
                  style={{ width: `${iqPct}%`, background: '#00E5FF' }}
                />
              </div>
              <div className="live-stat-pct">{iqPct}%</div>
            </div>

            <div className="live-stat-block">
              <div className="live-stat-label">Complexity</div>
              <div
                className="complexity-badge"
                style={{
                  color: complexity.color,
                  background: `${complexity.color}15`,
                  border: `1px solid ${complexity.color}40`,
                }}
              >
                {cards.length} claws {'\u2192'} {complexity.label}
              </div>
              <div className="complexity-desc">{complexity.desc}</div>
            </div>

            <div className="tips-box">
              <strong>Directive Tips</strong>
              Be specific about distances. Name your claws. Tell it never to
              NO_OP. Shorter directives = faster decisions.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
