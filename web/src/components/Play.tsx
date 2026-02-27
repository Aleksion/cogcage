import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
  UNIT_SCALE,
  ENERGY_MAX,
  HP_MAX,
  ACTION_COST,
  ACTION_TYPES,
  COOLDOWN_TICKS,
  TICK_RATE,
} from '../lib/ws2/index.js';
import type { BotConfig, MatchSnapshot } from '../lib/ws2/match-runner';

const ENGINE_WS_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.PUBLIC_ENGINE_WS_URL) ||
  'wss://themoltpit-engine.aleks-precurion.workers.dev';

/** HTTP base URL for DO REST calls (queue, state) — derived from WS URL */
const ENGINE_HTTP_URL = ENGINE_WS_URL.replace(/^wss?:\/\//, (p) =>
  p.startsWith('wss') ? 'https://' : 'http://',
);

/* ============================================================
   STYLES (preserved from WS7 visual pack)
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

  .play-root { min-height: 100vh; position: relative; overflow-x: hidden; }

  .bg-scanlines {
    position: fixed; inset: 0; pointer-events: none; opacity: 0.12; z-index: 0;
    background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 4px);
  }

  .play-header {
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
  .header-link.active { background: var(--c-yellow); }
  .play-shell { position: relative; z-index: 1; padding: 2.5rem 3rem 3.5rem; }

  .panel { background: var(--c-white); border: 3px solid var(--c-dark); border-radius: var(--radius); box-shadow: var(--shadow-hard); padding: 2rem; }
  .panel h2 { font-family: var(--f-display); font-size: 2rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 1rem; }
  .section-label { font-weight: 900; text-transform: uppercase; font-size: 0.9rem; margin-bottom: 0.5rem; letter-spacing: 1px; }

  .prompt-box { width: 100%; min-height: 72px; resize: vertical; border: 3px solid var(--c-dark); border-radius: 12px; padding: 0.75rem 1rem; font-family: var(--f-body); font-size: 1rem; }

  .cta-btn {
    display: inline-flex; align-items: center; justify-content: center;
    font-family: var(--f-display); font-size: 1.3rem; text-transform: uppercase;
    padding: 0.9rem 2.5rem; background: var(--c-red); color: var(--c-white);
    border: 4px solid var(--c-dark); border-radius: 999px; box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer; transition: transform 0.1s ease;
  }
  .cta-btn:active { transform: translateY(4px); box-shadow: none; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: 0 6px 0 var(--c-dark); }

  .action-btn { border: 3px solid var(--c-dark); border-radius: 12px; background: var(--c-yellow); font-weight: 900; padding: 0.65rem 0.5rem; cursor: pointer; font-size: 0.95rem; text-transform: uppercase; }
  .action-btn.secondary { background: var(--c-white); }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .status-pill { display: inline-flex; align-items: center; gap: 0.35rem; font-weight: 900; padding: 0.35rem 0.8rem; border-radius: 999px; border: 2px solid var(--c-dark); background: var(--c-white); font-size: 0.85rem; }
  .arena-badge { font-family: var(--f-display); font-size: 1.1rem; text-transform: uppercase; background: var(--c-cyan); padding: 0.35rem 0.9rem; border: 3px solid var(--c-dark); border-radius: 999px; }
  .stat-block { margin-bottom: 1.2rem; }
  .stat-title { display: flex; justify-content: space-between; font-weight: 800; margin-bottom: 0.35rem; }
  .bar-shell { height: 16px; background: #101010; border-radius: 999px; overflow: hidden; border: 2px solid var(--c-dark); }
  .bar-fill { height: 100%; transition: width 0.35s ease, background 0.35s ease; }

  .arena-map {
    margin: 1rem 0 1.2rem;
    display: grid; grid-template-columns: repeat(var(--grid-size), minmax(28px, 1fr));
    gap: 6px; padding: 0.75rem;
    background: radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px), #101010;
    background-size: 8px 8px, 100% 100%;
    border-radius: 16px; border: 3px solid #111;
    box-shadow: 0 0 0 2px #111, 0 0 0 5px #FFD233;
    position: relative;
  }
  .arena-map.arena-flash { animation: arena-ko-flash 0.3s ease-out 2; }

  .arena-cell {
    position: relative; aspect-ratio: 1 / 1; border-radius: 10px;
    background: #f6f7f8; border: 2px solid rgba(0,0,0,0.2);
    display: grid; place-items: center; font-weight: 900; color: #111; overflow: visible;
  }
  .arena-cell.objective-zone { background: rgba(255,214,0,0.15); border-color: rgba(255,214,0,0.5); }
  .arena-cell.player { background: rgba(46,204,113,0.18); border-color: #2ecc71; padding: 3px; }
  .arena-cell.enemy { background: rgba(235,77,75,0.18); border-color: #eb4d4b; padding: 3px; }
  .arena-cell.cell-vfx-flash { animation: cell-flash-anim 200ms ease-out; }

  .arena-legend { display: flex; flex-wrap: wrap; gap: 0.6rem 1rem; font-size: 0.85rem; }

  .feed {
    background: #0f0f0f; color: #f5f5f5; border-radius: 12px; border: 3px solid var(--c-dark);
    padding: 1rem; max-height: 320px; overflow-y: auto; font-size: 0.95rem; line-height: 1.5;
  }
  .feed-item { padding: 0.6rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .feed-item:last-child { border-bottom: none; }

  .leaderboard { margin-top: 1.5rem; border-top: 3px solid var(--c-dark); padding-top: 1.2rem; }
  .hint { font-size: 0.9rem; opacity: 0.7; }
  .seed-pill { font-size: 0.85rem; font-weight: 800; border: 2px dashed var(--c-dark); border-radius: 999px; padding: 0.3rem 0.8rem; display: inline-flex; gap: 0.35rem; align-items: center; }

  .tactic-chip { display: inline-flex; padding: 2px 10px; border-radius: 999px; font-size: 0.72rem; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; border: 2px solid var(--c-dark); background: var(--c-yellow); color: var(--c-dark); margin-left: 0.5rem; vertical-align: middle; }
  .tactic-chip.enemy-chip { background: var(--c-red); color: #fff; }
  .turn-counter { font-family: var(--f-display); font-size: 1rem; text-transform: uppercase; letter-spacing: 1px; color: var(--c-dark); }

  /* Lobby */
  .lobby-container { max-width: 1000px; margin: 0 auto; }
  .lobby-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-bottom: 2rem; }
  .bot-config-card { background: rgba(255,214,0,0.07); border: 2px dashed var(--c-yellow); border-radius: 10px; padding: 0.9rem; margin-bottom: 1rem; }
  .bot-config-card.bot-b { background: rgba(235,77,75,0.07); border-color: var(--c-red); }
  .bot-config-card h3 { font-family: var(--f-display); font-size: 1.2rem; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 0.6rem; }
  .loadout-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; margin: 0.5rem 0; }
  .loadout-item { display: flex; align-items: center; gap: 0.4rem; font-size: 0.85rem; }
  .loadout-item input[type="checkbox"] { accent-color: var(--c-yellow); width: 18px; height: 18px; }
  .armor-radios { display: flex; gap: 0.8rem; margin: 0.4rem 0; }
  .armor-radios label { display: flex; align-items: center; gap: 0.3rem; font-size: 0.9rem; font-weight: 700; cursor: pointer; }
  .armor-radios input[type="radio"] { accent-color: var(--c-yellow); }
  .seed-toggle { font-size: 0.85rem; font-weight: 800; cursor: pointer; color: #666; background: none; border: none; text-decoration: underline; padding: 0; margin-bottom: 0.5rem; }
  .enter-arena-btn { width: 100%; margin-top: 1.5rem; font-size: 1.5rem; padding: 1.1rem 2.5rem; }

  /* Match */
  .match-grid { display: grid; grid-template-columns: 1fr 300px; gap: 2rem; }
  .match-sidebar .feed { max-height: 380px; margin-top: 0.5rem; }
  .match-topbar { display: flex; justify-content: center; align-items: center; gap: 1.5rem; margin-bottom: 1rem; flex-wrap: wrap; }
  .match-topbar .bot-name { font-family: var(--f-display); font-size: 1.4rem; text-transform: uppercase; letter-spacing: 1px; }
  .match-topbar .vs { font-family: var(--f-display); font-size: 1.8rem; color: var(--c-red); }
  .match-topbar .hp-bar-mini { width: 160px; }
  .energy-row { display: flex; gap: 1.5rem; justify-content: center; margin-top: 0.5rem; }
  .energy-row .energy-block { text-align: center; flex: 1; max-width: 220px; }
  .energy-row .energy-label { font-size: 0.75rem; font-weight: 900; text-transform: uppercase; margin-bottom: 0.2rem; }
  .match-timer { font-family: monospace; font-size: 0.85rem; color: #888; text-align: center; margin-top: 0.3rem; }

  /* KO Overlay */
  .ko-overlay { position: fixed; inset: 0; z-index: 100; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(0,0,0,0.92); overflow: hidden; }
  .ko-radial-bg { position: absolute; width: 250%; height: 250%; top: -75%; left: -75%; background: repeating-conic-gradient(from 0deg, #FFD233 0deg 5deg, #111 5deg 10deg); animation: ko-spin 20s linear infinite; opacity: 0.15; pointer-events: none; }
  .ko-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; gap: 1rem; text-align: center; padding: 2rem; }
  .ko-title { font-family: var(--f-display); font-size: 6rem; color: #FFD233; text-shadow: 4px 4px 0px #111, -2px -2px 0px #111, 0 0 40px rgba(255,210,51,0.4); text-transform: uppercase; animation: ko-text-slam 0.6s ease-out; }
  .ko-winner-name { font-family: var(--f-display); font-size: 2.5rem; color: #fff; text-shadow: 2px 2px 0px #111; text-transform: uppercase; animation: ko-fade-up 0.5s ease-out 0.3s both; }
  .ko-reason { font-family: var(--f-body); font-size: 1.1rem; color: #aaa; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; animation: ko-fade-up 0.5s ease-out 0.5s both; }
  .ko-stats { font-family: var(--f-body); font-size: 1rem; color: #888; animation: ko-fade-up 0.5s ease-out 0.6s both; }
  .ko-stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem 2rem; text-align: left; margin-top: 0.5rem; font-size: 0.95rem; color: #aaa; animation: ko-fade-up 0.5s ease-out 0.65s both; }
  .ko-actions { display: flex; gap: 1rem; flex-wrap: wrap; justify-content: center; margin-top: 1.5rem; animation: ko-fade-up 0.5s ease-out 0.7s both; }
  .ko-btn { font-family: var(--f-display); font-size: 1.6rem; text-transform: uppercase; padding: 1rem 3rem; background: #FFD233; color: #111; border: 4px solid #111; border-radius: 999px; box-shadow: 0 6px 0 #111; cursor: pointer; transition: transform 0.1s ease; }
  .ko-btn:active { transform: translateY(4px); box-shadow: none; }
  .ko-btn.secondary { background: #fff; }

  /* VFX */
  .vfx-popup { position: absolute; inset: -50%; display: flex; align-items: center; justify-content: center; z-index: 10; pointer-events: none; font-family: var(--f-display); letter-spacing: 1px; white-space: nowrap; }
  .vfx-popup.burst { font-size: 1.5em; animation: vfx-burst-in 600ms ease-out forwards; }
  .vfx-popup.ring { font-size: 1.3em; animation: vfx-ring-pulse 600ms ease-out forwards; }
  .vfx-popup.bolt { font-size: 1.3em; font-style: italic; animation: vfx-bolt-in 500ms ease-out forwards; }
  .vfx-popup.ko { font-size: 2em; animation: ko-text-slam 800ms ease-out forwards; }
  .vfx-popup span { text-shadow: 2px 2px 0px rgba(0,0,0,0.85), -1px -1px 0px rgba(0,0,0,0.4), 0 0 8px rgba(0,0,0,0.3); }

  @keyframes vfx-burst-in { 0% { transform: scale(0.2) rotate(-12deg); opacity: 0; } 20% { transform: scale(1.4) rotate(4deg); opacity: 1; } 50% { transform: scale(0.95) rotate(-2deg); opacity: 1; } 75% { transform: scale(1.05) rotate(1deg); opacity: 0.7; } 100% { transform: scale(1.1) rotate(0deg); opacity: 0; } }
  @keyframes vfx-ring-pulse { 0% { transform: scale(0.3); opacity: 1; } 50% { transform: scale(1.1); opacity: 0.8; } 100% { transform: scale(1.5); opacity: 0; } }
  @keyframes vfx-bolt-in { 0% { transform: scale(0.3) skewX(-10deg); opacity: 0; } 25% { transform: scale(1.2) skewX(5deg); opacity: 1; } 70% { transform: scale(1) skewX(0deg); opacity: 0.8; } 100% { transform: scale(1.1) skewX(-3deg); opacity: 0; } }
  @keyframes cell-flash-anim { 0% { box-shadow: inset 0 0 0 50px rgba(255,255,255,0.6); } 100% { box-shadow: inset 0 0 0 50px rgba(255,255,255,0); } }
  @keyframes arena-ko-flash { 0%, 100% { box-shadow: 0 0 0 2px #111, 0 0 0 5px #FFD233; } 50% { box-shadow: 0 0 0 3px #fff, 0 0 0 7px #FF4D4D, 0 0 25px rgba(255,77,77,0.5); } }
  @keyframes ko-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes ko-text-slam { 0% { transform: scale(4); opacity: 0; } 30% { transform: scale(0.85); opacity: 1; } 50% { transform: scale(1.15); opacity: 1; } 100% { transform: scale(1); opacity: 1; } }
  @keyframes ko-fade-up { 0% { transform: translateY(20px); opacity: 0; } 100% { transform: translateY(0); opacity: 1; } }
  @keyframes vfxPop { 0% { transform: scale(0.5); opacity: 1; } 50% { transform: scale(1.3); opacity: 1; } 100% { transform: scale(1.0); opacity: 0; } }

  @media (max-width: 960px) {
    .play-header { flex-direction: column; align-items: flex-start; }
    .play-shell { padding: 2rem 1.5rem 3rem; }
    .lobby-grid { grid-template-columns: 1fr; }
    .match-grid { grid-template-columns: 1fr; }
    .ko-title { font-size: 4rem; }
  }
  @media (max-width: 640px) {
    .play-header { padding: 1.2rem; }
    .logo { font-size: 1.8rem; }
    .panel { padding: 1.5rem; }
    .cta-btn { width: 100%; }
    .arena-map { gap: 4px; padding: 0.6rem; }
    .ko-title { font-size: 3rem; }
    .ko-winner-name { font-size: 1.6rem; }
    .ko-btn { font-size: 1.2rem; padding: 0.8rem 2rem; }
  }
`;

/* --- SVG Sprites --- */

const PlayerBotSvg = () => (
  <svg viewBox="0 0 40 40" style={{ width: '88%', height: '88%', display: 'block' }}>
    <rect x="12" y="2" width="16" height="10" rx="3" fill="#2ecc71" stroke="#111" strokeWidth="2" />
    <rect x="15" y="5" width="10" height="4" rx="1.5" fill="#111" />
    <circle cx="18" cy="7" r="1.5" fill="#27D9E8" />
    <circle cx="22" cy="7" r="1.5" fill="#27D9E8" />
    <rect x="10" y="12" width="20" height="13" rx="2" fill="#2ecc71" stroke="#111" strokeWidth="2" />
    <rect x="15" y="15" width="10" height="6" rx="1" fill="#27ae60" stroke="#111" strokeWidth="1" />
    <circle cx="20" cy="18" r="2" fill="#27D9E8" />
    <rect x="3" y="13" width="7" height="10" rx="3" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="30" y="13" width="7" height="10" rx="3" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="4" y="21" width="5" height="4" rx="2" fill="#2ecc71" stroke="#111" strokeWidth="1.5" />
    <rect x="31" y="21" width="5" height="4" rx="2" fill="#2ecc71" stroke="#111" strokeWidth="1.5" />
    <rect x="12" y="25" width="7" height="10" rx="2" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="21" y="25" width="7" height="10" rx="2" fill="#27ae60" stroke="#111" strokeWidth="2" />
    <rect x="11" y="33" width="9" height="5" rx="2" fill="#2ecc71" stroke="#111" strokeWidth="1.5" />
    <rect x="20" y="33" width="9" height="5" rx="2" fill="#2ecc71" stroke="#111" strokeWidth="1.5" />
  </svg>
);

const EnemyBotSvg = () => (
  <svg viewBox="0 0 40 40" style={{ width: '88%', height: '88%', display: 'block' }}>
    <polygon points="20,1 30,11 10,11" fill="#eb4d4b" stroke="#111" strokeWidth="2" strokeLinejoin="round" />
    <line x1="13" y1="9" x2="19" y2="5.5" stroke="#FFD233" strokeWidth="2" strokeLinecap="round" />
    <line x1="27" y1="9" x2="21" y2="5.5" stroke="#FFD233" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="11" width="26" height="14" rx="2" fill="#eb4d4b" stroke="#111" strokeWidth="2" />
    <rect x="13" y="14" width="14" height="7" rx="1" fill="#c0392b" stroke="#111" strokeWidth="1" />
    <circle cx="20" cy="17.5" r="2.5" fill="#FF4D4D" />
    <circle cx="20" cy="17.5" r="1" fill="#FFD233" />
    <polygon points="7,11 2,7 7,15" fill="#c0392b" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
    <polygon points="33,11 38,7 33,15" fill="#c0392b" stroke="#111" strokeWidth="1.5" strokeLinejoin="round" />
    <rect x="1" y="13" width="6" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="33" y="13" width="6" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="1" y="22" width="6" height="4" rx="1" fill="#eb4d4b" stroke="#111" strokeWidth="1.5" />
    <rect x="33" y="22" width="6" height="4" rx="1" fill="#eb4d4b" stroke="#111" strokeWidth="1.5" />
    <rect x="10" y="25" width="8" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="22" y="25" width="8" height="11" rx="2" fill="#c0392b" stroke="#111" strokeWidth="2" />
    <rect x="9" y="33" width="10" height="5" rx="2" fill="#eb4d4b" stroke="#111" strokeWidth="1.5" />
    <rect x="21" y="33" width="10" height="5" rx="2" fill="#eb4d4b" stroke="#111" strokeWidth="1.5" />
  </svg>
);

/* --- Types --- */

type VfxEvent = {
  id: string;
  cell: { x: number; y: number };
  text: string;
  color: string;
  type: 'burst' | 'ring' | 'bolt' | 'ko';
};

type LobbyBotConfig = {
  name: string;
  systemPrompt: string;
  loadout: string[];
  armor: 'light' | 'medium' | 'heavy';
  temperature: number;
  /** BYO LLM provider (openai, anthropic, groq, openrouter) */
  llmProvider: string;
  /** BYO model override */
  llmModel: string;
  /** BYO API key */
  llmKey: string;
  /** Agent mode — 'hosted' uses Molt Pit LLM, 'byo' relays to webhookUrl */
  mode: 'hosted' | 'byo';
  webhookUrl: string;
};

type RoomInfo = {
  id: string;
  name: string;
  hostName: string;
  hasPassword: boolean;
  playerCount: number;
  inviteCode: string;
  createdAt: number;
};

/** Arena task objectives */
interface ArenaTask {
  id: string;
  label: string;
  cell: { x: number; y: number };
  color: string;
}

/* --- Constants --- */

const GRID_SIZE = 8;
const EMAIL_KEY = 'moltpit_email';

const ACTION_INFO: Record<string, { label: string; cost: number; desc: string }> = {
  MOVE: { label: 'Move', cost: 4, desc: 'Move 1 cell in any direction' },
  MELEE_STRIKE: { label: 'Melee Strike', cost: 18, desc: 'Close-range hit, 22 base dmg, range 1.5' },
  RANGED_SHOT: { label: 'Ranged Shot', cost: 14, desc: 'Ranged hit, 16 base dmg, range 2-10' },
  GUARD: { label: 'Guard', cost: 10, desc: 'Block 35% frontal damage for 0.8s' },
  DASH: { label: 'Dash', cost: 22, desc: 'Leap 3 units, +15% next attack' },
  UTILITY: { label: 'Utility', cost: 20, desc: 'Special ability, 1.2s effect' },
};

const DEFAULT_BOT_A: LobbyBotConfig = {
  name: 'Iron Vanguard',
  systemPrompt: 'You are an aggressive brawler with both melee and ranged capability. Priority order: (1) If dist <= 1.5 and MELEE_STRIKE is USABLE: MELEE_STRIKE — maximum damage up close. (2) If dist 2–8 and RANGED_SHOT is USABLE: RANGED_SHOT — punish enemy at mid range. (3) If dist > 8: DASH or MOVE toward enemy. (4) If on cooldown and energy > 30%: GUARD. Never NO_OP.',
  loadout: ['MOVE', 'MELEE_STRIKE', 'RANGED_SHOT', 'GUARD', 'DASH'],
  armor: 'heavy',
  temperature: 0.7,
  llmProvider: 'openai',
  llmModel: '',
  llmKey: '',
  mode: 'hosted',
  webhookUrl: '',
};

const DEFAULT_BOT_B: LobbyBotConfig = {
  name: 'Null Protocol',
  systemPrompt: 'You are a ranged specialist. ALWAYS prioritize RANGED_SHOT when dist is 2-10 and it is USABLE. If enemy dist < 2: DASH away. If dist > 10: MOVE toward enemy to get back in range. Never retreat off the arena edge — stay near center. Never NO_OP.',
  loadout: ['MOVE', 'RANGED_SHOT', 'GUARD', 'DASH'],
  armor: 'light',
  temperature: 0.7,
  llmProvider: 'openai',
  llmModel: '',
  llmKey: '',
  mode: 'hosted',
  webhookUrl: '',
};

const ARENA_TASKS: ArenaTask[] = [
  { id: 'task-energy', label: '+E', cell: { x: 2, y: 2 }, color: '#00E5FF' },
  { id: 'task-dmg', label: '+D', cell: { x: 5, y: 5 }, color: '#FF9F1C' },
  { id: 'task-shield', label: '+S', cell: { x: 1, y: 6 }, color: '#2ecc71' },
  { id: 'task-speed', label: '+V', cell: { x: 6, y: 1 }, color: '#5f27cd' },
];

const founderCheckoutUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? '').trim();

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

const Play = () => {
  // --- Phase ---
  const [phase, setPhase] = useState<'lobby' | 'match' | 'result'>('lobby');

  // --- Lobby state ---
  const [botAConfig, setBotAConfig] = useState<LobbyBotConfig>(DEFAULT_BOT_A);
  const [botBConfig, setBotBConfig] = useState<LobbyBotConfig>(DEFAULT_BOT_B);
  const [seedInput, setSeedInput] = useState('');
  const [showSeedInput, setShowSeedInput] = useState(false);

  // --- Match state ---
  const [botAHp, setBotAHp] = useState(HP_MAX);
  const [botBHp, setBotBHp] = useState(HP_MAX);
  const [botAEnergy, setBotAEnergy] = useState(ENERGY_MAX);
  const [botBEnergy, setBotBEnergy] = useState(ENERGY_MAX);
  const [botAPos, setBotAPos] = useState({ x: 1, y: 4 }); // visual init; updated by snapshot
  const [botBPos, setBotBPos] = useState({ x: 6, y: 4 });
  const [tick, setTick] = useState(0);
  const [activeSeed, setActiveSeed] = useState<number>(0);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);

  // --- Result state ---
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [endReason, setEndReason] = useState<string>('');
  const [finalStats, setFinalStats] = useState<any>(null);

  // --- VFX ---
  const [vfxEvents, setVfxEvents] = useState<VfxEvent[]>([]);
  const [arenaFlash, setArenaFlash] = useState(false);
  const [botALastAction, setBotALastAction] = useState('');
  const [botBLastAction, setBotBLastAction] = useState('');

  // --- Room / Lobby ---
  const [roomList, setRoomList] = useState<RoomInfo[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('Arena Room');
  const [roomPassword, setRoomPassword] = useState('');
  const [roomJoinPassword, setRoomJoinPassword] = useState('');
  const [roomInviteCode, setRoomInviteCode] = useState<string | null>(null);
  const [roomError, setRoomError] = useState('');
  const [showRoomPanel, setShowRoomPanel] = useState(false);
  const [showByo, setShowByo] = useState(false);

  // --- Founder CTA ---
  const [email, setEmail] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [ffaBusy, setFfaBusy] = useState(false);

  // --- PlayCanvas ---
  const [pcActive, setPcActive] = useState(false);
  const playCanvasRef = useRef<HTMLCanvasElement>(null);
  const [vfxWord, setVfxWord] = useState<{ text: string; color: string; id: number } | null>(null);

  // --- Refs ---
  const abortRef = useRef<AbortController | null>(null);
  const prevEventsLenRef = useRef(0);
  const sceneRef = useRef<any>(null);
  const wsRef = useRef<WebSocket | null>(null);
  /** Tracks bots with an in-flight /api/agent/decide call — prevents queuing overlapping decisions */
  const agentBusyRef = useRef<Set<string>>(new Set());

  // --- Effects ---
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => { document.head.removeChild(style); };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(EMAIL_KEY) || '';
    if (saved) setEmail(saved);
  }, []);

  // Fetch room list periodically when lobby is open
  useEffect(() => {
    if (phase !== 'lobby' || !showRoomPanel) return;
    const fetchRooms = async () => {
      try {
        const res = await fetch('/api/rooms');
        if (res.ok) {
          const data = await res.json();
          setRoomList(data.rooms || []);
        }
      } catch { /* ignore */ }
    };
    fetchRooms();
    const interval = setInterval(fetchRooms, 4000);
    return () => clearInterval(interval);
  }, [phase, showRoomPanel]);

  // --- Canvas VFX word overlay listener ---
  useEffect(() => {
    const canvas = playCanvasRef.current;
    if (!canvas) return;
    const handler = (e: Event) => {
      const { text, color } = (e as CustomEvent).detail;
      const id = Date.now();
      setVfxWord({ text, color, id });
      setTimeout(() => setVfxWord((prev) => (prev?.id === id ? null : prev)), 700);
    };
    canvas.addEventListener('moltpit:vfx', handler);
    return () => canvas.removeEventListener('moltpit:vfx', handler);
  }, [phase]);

  // --- PlayCanvas lifecycle ---
  useEffect(() => {
    if (phase !== 'match' || !playCanvasRef.current) return;

    let destroyed = false;

    import('../lib/ws2/PlayCanvasScene').then(({ PlayCanvasScene }) => {
      if (destroyed || !playCanvasRef.current) return;
      try {
        const scene = new PlayCanvasScene(playCanvasRef.current);
        sceneRef.current = scene;
        setPcActive(true);
      } catch (e) {
        console.warn('[PlayCanvas] Init failed, using CSS grid:', e);
        setPcActive(false);
      }
    }).catch((e) => {
      console.warn('[PlayCanvas] Load failed, using CSS grid:', e);
      setPcActive(false);
    });

    return () => {
      destroyed = true;
      sceneRef.current?.destroy?.();
      sceneRef.current = null;
      setPcActive(false);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // --- VFX helpers ---
  const spawnVfx = useCallback((cell: { x: number; y: number }, text: string, color: string, type: VfxEvent['type'] = 'burst', duration = 600) => {
    const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const event: VfxEvent = { id, cell: { ...cell }, text, color, type };
    setVfxEvents((prev) => [...prev, event]);
    setTimeout(() => setVfxEvents((prev) => prev.filter((e) => e.id !== id)), duration);
  }, []);

  // --- Format events for combat log ---
  const formatEvent = useCallback((event: any): string | null => {
    const aName = botAConfig.name || 'Bot A';
    const bName = botBConfig.name || 'Bot B';
    const who = event.actorId === 'botA' ? aName : bName;
    const tick = event.tick ?? '?';

    switch (event.type) {
      case 'DAMAGE_APPLIED': {
        const d = event.data;
        const target = event.targetId === 'botA' ? aName : bName;
        return `[${tick}] ${who} hits ${target} for ${d.amount} dmg${d.defenderGuarded ? ' (guarded)' : ''}`;
      }
      case 'STATUS_APPLIED':
        return `[${tick}] ${who} activates ${event.data.status}`;
      case 'ILLEGAL_ACTION':
        return `[${tick}] ${who}: ILLEGAL ${event.data.action?.type ?? '?'} \u2014 ${event.data.reason}`;
      case 'ACTION_ACCEPTED': {
        const d = event.data;
        if (d.type === 'NO_OP') return null;
        if (d.type === 'MOVE') return `[${tick}] ${who} moves ${d.dir}`;
        if (d.type === 'DASH') return `[${tick}] ${who} dashes ${d.dir}`;
        return `[${tick}] ${who} uses ${d.type}`;
      }
      case 'MATCH_END':
        return `[${tick}] MATCH END \u2014 ${event.data.reason}`;
      default:
        return null;
    }
  }, [botAConfig.name, botBConfig.name]);

  // --- Snapshot handler ---
  const handleSnapshot = useCallback((snap: MatchSnapshot) => {
    // Forward snapshot to PlayCanvas scene if available
    sceneRef.current?.update?.(snap);

    const s = snap.state;
    const actorA = s.actors?.botA;
    const actorB = s.actors?.botB;
    if (!actorA || !actorB) return;

    setBotAHp(actorA.hp);
    setBotBHp(actorB.hp);
    setBotAEnergy(actorA.energy);
    setBotBEnergy(actorB.energy);
    setTick(s.tick);

    // Arena is 20 world-units; CSS grid is GRID_SIZE cells — scale accordingly
    const ARENA_WORLD = 20;
    const aPosGrid = {
      x: clamp(Math.floor((actorA.position.x / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
      y: clamp(Math.floor((actorA.position.y / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
    };
    const bPosGrid = {
      x: clamp(Math.floor((actorB.position.x / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
      y: clamp(Math.floor((actorB.position.y / UNIT_SCALE) * (GRID_SIZE / ARENA_WORLD)), 0, GRID_SIZE - 1),
    };
    setBotAPos(aPosGrid);
    setBotBPos(bPosGrid);

    // Process new events
    const events: any[] = s.events || [];
    const prevLen = prevEventsLenRef.current;
    const newEvents = events.slice(prevLen);
    prevEventsLenRef.current = events.length;

    // Combat log
    const logEntries = newEvents.map(formatEvent).filter((e: string | null): e is string => e !== null);
    if (logEntries.length) {
      setFeed((prev) => [...logEntries.reverse(), ...prev].slice(0, 50));
    }

    // Track last actions
    for (const evt of newEvents) {
      if (evt.type === 'ACTION_ACCEPTED') {
        const label = evt.data?.type === 'NO_OP' ? '' : (evt.data?.type || '').replace(/_/g, ' ');
        if (evt.actorId === 'botA') setBotALastAction(label);
        else if (evt.actorId === 'botB') setBotBLastAction(label);
      }
    }

    // VFX
    for (const evt of newEvents) {
      if (evt.type === 'DAMAGE_APPLIED') {
        const targetPos = evt.targetId === 'botA' ? aPosGrid : bPosGrid;
        const isAAttacker = evt.actorId === 'botA';
        spawnVfx(targetPos, isAAttacker ? 'KAPOW!' : 'CLANG!', isAAttacker ? '#FF4D4D' : '#27D9E8', isAAttacker ? 'burst' : 'ring', 600);
      }
      if (evt.type === 'MATCH_END') {
        const loserPos = snap.winnerId === 'botA' ? bPosGrid : aPosGrid;
        spawnVfx(loserPos, 'K.O.!', '#FFD233', 'ko', 800);
        setArenaFlash(true);
        setTimeout(() => setArenaFlash(false), 600);
      }
    }

    if (snap.ended) {
      setWinnerId(snap.winnerId);
      setEndReason(s.endReason || 'UNKNOWN');
      setFinalStats({
        botAHp: actorA.hp,
        botBHp: actorB.hp,
        botADmg: actorA.stats?.damageDealt ?? 0,
        botBDmg: actorB.stats?.damageDealt ?? 0,
        botAIllegal: actorA.stats?.illegalActions ?? 0,
        botBIllegal: actorB.stats?.illegalActions ?? 0,
        objA: s.objectiveScore?.botA ?? 0,
        objB: s.objectiveScore?.botB ?? 0,
      });
      setRunning(false);
      setPhase('result');
    }
  }, [formatEvent, spawnVfx]);

  // --- Match lifecycle ---
  const startMatch = useCallback(() => {
    // Reset
    setBotAHp(HP_MAX);
    setBotBHp(HP_MAX);
    setBotAEnergy(ENERGY_MAX);
    setBotBEnergy(ENERGY_MAX);
    setTick(0);
    setFeed([]);
    setWinnerId(null);
    setEndReason('');
    setFinalStats(null);
    setVfxEvents([]);
    setBotALastAction('');
    setBotBLastAction('');
    setArenaFlash(false);
    setPcActive(false);
    prevEventsLenRef.current = 0;

    const seedLabel = seedInput.trim() || `${Date.now()}`;
    const seed = hashString(seedLabel) || 1;
    setActiveSeed(seed);

    const configA: BotConfig = {
      id: 'botA',
      name: botAConfig.name || 'Bot A',
      systemPrompt: botAConfig.systemPrompt,
      loadout: botAConfig.loadout,
      armor: botAConfig.armor,
      position: { x: 6, y: 10 },
      temperature: botAConfig.temperature,
    };

    const configB: BotConfig = {
      id: 'botB',
      name: botBConfig.name || 'Bot B',
      systemPrompt: botBConfig.systemPrompt,
      loadout: botBConfig.loadout,
      armor: botBConfig.armor,
      position: { x: 14, y: 10 },
      temperature: botBConfig.temperature,
    };

    setBotAPos({ x: 2, y: 4 }); // (6,10) world → grid(2,4) at 8/20 scale
    setBotBPos({ x: 5, y: 4 }); // (14,10) world → grid(5,4)

    const initLines = [
      `Match initialized. Seed ${seed}.`,
      `${configA.name} (${configA.armor}) vs ${configB.name} (${configB.armor})`,
    ];
    setFeed(initLines.reverse());
    setRunning(true);
    setPhase('match');

    // Start match on the DO via server route, then connect WebSocket
    fetch('/api/match/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ botA: configA, botB: configB, seed }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error('[match] Engine start failed:', data.error);
          setFeed((prev) => [`Engine error: ${data.error}`, ...prev]);
          setRunning(false);
          setPhase('lobby');
          return;
        }

        const matchId = data.matchId as string;
        const ws = new WebSocket(`${ENGINE_WS_URL}/match/${matchId}`);
        wsRef.current = ws;

        // Clear busy flags when a new match starts
        agentBusyRef.current.clear();

        /**
         * Push a bot's decision to the DO action queue.
         * Called at every DECISION_WINDOW_TICKS boundary.
         * Fire-and-forget: errors are logged, never surface to UI.
         */
        const fireAgentDecision = async (
          botId: string,
          config: BotConfig,
          gameState: any,
          currentMatchId: string,
        ) => {
          if (agentBusyRef.current.has(botId)) return; // skip if previous call still in-flight
          agentBusyRef.current.add(botId);
          try {
            const opponentId = botId === 'botA' ? 'botB' : 'botA';
            const decideRes = await fetch('/api/agent/decide', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                gameState,
                actorId: botId,
                opponentIds: [opponentId],
                loadout: config.loadout,
                systemPrompt: config.systemPrompt,
                brainPrompt: config.systemPrompt,
              }),
              signal: AbortSignal.timeout(4000),
            });
            if (!decideRes.ok) return;
            const decision = await decideRes.json();
            const action = decision.action ?? { type: 'NO_OP' };
            // Push action to DO queue
            await fetch(`${ENGINE_HTTP_URL}/match/${currentMatchId}/queue`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${botId}`,
              },
              body: JSON.stringify(action),
              signal: AbortSignal.timeout(2000),
            });
          } catch {
            // silently swallow — match continues with NO_OP on missed windows
          } finally {
            agentBusyRef.current.delete(botId);
          }
        };

        ws.onmessage = (e) => {
          let msg: any;
          try { msg = JSON.parse(e.data); } catch { return; }

          if (msg.type === 'tick') {
            const snap: MatchSnapshot = {
              state: { ...msg.state, events: msg.events ?? msg.state?.events ?? [] },
              tick: msg.tick,
              ended: false,
              winnerId: null,
            };
            handleSnapshot(snap);

            // Fire agent decisions at every DECISION_WINDOW_TICKS boundary
            // (DECISION_WINDOW_TICKS = 3 → every 600ms at 200ms/tick)
            if (msg.tick % 3 === 0 && msg.state) {
              void fireAgentDecision('botA', configA, msg.state, matchId);
              void fireAgentDecision('botB', configB, msg.state, matchId);
            }
          }

          if (msg.type === 'match_complete') {
            const result = msg.result ?? {};
            const snap: MatchSnapshot = {
              state: {
                ...result,
                endReason: result.endReason ?? result.reason ?? 'UNKNOWN',
                events: result.events ?? [],
              },
              tick: result.tick ?? 0,
              ended: true,
              winnerId: result.winnerId ?? null,
            };
            handleSnapshot(snap);
            ws.close();
          }
        };

        ws.onerror = () => {
          console.error('[ws] WebSocket error');
          setFeed((prev) => ['WebSocket connection error', ...prev]);
        };

        ws.onclose = () => {
          wsRef.current = null;
        };
      })
      .catch((err) => {
        console.error('[match] Start error:', err);
        setRunning(false);
        setPhase('lobby');
      });
  }, [seedInput, botAConfig, botBConfig, handleSnapshot]);

  const abortMatch = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
    setRunning(false);
    setPhase('result');
    setEndReason('ABORTED');
  }, []);

  // --- Lobby helpers ---
  const updateLoadout = (setter: React.Dispatch<React.SetStateAction<LobbyBotConfig>>, action: string, checked: boolean) => {
    setter((prev) => {
      if (action === 'MOVE') return prev; // MOVE always on
      const newLoadout = checked
        ? [...prev.loadout, action]
        : prev.loadout.filter((a) => a !== action);
      return { ...prev, loadout: newLoadout };
    });
  };

  // --- FFA Tournament ---
  const handleStartFfa = async () => {
    setFfaBusy(true);
    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          hostName: botAConfig.name || 'Host',
          bot: {
            name: botAConfig.name || 'Host Bot',
            systemPrompt: botAConfig.systemPrompt,
            loadout: botAConfig.loadout,
            armor: botAConfig.armor,
            temperature: botAConfig.temperature,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.sessionId) {
        window.location.href = `/play/session/${data.sessionId}?pid=${data.participantId}`;
      } else {
        alert(data.error || 'Failed to create session');
        setFfaBusy(false);
      }
    } catch {
      alert('Network error creating session');
      setFfaBusy(false);
    }
  };

  // --- Founder CTA ---
  const handleFounderCheckout = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setCheckoutMessage('Enter a valid email to reserve founder pricing.');
      return;
    }
    if (!founderCheckoutUrl) {
      setCheckoutMessage('Checkout is temporarily unavailable. Please join the waitlist from home.');
      return;
    }
    if (typeof window !== 'undefined') window.localStorage.setItem(EMAIL_KEY, normalizedEmail);
    setCheckoutBusy(true);
    setCheckoutMessage(null);
    try {
      const url = new URL(founderCheckoutUrl);
      url.searchParams.set('prefilled_email', normalizedEmail);
      window.location.href = url.toString();
    } catch {
      setCheckoutBusy(false);
      setCheckoutMessage('Could not start checkout. Try again.');
    }
  };

  // --- Derived ---
  const matchTimeSec = (tick / TICK_RATE).toFixed(1);
  const aName = botAConfig.name || 'Bot A';
  const bName = botBConfig.name || 'Bot B';
  const winnerName = winnerId === 'botA' ? aName : winnerId === 'botB' ? bName : 'Draw';

  // Objective zone cells (center 10,10 in tenths = grid ~5,5 ish, radius 2.5 units)
  const objCenterGrid = { x: 5, y: 5 }; // rough mapping for 8x8 grid from 20x20 arena
  const isInObjectiveZone = (x: number, y: number) => {
    const dx = x - objCenterGrid.x;
    const dy = y - objCenterGrid.y;
    return Math.sqrt(dx * dx + dy * dy) <= 2;
  };

  /* ============================================================
     RENDER
     ============================================================ */

  const renderBotConfigPanel = (
    config: LobbyBotConfig,
    setConfig: React.Dispatch<React.SetStateAction<LobbyBotConfig>>,
    label: string,
    isB: boolean,
  ) => (
    <div className="panel">
      <h2>{label}</h2>
      <div className={`bot-config-card${isB ? ' bot-b' : ''}`}>
        <h3>Identity</h3>
        <input
          className="prompt-box"
          style={{ minHeight: 'unset', height: '40px', marginBottom: '0.5rem' }}
          placeholder="Bot name (e.g. Iron Vanguard)"
          value={config.name}
          onChange={(e) => setConfig((prev) => ({ ...prev, name: e.target.value }))}
        />
        <div className="section-label" style={{ marginTop: '0.6rem' }}>System Prompt (Brain)</div>
        <textarea
          className="prompt-box"
          style={{ minHeight: '100px', marginBottom: '0.6rem', fontSize: '0.85rem' }}
          placeholder="You are an aggressive melee fighter. Prioritize closing distance..."
          value={config.systemPrompt}
          onChange={(e) => setConfig((prev) => ({ ...prev, systemPrompt: e.target.value }))}
        />

        <div className="section-label">Loadout</div>
        <div className="loadout-grid">
          {ACTION_TYPES.map((action: string) => {
            const info = ACTION_INFO[action];
            if (!info) return null;
            const isMove = action === 'MOVE';
            const checked = config.loadout.includes(action);
            return (
              <label key={action} className="loadout-item">
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={isMove}
                  onChange={(e) => updateLoadout(setConfig, action, e.target.checked)}
                />
                <span>
                  <strong>{info.label}</strong> ({info.cost}e)
                  <br />
                  <span className="hint" style={{ fontSize: '0.75rem' }}>{info.desc}</span>
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
                name={`armor-${label}`}
                checked={config.armor === a}
                onChange={() => setConfig((prev) => ({ ...prev, armor: a }))}
              />
              {a.charAt(0).toUpperCase() + a.slice(1)}
              <span className="hint" style={{ fontSize: '0.7rem', marginLeft: '0.2rem' }}>
                ({a === 'light' ? '1.0x' : a === 'medium' ? '0.9x' : '0.82x'} dmg)
              </span>
            </label>
          ))}
        </div>

        {/* Temperature / Aggression slider */}
        <div className="section-label" style={{ marginTop: '0.8rem' }}>
          Aggression (LLM Temperature): {config.temperature.toFixed(2)}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className="hint" style={{ fontSize: '0.75rem' }}>Cautious</span>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={config.temperature}
            onChange={(e) => setConfig((prev) => ({ ...prev, temperature: parseFloat(e.target.value) }))}
            style={{ flex: 1, accentColor: 'var(--c-red)' }}
          />
          <span className="hint" style={{ fontSize: '0.75rem' }}>Reckless</span>
        </div>
        <div className="hint" style={{ fontSize: '0.72rem', marginTop: '0.2rem' }}>
          Low = precise/predictable, High = creative/chaotic
        </div>

        {/* BYO LLM Keys */}
        {showByo && (
          <div style={{ marginTop: '0.6rem', padding: '0.6rem', background: 'rgba(0,0,0,0.03)', borderRadius: '8px' }}>
            <div className="section-label" style={{ fontSize: '0.8rem' }}>BYO LLM Provider</div>
            <select
              value={config.llmProvider}
              onChange={(e) => setConfig((prev) => ({ ...prev, llmProvider: e.target.value }))}
              style={{ width: '100%', padding: '0.4rem', borderRadius: '8px', border: '2px solid var(--c-dark)', fontWeight: 700, marginBottom: '0.4rem' }}
            >
              <option value="openai">OpenAI (default)</option>
              <option value="anthropic">Anthropic</option>
              <option value="groq">Groq</option>
              <option value="openrouter">OpenRouter</option>
            </select>
            <input
              className="prompt-box"
              style={{ minHeight: 'unset', height: '36px', marginBottom: '0.4rem', fontSize: '0.85rem' }}
              placeholder="Model override (optional)"
              value={config.llmModel}
              onChange={(e) => setConfig((prev) => ({ ...prev, llmModel: e.target.value }))}
            />
            <input
              className="prompt-box"
              type="password"
              style={{ minHeight: 'unset', height: '36px', fontSize: '0.85rem' }}
              placeholder="API Key (stays in browser, never stored)"
              value={config.llmKey}
              onChange={(e) => setConfig((prev) => ({ ...prev, llmKey: e.target.value }))}
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderArena = () => {
    const cells = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const isA = botAPos.x === x && botAPos.y === y;
        const isB = botBPos.x === x && botBPos.y === y;
        const inObj = isInObjectiveZone(x, y);
        const cellVfx = vfxEvents.filter((e) => e.cell.x === x && e.cell.y === y);
        const task = ARENA_TASKS.find((t) => t.cell.x === x && t.cell.y === y);
        const className = [
          'arena-cell',
          inObj ? 'objective-zone' : '',
          isA ? 'player' : '',
          isB ? 'enemy' : '',
          cellVfx.length > 0 ? 'cell-vfx-flash' : '',
        ].filter(Boolean).join(' ');

        cells.push(
          <div key={`${x}-${y}`} className={className}>
            {task && !isA && !isB && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--f-display)', fontSize: '0.7rem', color: task.color,
                textShadow: '1px 1px 0 rgba(0,0,0,0.3)', opacity: 0.85, zIndex: 1,
              }}>
                <div style={{
                  width: '70%', height: '70%', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: `${task.color}22`, border: `2px dashed ${task.color}66`,
                }}>
                  {task.label}
                </div>
              </div>
            )}
            {isA && <PlayerBotSvg />}
            {isB && <EnemyBotSvg />}
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

  const renderFounderCta = () => (
    <div className="leaderboard">
      <div className="section-label">Unlock Founder Pricing</div>
      <div className="hint" style={{ marginBottom: '0.7rem' }}>
        Lock $29/mo before launch pricing moves to $49/mo. Configure and pit your AI agents against each other with full analytics.
      </div>
      <input
        className="prompt-box"
        type="email"
        placeholder="you@team.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        style={{ minHeight: 'unset', height: '48px', marginBottom: '0.8rem' }}
      />
      <button className="cta-btn" onClick={handleFounderCheckout} disabled={checkoutBusy}>
        {checkoutBusy ? 'Opening Checkout\u2026' : 'Reserve Founder Spot'}
      </button>
      {checkoutMessage && <div className="hint" style={{ marginTop: '0.7rem' }}>{checkoutMessage}</div>}
    </div>
  );

  return (
    <div className="play-root">
      <div className="bg-scanlines" />
      <header className="play-header">
        <a className="logo" href="/">THE MOLT PIT</a>
        <div className="header-links">
          <a className="header-link" href="/">Home</a>
          <a className="header-link active" href="/play">Play</a>
        </div>
      </header>

      {/* ======================== LOBBY ======================== */}
      {phase === 'lobby' && (
        <main className="play-shell">
          <div className="lobby-container">
            <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
              <h2 style={{ fontFamily: 'var(--f-display)', fontSize: '2.2rem', textTransform: 'uppercase', letterSpacing: '2px' }}>
                Configure Your Agents
              </h2>
              <p className="hint">Two LLM-driven bots fight autonomously. You design their brains and loadouts, then watch.</p>
            </div>

            <div className="lobby-grid">
              {renderBotConfigPanel(botAConfig, setBotAConfig, 'Bot A (Cyan)', false)}
              {renderBotConfigPanel(botBConfig, setBotBConfig, 'Bot B (Red)', true)}
            </div>

            {/* Advanced: Seed + BYO toggle */}
            <div style={{ display: 'flex', gap: '1.5rem', justifyContent: 'center', marginTop: '0.5rem', flexWrap: 'wrap' }}>
              <button className="seed-toggle" onClick={() => setShowSeedInput((p) => !p)}>
                {showSeedInput ? 'Hide seed' : 'Seed (advanced)'}
              </button>
              <button className="seed-toggle" onClick={() => setShowByo((p) => !p)}>
                {showByo ? 'Hide BYO Keys' : 'BYO LLM Keys'}
              </button>
              <button className="seed-toggle" onClick={() => setShowRoomPanel((p) => !p)}>
                {showRoomPanel ? 'Hide Rooms' : 'Multiplayer Rooms'}
              </button>
            </div>

            {showSeedInput && (
              <div style={{ textAlign: 'center' }}>
                <input
                  className="prompt-box"
                  style={{ minHeight: 'unset', height: '44px', marginTop: '0.5rem', maxWidth: '400px', margin: '0.5rem auto 0' }}
                  placeholder="Seed (optional, deterministic)"
                  value={seedInput}
                  onChange={(e) => setSeedInput(e.target.value)}
                />
              </div>
            )}

            {/* Room system */}
            {showRoomPanel && (
              <div className="panel" style={{ maxWidth: '700px', margin: '1rem auto 0' }}>
                <h2 style={{ fontSize: '1.4rem' }}>Lobby Rooms</h2>

                {/* Create room */}
                <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <input
                    className="prompt-box"
                    style={{ minHeight: 'unset', height: '40px', flex: '1 1 160px' }}
                    placeholder="Room name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                  />
                  <input
                    className="prompt-box"
                    type="password"
                    style={{ minHeight: 'unset', height: '40px', flex: '0 1 140px' }}
                    placeholder="Password (optional)"
                    value={roomPassword}
                    onChange={(e) => setRoomPassword(e.target.value)}
                  />
                  <button
                    className="action-btn"
                    onClick={async () => {
                      setRoomError('');
                      try {
                        const res = await fetch('/api/rooms', {
                          method: 'POST',
                          headers: { 'content-type': 'application/json' },
                          body: JSON.stringify({ name: roomName, hostName: botAConfig.name || 'Host', password: roomPassword || undefined }),
                        });
                        const data = await res.json();
                        if (data.ok) {
                          setRoomId(data.room.id);
                          setRoomInviteCode(data.room.inviteCode);
                        } else {
                          setRoomError(data.error || 'Failed to create room');
                        }
                      } catch { setRoomError('Network error'); }
                    }}
                  >
                    Create Room
                  </button>
                </div>

                {/* Invite code */}
                {roomInviteCode && roomId && (
                  <div style={{ marginBottom: '1rem', padding: '0.6rem', background: 'rgba(0,229,255,0.1)', borderRadius: '8px', textAlign: 'center' }}>
                    <div className="section-label" style={{ fontSize: '0.8rem' }}>Invite Link</div>
                    <code style={{ fontWeight: 900, fontSize: '0.95rem', letterSpacing: '1px' }}>
                      {typeof window !== 'undefined' ? `${window.location.origin}/play?room=${roomId}` : `*/play?room=${roomId}`}
                    </code>
                    <div className="hint" style={{ marginTop: '0.3rem' }}>Code: {roomInviteCode}</div>
                  </div>
                )}

                {/* Room list */}
                {roomList.length > 0 && (
                  <div>
                    <div className="section-label">Open Rooms</div>
                    {roomList.map((r) => (
                      <div key={r.id} style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: '0.5rem 0.7rem', borderBottom: '1px solid #eee',
                      }}>
                        <div>
                          <strong>{r.name}</strong>{' '}
                          <span className="hint">by {r.hostName} ({r.playerCount}/2){r.hasPassword ? ' [pw]' : ''}</span>
                        </div>
                        <button
                          className="action-btn"
                          style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
                          onClick={async () => {
                            setRoomError('');
                            const pw = r.hasPassword ? prompt('Enter room password:') : undefined;
                            if (r.hasPassword && !pw) return;
                            try {
                              const res = await fetch(`/api/rooms/${r.id}`, {
                                method: 'POST',
                                headers: { 'content-type': 'application/json' },
                                body: JSON.stringify({ playerName: botBConfig.name || 'Challenger', password: pw }),
                              });
                              const data = await res.json();
                              if (data.ok) {
                                setRoomId(r.id);
                                setRoomInviteCode(r.inviteCode);
                              } else {
                                setRoomError(data.error || 'Failed to join');
                              }
                            } catch { setRoomError('Network error'); }
                          }}
                        >
                          Join
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {roomList.length === 0 && <div className="hint">No open rooms. Create one above.</div>}
                {roomError && <div style={{ color: 'var(--c-red)', fontWeight: 800, marginTop: '0.5rem' }}>{roomError}</div>}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button className="cta-btn enter-arena-btn" style={{ flex: '1 1 auto', maxWidth: '400px' }} onClick={startMatch}>
                Start Battle
              </button>
              <button
                className="cta-btn enter-arena-btn"
                style={{ flex: '1 1 auto', maxWidth: '400px', background: 'var(--c-purple)' }}
                onClick={handleStartFfa}
                disabled={ffaBusy}
              >
                {ffaBusy ? 'Creating...' : 'Start FFA Tournament'}
              </button>
            </div>

            {renderFounderCta()}
          </div>
        </main>
      )}

      {/* ======================== MATCH ======================== */}
      {phase === 'match' && (
        <main className="play-shell">
          {/* Top bar: names + HP */}
          <div className="match-topbar">
            <div style={{ textAlign: 'right' }}>
              <span className="bot-name" style={{ color: '#00E5FF', textShadow: '1px 1px 0 #1A1A1A' }}>
                {aName}
                {botALastAction && <span className="tactic-chip">{botALastAction}</span>}
              </span>
              <div className="stat-block" style={{ marginBottom: 0, marginTop: '0.3rem' }}>
                <div className="stat-title">
                  <span>HP</span>
                  <span className="status-pill">{botAHp}</span>
                </div>
                <div className="bar-shell hp-bar-mini" style={{ width: '180px' }}>
                  <div className="bar-fill" style={{ width: `${botAHp}%`, background: hpBarGradient(botAHp) }} />
                </div>
              </div>
            </div>

            <span className="vs" style={{ fontFamily: 'var(--f-display)', fontSize: '2rem', color: 'var(--c-red)' }}>VS</span>

            <div>
              <span className="bot-name" style={{ color: '#eb4d4b' }}>
                {bName}
                {botBLastAction && <span className="tactic-chip enemy-chip">{botBLastAction}</span>}
              </span>
              <div className="stat-block" style={{ marginBottom: 0, marginTop: '0.3rem' }}>
                <div className="stat-title">
                  <span>HP</span>
                  <span className="status-pill">{botBHp}</span>
                </div>
                <div className="bar-shell hp-bar-mini" style={{ width: '180px' }}>
                  <div className="bar-fill" style={{ width: `${botBHp}%`, background: hpBarGradient(botBHp) }} />
                </div>
              </div>
            </div>
          </div>

          {/* PlayCanvas 3D arena — always 560px so canvas has dimensions when scene initialises */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '800px', margin: '0 auto 1rem', height: '560px', overflow: 'hidden', borderRadius: '14px', border: '4px solid #1A1A1A', boxShadow: '8px 8px 0 #1A1A1A', background: '#F9F7F2' }}>
            <canvas
              ref={playCanvasRef}
              style={{ width: '100%', height: '100%', display: 'block' }}
            />
            {/* Loading placeholder until PlayCanvas scene starts */}
            {!pcActive && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem', background: '#F9F7F2' }}>
                <div style={{ fontFamily: 'Bangers, display', fontSize: '2rem', color: '#1A1A1A', letterSpacing: '2px' }}>LOADING ARENA...</div>
                <div style={{ width: '120px', height: '8px', background: '#e0e0e0', borderRadius: '999px', border: '2px solid #1A1A1A', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: '#00E5FF', width: '60%', animation: 'vfx-burst-in 1s ease-in-out infinite alternate' }} />
                </div>
              </div>
            )}
            {/* Comic art VFX overlay — POW!/BANG! words over the 3D canvas */}
            {vfxEvents.map((v) => (
              <div
                key={v.id}
                className={`vfx-popup ${v.type}`}
                style={{
                  position: 'absolute',
                  left: `${15 + (v.cell.x / 8) * 70}%`,
                  top: `${20 + (v.cell.y / 8) * 50}%`,
                  transform: 'translate(-50%, -50%)',
                  color: v.color,
                  fontSize: v.type === 'ko' ? '5rem' : '2.8rem',
                  fontFamily: 'Bangers, display',
                  letterSpacing: '2px',
                  textShadow: '-3px -3px 0 #1A1A1A, 3px -3px 0 #1A1A1A, -3px 3px 0 #1A1A1A, 3px 3px 0 #1A1A1A',
                  pointerEvents: 'none',
                  zIndex: 10,
                  whiteSpace: 'nowrap',
                }}
              >
                {v.text}
              </div>
            ))}
            {/* Canvas VFX word overlay (from PlayCanvas DOM events) */}
            {vfxWord && (
              <div style={{
                position: 'absolute', inset: 0, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                pointerEvents: 'none', zIndex: 10,
              }}>
                <span style={{
                  fontFamily: 'Bangers, display',
                  fontSize: '5rem',
                  color: vfxWord.color,
                  WebkitTextStroke: '4px #111',
                  textShadow: '4px 4px 0 #111, -4px -4px 0 #111, 4px -4px 0 #111, -4px 4px 0 #111',
                  animation: 'vfxPop 0.7s ease-out forwards',
                  letterSpacing: '0.05em',
                }}>
                  {vfxWord.text}
                </span>
              </div>
            )}
          </div>

          {/* Below-canvas controls: tick/seed + abort — always visible */}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', margin: '0.5rem 0', flexWrap: 'wrap' }}>
            <span className="turn-counter">Tick {tick}</span>
            <span className="arena-badge">{matchTimeSec}s</span>
            <span className="seed-pill">Seed {activeSeed}</span>
            <button className="action-btn secondary" style={{ padding: '0.35rem 1rem', fontSize: '0.85rem' }} onClick={abortMatch}>Abort</button>
          </div>

          {/* Energy bars — always visible below canvas */}
          <div className="energy-row" style={{ maxWidth: '800px', margin: '0 auto 1rem' }}>
            <div className="energy-block">
              <div className="energy-label" style={{ color: '#00E5FF' }}>{aName} Energy</div>
              <div className="bar-shell">
                <div className="bar-fill" style={{ width: `${(botAEnergy / ENERGY_MAX) * 100}%`, background: 'linear-gradient(90deg, #00e5ff, #0077b6)' }} />
              </div>
              <div className="hint" style={{ fontSize: '0.75rem' }}>{Math.round(botAEnergy / 10)}e</div>
            </div>
            <div className="energy-block">
              <div className="energy-label" style={{ color: '#eb4d4b' }}>{bName} Energy</div>
              <div className="bar-shell">
                <div className="bar-fill" style={{ width: `${(botBEnergy / ENERGY_MAX) * 100}%`, background: 'linear-gradient(90deg, #ff6b6b, #c0392b)' }} />
              </div>
              <div className="hint" style={{ fontSize: '0.75rem' }}>{Math.round(botBEnergy / 10)}e</div>
            </div>
          </div>

          {/* Combat log — always visible, no CSS grid fallback */}
          <section className="panel" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="section-label">Combat Log</div>
            <div className="feed" style={{ maxHeight: '220px' }}>
              {feed.length === 0 && (
                <div className="feed-item">Waiting for first LLM decisions...</div>
              )}
              {feed.map((entry, index) => (
                <div key={`${index}-${entry.slice(0, 20)}`} className="feed-item">{entry}</div>
              ))}
            </div>
          </section>
        </main>
      )}

      {/* ======================== RESULT ======================== */}
      {phase === 'result' && (
        <div className="ko-overlay">
          <div className="ko-radial-bg" />
          <div className="ko-content">
            <div className="ko-title">
              {endReason === 'ABORTED' ? 'ABORTED' : endReason === 'KO' ? 'K.O.!' : endReason === 'TIMEOUT' ? 'TIME!' : 'MATCH OVER'}
            </div>
            <div className="ko-winner-name">
              {winnerId ? `${winnerName} WINS` : 'DRAW'}
            </div>
            <div className="ko-reason">
              {endReason === 'KO' ? 'KNOCKOUT'
                : endReason === 'TIMEOUT' ? 'TIME EXPIRED'
                : endReason === 'ABORTED' ? 'MATCH ABORTED'
                : endReason?.replace(/_/g, ' ') || ''}
            </div>

            {finalStats && (
              <div className="ko-stats-grid">
                <span style={{ color: '#2ecc71' }}>{aName}: HP {finalStats.botAHp}</span>
                <span style={{ color: '#eb4d4b' }}>{bName}: HP {finalStats.botBHp}</span>
                <span style={{ color: '#2ecc71' }}>Damage dealt: {finalStats.botADmg}</span>
                <span style={{ color: '#eb4d4b' }}>Damage dealt: {finalStats.botBDmg}</span>
                <span style={{ color: '#2ecc71' }}>Illegal actions: {finalStats.botAIllegal}</span>
                <span style={{ color: '#eb4d4b' }}>Illegal actions: {finalStats.botBIllegal}</span>
                <span style={{ color: '#2ecc71' }}>Obj score: {(finalStats.objA / UNIT_SCALE).toFixed(1)}</span>
                <span style={{ color: '#eb4d4b' }}>Obj score: {(finalStats.objB / UNIT_SCALE).toFixed(1)}</span>
              </div>
            )}

            <div className="ko-stats">
              Tick {tick} &middot; {matchTimeSec}s &middot; Seed {activeSeed}
            </div>

            <div className="ko-actions">
              <button className="ko-btn" onClick={() => { startMatch(); }}>
                Rematch
              </button>
              <button className="ko-btn secondary" onClick={() => { setPhase('lobby'); }}>
                Reconfigure
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Play;
