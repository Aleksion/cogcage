import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  createInitialState,
  createActorState,
  resolveTick,
  UNIT_SCALE,
  DECISION_WINDOW_TICKS,
  ENERGY_MAX,
  HP_MAX,
  ACTION_COST,
  MELEE_RANGE,
  createBot,
  Rng,
} from '../lib/ws2/index.js';

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
    position: fixed;
    inset: 0;
    pointer-events: none;
    opacity: 0.12;
    background: repeating-linear-gradient(
      0deg,
      rgba(0,0,0,0.15),
      rgba(0,0,0,0.15) 1px,
      transparent 1px,
      transparent 4px
    );
    z-index: 0;
  }

  .play-header {
    position: sticky;
    top: 0;
    z-index: 5;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.5rem 2.5rem;
    background: rgba(255,255,255,0.9);
    border-bottom: 4px solid var(--c-dark);
    backdrop-filter: blur(8px);
  }

  .logo {
    font-family: var(--f-display);
    font-size: 2.2rem;
    text-decoration: none;
    color: var(--c-red);
    text-shadow: 2px 2px 0px var(--c-dark);
  }

  .header-links { display: flex; gap: 1rem; align-items: center; }

  .header-link {
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--c-dark);
    padding: 0.5rem 1rem;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
    background: var(--c-white);
    box-shadow: var(--shadow-hard);
    font-size: 0.95rem;
  }

  .header-link.active { background: var(--c-yellow); }

  .play-shell {
    position: relative;
    z-index: 1;
    padding: 2.5rem 3rem 3.5rem;
  }

  .panel {
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    border-radius: var(--radius);
    box-shadow: var(--shadow-hard);
    padding: 2rem;
  }

  .panel h2 {
    font-family: var(--f-display);
    font-size: 2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 1rem;
  }

  .section-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.9rem;
    margin-bottom: 0.5rem;
    letter-spacing: 1px;
  }

  .prompt-box {
    width: 100%;
    min-height: 72px;
    resize: vertical;
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    padding: 0.75rem 1rem;
    font-family: var(--f-body);
    font-size: 1rem;
  }

  .slider-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }
  .slider-row label {
    font-size: 0.65rem;
    font-family: monospace;
    color: #888;
    width: 2.4rem;
    flex-shrink: 0;
    text-transform: uppercase;
  }
  .slider-row input[type="range"] {
    flex: 1;
    accent-color: var(--c-yellow);
    cursor: pointer;
  }
  .slider-row .slider-val {
    font-size: 0.65rem;
    font-family: monospace;
    color: #888;
    width: 2rem;
    text-align: right;
    flex-shrink: 0;
  }

  .your-bot-card {
    background: rgba(255,214,0,0.07);
    border: 2px dashed var(--c-yellow);
    border-radius: 10px;
    padding: 0.9rem;
    margin-bottom: 1rem;
  }
  .your-bot-card h3 {
    font-family: var(--f-display);
    font-size: 1.2rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 0.6rem;
  }

  .cta-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-family: var(--f-display);
    font-size: 1.3rem;
    text-transform: uppercase;
    padding: 0.9rem 2.5rem;
    background: var(--c-red);
    color: var(--c-white);
    border: 4px solid var(--c-dark);
    border-radius: 999px;
    box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer;
    transition: transform 0.1s ease;
  }

  .cta-btn:active { transform: translateY(4px); box-shadow: none; }
  .cta-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: 0 6px 0 var(--c-dark); }

  .action-btn {
    border: 3px solid var(--c-dark);
    border-radius: 12px;
    background: var(--c-yellow);
    font-weight: 900;
    padding: 0.65rem 0.5rem;
    cursor: pointer;
    font-size: 0.95rem;
    text-transform: uppercase;
  }
  .action-btn.secondary { background: var(--c-white); }
  .action-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .status-pill {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    font-weight: 900;
    padding: 0.35rem 0.8rem;
    border-radius: 999px;
    border: 2px solid var(--c-dark);
    background: var(--c-white);
    font-size: 0.85rem;
  }

  .arena-badge {
    font-family: var(--f-display);
    font-size: 1.1rem;
    text-transform: uppercase;
    background: var(--c-cyan);
    padding: 0.35rem 0.9rem;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
  }

  .stat-block { margin-bottom: 1.2rem; }

  .stat-title {
    display: flex;
    justify-content: space-between;
    font-weight: 800;
    margin-bottom: 0.35rem;
  }

  .bar-shell {
    height: 16px;
    background: #101010;
    border-radius: 999px;
    overflow: hidden;
    border: 2px solid var(--c-dark);
  }

  .bar-fill {
    height: 100%;
    transition: width 0.35s ease, background 0.35s ease;
  }

  .arena-map {
    margin: 1rem 0 1.2rem;
    display: grid;
    grid-template-columns: repeat(var(--grid-size), minmax(28px, 1fr));
    gap: 6px;
    padding: 0.75rem;
    background:
      radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px),
      #101010;
    background-size: 8px 8px, 100% 100%;
    border-radius: 16px;
    border: 3px solid #111;
    box-shadow: 0 0 0 2px #111, 0 0 0 5px #FFD233;
    position: relative;
  }

  .arena-map.arena-flash {
    animation: arena-ko-flash 0.3s ease-out 2;
  }

  .arena-cell {
    position: relative;
    aspect-ratio: 1 / 1;
    border-radius: 10px;
    background: #f6f7f8;
    border: 2px solid rgba(0,0,0,0.2);
    display: grid;
    place-items: center;
    font-weight: 900;
    color: #111;
    overflow: visible;
  }

  .arena-cell.obstacle {
    background:
      repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px),
      repeating-linear-gradient(-45deg, transparent, transparent 3px, rgba(255,255,255,0.08) 3px, rgba(255,255,255,0.08) 4px),
      #2f2f2f;
    border-color: #000;
    box-shadow: inset 0 0 0 2px rgba(255,255,255,0.05);
  }

  .arena-cell.in-range {
    box-shadow: inset 0 0 0 3px rgba(255, 214, 0, 0.85);
  }

  .arena-cell.player {
    background: rgba(46, 204, 113, 0.18);
    border-color: #2ecc71;
    padding: 3px;
  }

  .arena-cell.enemy {
    background: rgba(235, 77, 75, 0.18);
    border-color: #eb4d4b;
    padding: 3px;
  }

  .arena-cell.cell-vfx-flash {
    animation: cell-flash-anim 200ms ease-out;
  }

  .arena-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem 1rem;
    font-size: 0.85rem;
  }

  .feed {
    background: #0f0f0f;
    color: #f5f5f5;
    border-radius: 12px;
    border: 3px solid var(--c-dark);
    padding: 1rem;
    max-height: 320px;
    overflow-y: auto;
    font-size: 0.95rem;
    line-height: 1.5;
  }

  .feed-item { padding: 0.6rem 0.4rem; border-bottom: 1px solid rgba(255,255,255,0.1); }
  .feed-item:last-child { border-bottom: none; }

  .leaderboard {
    margin-top: 1.5rem;
    border-top: 3px solid var(--c-dark);
    padding-top: 1.2rem;
  }

  .hint { font-size: 0.9rem; opacity: 0.7; }

  .seed-pill {
    font-size: 0.85rem;
    font-weight: 800;
    border: 2px dashed var(--c-dark);
    border-radius: 999px;
    padding: 0.3rem 0.8rem;
    display: inline-flex;
    gap: 0.35rem;
    align-items: center;
  }

  /* --- VFX Keyframes --- */

  @keyframes vfx-burst-in {
    0% { transform: scale(0.2) rotate(-12deg); opacity: 0; }
    20% { transform: scale(1.4) rotate(4deg); opacity: 1; }
    50% { transform: scale(0.95) rotate(-2deg); opacity: 1; }
    75% { transform: scale(1.05) rotate(1deg); opacity: 0.7; }
    100% { transform: scale(1.1) rotate(0deg); opacity: 0; }
  }

  @keyframes vfx-ring-pulse {
    0% { transform: scale(0.3); opacity: 1; }
    50% { transform: scale(1.1); opacity: 0.8; }
    100% { transform: scale(1.5); opacity: 0; }
  }

  @keyframes vfx-bolt-in {
    0% { transform: scale(0.3) skewX(-10deg); opacity: 0; }
    25% { transform: scale(1.2) skewX(5deg); opacity: 1; }
    70% { transform: scale(1) skewX(0deg); opacity: 0.8; }
    100% { transform: scale(1.1) skewX(-3deg); opacity: 0; }
  }

  @keyframes cell-flash-anim {
    0% { box-shadow: inset 0 0 0 50px rgba(255,255,255,0.6); }
    100% { box-shadow: inset 0 0 0 50px rgba(255,255,255,0); }
  }

  @keyframes arena-ko-flash {
    0%, 100% { box-shadow: 0 0 0 2px #111, 0 0 0 5px #FFD233; }
    50% { box-shadow: 0 0 0 3px #fff, 0 0 0 7px #FF4D4D, 0 0 25px rgba(255,77,77,0.5); }
  }

  @keyframes ko-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  @keyframes ko-text-slam {
    0% { transform: scale(4); opacity: 0; }
    30% { transform: scale(0.85); opacity: 1; }
    50% { transform: scale(1.15); opacity: 1; }
    100% { transform: scale(1); opacity: 1; }
  }

  @keyframes ko-fade-up {
    0% { transform: translateY(20px); opacity: 0; }
    100% { transform: translateY(0); opacity: 1; }
  }

  @keyframes energyFlash {
    0%, 100% { background: linear-gradient(90deg, #00e5ff 0%, #0077b6 100%); }
    50% { background: linear-gradient(90deg, #eb4d4b 0%, #c0392b 100%); }
  }

  /* --- VFX Popup --- */

  .vfx-popup {
    position: absolute;
    inset: -50%;
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10;
    pointer-events: none;
    font-family: var(--f-display);
    letter-spacing: 1px;
    white-space: nowrap;
  }

  .vfx-popup.burst { font-size: 1.5em; animation: vfx-burst-in 600ms ease-out forwards; }
  .vfx-popup.ring { font-size: 1.3em; animation: vfx-ring-pulse 600ms ease-out forwards; }
  .vfx-popup.bolt { font-size: 1.3em; font-style: italic; animation: vfx-bolt-in 500ms ease-out forwards; }
  .vfx-popup.ko { font-size: 2em; animation: ko-text-slam 800ms ease-out forwards; }

  .vfx-popup span {
    text-shadow:
      2px 2px 0px rgba(0,0,0,0.85),
      -1px -1px 0px rgba(0,0,0,0.4),
      0 0 8px rgba(0,0,0,0.3);
  }

  /* --- KO Overlay / Result Phase --- */

  .ko-overlay {
    position: fixed;
    inset: 0;
    z-index: 100;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.92);
    overflow: hidden;
  }

  .ko-radial-bg {
    position: absolute;
    width: 250%;
    height: 250%;
    top: -75%;
    left: -75%;
    background: repeating-conic-gradient(from 0deg, #FFD233 0deg 5deg, #111 5deg 10deg);
    animation: ko-spin 20s linear infinite;
    opacity: 0.15;
    pointer-events: none;
  }

  .ko-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    text-align: center;
    padding: 2rem;
  }

  .ko-title {
    font-family: var(--f-display);
    font-size: 6rem;
    color: #FFD233;
    text-shadow: 4px 4px 0px #111, -2px -2px 0px #111, 0 0 40px rgba(255,210,51,0.4);
    text-transform: uppercase;
    animation: ko-text-slam 0.6s ease-out;
  }

  .ko-winner-name {
    font-family: var(--f-display);
    font-size: 2.5rem;
    color: #fff;
    text-shadow: 2px 2px 0px #111;
    text-transform: uppercase;
    animation: ko-fade-up 0.5s ease-out 0.3s both;
  }

  .ko-reason {
    font-family: var(--f-body);
    font-size: 1.1rem;
    color: #aaa;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    animation: ko-fade-up 0.5s ease-out 0.5s both;
  }

  .ko-stats {
    font-family: var(--f-body);
    font-size: 1rem;
    color: #888;
    animation: ko-fade-up 0.5s ease-out 0.6s both;
  }

  .ko-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 1.5rem;
    animation: ko-fade-up 0.5s ease-out 0.7s both;
  }

  .ko-btn {
    font-family: var(--f-display);
    font-size: 1.6rem;
    text-transform: uppercase;
    padding: 1rem 3rem;
    background: #FFD233;
    color: #111;
    border: 4px solid #111;
    border-radius: 999px;
    box-shadow: 0 6px 0 #111;
    cursor: pointer;
    transition: transform 0.1s ease;
  }
  .ko-btn:active { transform: translateY(4px); box-shadow: none; }
  .ko-btn.secondary { background: #fff; }

  /* --- Tactic Chip --- */

  .tactic-chip {
    display: inline-flex;
    padding: 2px 10px;
    border-radius: 999px;
    font-size: 0.72rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border: 2px solid var(--c-dark);
    background: var(--c-yellow);
    color: var(--c-dark);
    margin-left: 0.5rem;
    vertical-align: middle;
  }

  .tactic-chip.enemy-chip {
    background: var(--c-red);
    color: #fff;
  }

  .turn-counter {
    font-family: var(--f-display);
    font-size: 1rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: var(--c-dark);
  }

  /* --- Lobby Phase --- */

  .lobby-container { max-width: 900px; margin: 0 auto; }

  .lobby-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2rem;
    margin-bottom: 2rem;
  }

  .opponent-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.75rem;
  }

  .opponent-card {
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    border-radius: var(--radius);
    padding: 1rem;
    cursor: pointer;
    transition: border-color 0.15s, box-shadow 0.15s;
  }
  .opponent-card:hover { box-shadow: var(--shadow-hard); }
  .opponent-card.selected {
    border-color: var(--c-yellow);
    box-shadow: 0 0 0 3px var(--c-yellow), var(--shadow-hard);
  }
  .opponent-card h4 {
    font-family: var(--f-display);
    font-size: 1.1rem;
    text-transform: uppercase;
    margin-bottom: 0.25rem;
  }

  .archetype-tag {
    font-size: 0.58rem;
    font-family: monospace;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 1px 5px;
    border-radius: 3px;
    display: inline-block;
    margin-bottom: 0.4rem;
  }

  .seed-toggle {
    font-size: 0.85rem;
    font-weight: 800;
    cursor: pointer;
    color: #666;
    background: none;
    border: none;
    text-decoration: underline;
    padding: 0;
    margin-bottom: 0.5rem;
  }

  .enter-arena-btn {
    width: 100%;
    margin-top: 1.5rem;
    font-size: 1.5rem;
    padding: 1.1rem 2.5rem;
  }

  /* --- Match Phase --- */

  .match-grid {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 2rem;
  }

  .match-sidebar .feed { max-height: 260px; margin-top: 1rem; }

  .controls-row {
    display: flex;
    gap: 1rem;
    align-items: flex-start;
    margin-top: 0.75rem;
  }

  .dpad {
    display: grid;
    grid-template-columns: repeat(3, 48px);
    grid-template-rows: repeat(2, 48px);
    gap: 4px;
    flex-shrink: 0;
  }
  .dpad-spacer { visibility: hidden; }

  .combat-actions {
    display: flex;
    flex-direction: column;
    gap: 4px;
    flex: 1;
  }
  .combat-actions .action-btn { width: 100%; }

  .skip-row { margin-top: 0.5rem; }
  .skip-row .action-btn { width: 100%; }

  .energy-hint {
    font-size: 0.8rem;
    font-family: monospace;
    color: #888;
    margin-top: 0.5rem;
  }

  .kbd-hint {
    font-size: 0.75rem;
    color: #999;
    margin-top: 0.4rem;
  }

  .bar-fill.energy-flash {
    animation: energyFlash 0.3s ease 2;
  }

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
    .opponent-grid { grid-template-columns: 1fr; }
    .dpad { grid-template-columns: repeat(3, 40px); grid-template-rows: repeat(2, 40px); }
    .ko-title { font-size: 3rem; }
    .ko-winner-name { font-size: 1.6rem; }
    .ko-btn { font-size: 1.2rem; padding: 0.8rem 2rem; }
  }
`;

/* --- Inline SVG Bot Sprites --- */

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
  cell: Vec;
  text: string;
  color: string;
  type: 'burst' | 'ring' | 'bolt' | 'ko';
};

type BotPreset = {
  id: string;
  name: string;
  tagline: string;
  aggression: number;
  defense: number;
  risk: number;
  archetype: 'melee' | 'ranged' | 'balanced';
};

type PlayerBotConfig = {
  name: string;
  directive: string;
  aggression: number;
  defense: number;
  risk: number;
};

const DEFAULT_PLAYER_BOT: PlayerBotConfig = {
  name: 'My Bot',
  directive: '',
  aggression: 60,
  defense: 50,
  risk: 40,
};

type Vec = { x: number; y: number };

type Cell = 'empty' | 'obstacle';

type GameState = {
  grid: Cell[][];
  playerPos: Vec;
  enemyPos: Vec;
};

const EMAIL_KEY = 'cogcage_email';
const PLAY_VIEWED_KEY = 'cogcage_play_viewed';
const PLAY_FOUNDER_COPY_VARIANT_KEY = 'cogcage_play_founder_copy_variant';
const FOUNDER_INTENT_REPLAY_QUEUE_KEY = 'cogcage_founder_intent_replay_queue';

const GRID_SIZE = 8;

const pickPlayFounderCopyVariant = () => {
  if (typeof window === 'undefined') return 'momentum';
  const existing = window.localStorage.getItem(PLAY_FOUNDER_COPY_VARIANT_KEY);
  if (existing === 'momentum' || existing === 'utility') return existing;
  const assigned = Math.random() < 0.5 ? 'momentum' : 'utility';
  window.localStorage.setItem(PLAY_FOUNDER_COPY_VARIANT_KEY, assigned);
  return assigned;
};

const founderCheckoutUrl =
  ((import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.PUBLIC_STRIPE_FOUNDER_URL ?? '').trim();

const createIdempotencyKey = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `idem_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

const submitWithRetry = async (url: string, payload: Record<string, unknown>, retries = 1, timeoutMs = 6000) => {
  let lastError: unknown = null;
  const idempotencyKey = createIdempotencyKey();

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-idempotency-key': idempotencyKey,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      window.clearTimeout(timeout);

      let body: Record<string, unknown> = {};
      const responseText = await response.text();
      if (responseText) {
        try {
          body = JSON.parse(responseText) as Record<string, unknown>;
        } catch {
          body = { raw: responseText.slice(0, 400) };
        }
      }

      if (response.ok && body.ok === true) return body;
      const err = new Error(String(body?.error || `Request failed (${response.status})`)) as Error & {
        status?: number;
        requestId?: string;
        retryAfter?: string;
      };
      err.status = response.status;
      err.requestId = String(body?.requestId || response.headers.get('x-request-id') || '');
      err.retryAfter = response.headers.get('retry-after') || undefined;
      if (response.status >= 500 && attempt < retries) {
        lastError = err;
        await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
        continue;
      }
      throw err;
    } catch (error) {
      window.clearTimeout(timeout);
      lastError = error;
      if (attempt >= retries) throw error;
      const status = Number((error as { status?: number })?.status);
      if (Number.isFinite(status) && status < 500) throw error;
      await new Promise((resolve) => setTimeout(resolve, 250 * (attempt + 1)));
    }
  }

  throw lastError || new Error('Request failed');
};

const shouldQueueForReplay = (error: unknown) => {
  if (!error || typeof error !== 'object') return true;
  const status = Number((error as { status?: number }).status);
  if (Number.isFinite(status)) {
    return status >= 500;
  }
  return true;
};

const readFounderIntentReplayQueue = () => {
  try {
    const raw = window.localStorage.getItem(FOUNDER_INTENT_REPLAY_QUEUE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

const writeFounderIntentReplayQueue = (queue: Array<Record<string, unknown>>) => {
  try {
    if (!queue.length) {
      window.localStorage.removeItem(FOUNDER_INTENT_REPLAY_QUEUE_KEY);
      return;
    }
    window.localStorage.setItem(FOUNDER_INTENT_REPLAY_QUEUE_KEY, JSON.stringify(queue.slice(-20)));
  } catch {
    // best-effort cache only
  }
};

const enqueueFounderIntentReplay = (payload: Record<string, unknown>) => {
  const queue = readFounderIntentReplayQueue();
  const normalizedEmail = String(payload.email || '').trim().toLowerCase();
  const intentId = String(payload.intentId || '');
  const deduped = queue.filter((item) => String(item.intentId || '') !== intentId);
  deduped.push({ ...payload, email: normalizedEmail, queuedAt: new Date().toISOString() });
  writeFounderIntentReplayQueue(deduped);
};

const makeFounderIntentId = (email: string, source: string) => {
  const day = new Date().toISOString().slice(0, 10);
  return `intent:${day}:${hashString(`${email}|${source}|${day}`)}`;
};

const OPPONENTS: BotPreset[] = [
  {
    id: 'forge-titan',
    name: 'Forge Titan',
    tagline: 'Slow grind, heavy guard, brutal counters.',
    aggression: 45,
    defense: 85,
    risk: 20,
    archetype: 'melee',
  },
  {
    id: 'neon-wraith',
    name: 'Neon Wraith',
    tagline: 'Unpredictable, loves risky overclocks.',
    aggression: 65,
    defense: 35,
    risk: 80,
    archetype: 'balanced',
  },
  {
    id: 'cinder-hawk',
    name: 'Cinder Hawk',
    tagline: 'Fast strikes, kites at range, never stops.',
    aggression: 85,
    defense: 25,
    risk: 45,
    archetype: 'ranged',
  },
  {
    id: 'null-protocol',
    name: 'Null Protocol',
    tagline: 'Drains resources, punishes impatience, wins by attrition.',
    aggression: 30,
    defense: 50,
    risk: 90,
    archetype: 'balanced',
  },
];

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const hashString = (input: string) => {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
};

const mulberry32 = (seed: number) => {
  let t = seed;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

const rngInt = (rng: () => number, min: number, max: number) =>
  Math.floor(rng() * (max - min + 1)) + min;

const manhattan = (a: Vec, b: Vec) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y);

const isSame = (a: Vec, b: Vec) => a.x === b.x && a.y === b.y;

const neighbors = (pos: Vec, size: number) => [
  { x: pos.x, y: pos.y - 1 },
  { x: pos.x + 1, y: pos.y },
  { x: pos.x, y: pos.y + 1 },
  { x: pos.x - 1, y: pos.y },
].filter((next) => next.x >= 0 && next.y >= 0 && next.x < size && next.y < size);

const hasPath = (grid: Cell[][], start: Vec, goal: Vec) => {
  const visited = new Set<string>();
  const queue: Vec[] = [start];
  const key = (pos: Vec) => `${pos.x}:${pos.y}`;
  visited.add(key(start));

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (isSame(current, goal)) return true;

    for (const next of neighbors(current, GRID_SIZE)) {
      if (grid[next.y]?.[next.x] === 'obstacle') continue;
      const nextKey = key(next);
      if (visited.has(nextKey)) continue;
      visited.add(nextKey);
      queue.push(next);
    }
  }

  return false;
};

const generateMap = (rng: () => number): GameState => {
  const playerPos = { x: 0, y: GRID_SIZE - 1 };
  const enemyPos = { x: GRID_SIZE - 1, y: 0 };
  const maxObstacles = Math.floor(GRID_SIZE * GRID_SIZE * 0.18);

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const grid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
      Array.from({ length: GRID_SIZE }, () => 'empty')
    );

    let obstacles = 0;

    for (let y = 0; y < GRID_SIZE; y += 1) {
      for (let x = 0; x < GRID_SIZE; x += 1) {
        if (obstacles >= maxObstacles) continue;
        if ((x === playerPos.x && y === playerPos.y) || (x === enemyPos.x && y === enemyPos.y)) continue;
        if (Math.abs(x - playerPos.x) + Math.abs(y - playerPos.y) <= 1) continue;
        if (Math.abs(x - enemyPos.x) + Math.abs(y - enemyPos.y) <= 1) continue;
        if (rng() < 0.12) {
          grid[y][x] = 'obstacle';
          obstacles += 1;
        }
      }
    }

    if (hasPath(grid, playerPos, enemyPos)) {
      return { grid, playerPos, enemyPos };
    }
  }

  const fallbackGrid: Cell[][] = Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => 'empty')
  );

  return { grid: fallbackGrid, playerPos, enemyPos };
};

const hpBarGradient = (hp: number): string => {
  if (hp > 60) return 'linear-gradient(90deg, #2ecc71, #27ae60)';
  if (hp > 30) return 'linear-gradient(90deg, #f39c12, #e67e22)';
  return 'linear-gradient(90deg, #FF4D4D, #c0392b)';
};

const archetypeColors = (archetype: string) => {
  if (archetype === 'melee') return { bg: '#3a1f1f', fg: '#ff7a7a' };
  if (archetype === 'ranged') return { bg: '#1f2f3a', fg: '#7ad4ff' };
  return { bg: '#1f2d1f', fg: '#7aff9a' };
};

/* ========== Component ========== */

const Play = () => {
  // --- Core game state ---
  const [seedInput, setSeedInput] = useState('');
  const [activeSeed, setActiveSeed] = useState<number | null>(null);
  const [grid, setGrid] = useState<Cell[][]>([]);
  const [playerPos, setPlayerPos] = useState<Vec>({ x: 0, y: 0 });
  const [enemyPos, setEnemyPos] = useState<Vec>({ x: 0, y: 0 });
  const [playerHp, setPlayerHp] = useState(HP_MAX);
  const [enemyHp, setEnemyHp] = useState(HP_MAX);
  const [playerEnergy, setPlayerEnergy] = useState(ENERGY_MAX);
  const [turn, setTurn] = useState(1);
  const [feed, setFeed] = useState<string[]>([]);
  const [running, setRunning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [opponentId, setOpponentId] = useState(OPPONENTS[0].id);
  const [playerBotConfig, setPlayerBotConfig] = useState<PlayerBotConfig>(DEFAULT_PLAYER_BOT);
  const [email, setEmail] = useState('');
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [checkoutMessage, setCheckoutMessage] = useState<string | null>(null);
  const [playFounderCopyVariant, setPlayFounderCopyVariant] = useState<'momentum' | 'utility'>('momentum');

  // --- Phase state ---
  const [phase, setPhase] = useState<'lobby' | 'match' | 'result'>('lobby');
  const [showSeedInput, setShowSeedInput] = useState(false);

  // --- WS7 visual state ---
  const [vfxEvents, setVfxEvents] = useState<VfxEvent[]>([]);
  const [playerLastAction, setPlayerLastAction] = useState('');
  const [enemyLastAction, setEnemyLastAction] = useState('');
  const [arenaFlash, setArenaFlash] = useState(false);
  const [energyFlash, setEnergyFlash] = useState(false);

  // --- Refs ---
  const rngRef = useRef<() => number>(() => Math.random);
  const engineRef = useRef<any>(null);
  const botRef = useRef<any>(null);
  const energyFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- VFX ---
  const spawnVfx = (cell: Vec, text: string, color: string, type: VfxEvent['type'] = 'burst', duration = 600) => {
    const id = `vfx_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const event: VfxEvent = { id, cell: { ...cell }, text, color, type };
    setVfxEvents((prev) => [...prev, event]);
    window.setTimeout(() => {
      setVfxEvents((prev) => prev.filter((e) => e.id !== id));
    }, duration);
  };

  const postEvent = async (event: string, meta: Record<string, unknown> = {}) => {
    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          source: 'play-page',
          email: email.trim() || undefined,
          meta,
        }),
      });
    } catch {
      // Best-effort analytics only.
    }
  };

  const opponent = useMemo(
    () => OPPONENTS.find((bot) => bot.id === opponentId) || OPPONENTS[0],
    [opponentId]
  );

  const founderCtaVariant = useMemo(() => {
    if (!winner) {
      if (playFounderCopyVariant === 'utility') {
        return {
          key: 'neutral',
          title: 'Get Founder Tools Before Launch',
          message: 'Founder access adds deeper analytics, faster iteration loops, and priority ladder placement at $29/mo before launch pricing moves to $49/mo.',
          button: 'Get Founder Tools',
        };
      }
      return {
        key: 'neutral',
        title: 'Unlock Founder Pricing',
        message: 'Keep your edge: lock $29/mo before launch pricing moves to $49/mo.',
        button: 'Reserve Founder Spot',
      };
    }

    if (winner === 'You') {
      if (playFounderCopyVariant === 'utility') {
        return {
          key: 'winner',
          title: 'Convert This Win Into Repeatable Edge',
          message: 'Founder mode unlocks analytics and priority ladder access so this result becomes your baseline before pricing moves to $49/mo.',
          button: 'Enable Founder Analytics',
        };
      }
      return {
        key: 'winner',
        title: 'You Won. Lock In Founder Advantage',
        message: 'Your build already performs. Keep momentum with founder access at $29/mo before it moves to $49/mo.',
        button: 'Claim Winner Founder Price',
      };
    }

    if (playFounderCopyVariant === 'utility') {
      return {
        key: 'loser',
        title: 'Debug Faster With Founder Mode',
        message: 'Get extra reps, richer match analytics, and priority ladder slots so you can close the gap before launch pricing moves to $49/mo.',
        button: 'Unlock Founder Rebuild Kit',
      };
    }

    return {
      key: 'loser',
      title: 'Run It Back With Founder Access',
      message: 'Get more reps, analytics, and priority ladder access at $29/mo before launch pricing moves to $49/mo.',
      button: 'Unlock Founder Rematch Pass',
    };
  }, [playFounderCopyVariant, winner]);

  // --- Effects ---

  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = window.localStorage.getItem(EMAIL_KEY) || '';
    if (saved) setEmail(saved);
    setPlayFounderCopyVariant(pickPlayFounderCopyVariant());

    const viewedSent = window.localStorage.getItem(PLAY_VIEWED_KEY);
    if (!viewedSent) {
      void postEvent('play_page_viewed', { founderCopyVariant: pickPlayFounderCopyVariant() });
      window.localStorage.setItem(PLAY_VIEWED_KEY, '1');
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const flushFounderIntentQueue = async () => {
      if (!navigator.onLine) return;
      const queue = readFounderIntentReplayQueue();
      if (!queue.length) return;
      const remaining: Array<Record<string, unknown>> = [];

      for (const item of queue) {
        try {
          await submitWithRetry('/api/founder-intent', item, 0, 7000);
          await postEvent('founder_intent_replay_sent', {
            source: item.source,
            intentId: item.intentId,
            queuedAt: item.queuedAt,
            founderCopyVariant: item.founderCopyVariant,
          });
        } catch (error) {
          if (shouldQueueForReplay(error)) {
            remaining.push(item);
          }
          await postEvent('founder_intent_replay_failed', {
            source: item.source,
            intentId: item.intentId,
            queuedAt: item.queuedAt,
            founderCopyVariant: item.founderCopyVariant,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      writeFounderIntentReplayQueue(remaining);
    };

    void flushFounderIntentQueue();
    const onOnline = () => { void flushFounderIntentQueue(); };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  useEffect(() => {
    if (!winner) return;
    void postEvent('play_match_completed', {
      winner,
      turn,
      seed: activeSeed,
      opponent: opponent.name,
      playerHp,
      enemyHp,
      ctaVariant: founderCtaVariant.key,
      founderCopyVariant: playFounderCopyVariant,
    });
  }, [activeSeed, enemyHp, founderCtaVariant.key, opponent.name, playFounderCopyVariant, playerHp, turn, winner]);

  // --- Match lifecycle ---

  const resetMatch = () => {
    setRunning(false);
    setWinner(null);
    setFeed([]);
    setPlayerHp(HP_MAX);
    setEnemyHp(HP_MAX);
    setPlayerEnergy(ENERGY_MAX);
    setTurn(1);
    engineRef.current = null;
    botRef.current = null;
    setVfxEvents([]);
    setPlayerLastAction('');
    setEnemyLastAction('');
    setArenaFlash(false);
    setEnergyFlash(false);
  };

  const startMatch = () => {
    if (running) return;
    resetMatch();
    const seedLabel = seedInput.trim() || `${Date.now()}`;
    const seed = hashString(`${seedLabel}|${opponentId}`) || 1;
    const rng = mulberry32(seed);
    rngRef.current = rng;

    const map = generateMap(rng);
    setGrid(map.grid);
    setPlayerPos(map.playerPos);
    setEnemyPos(map.enemyPos);
    setActiveSeed(seed);

    const playerArmor: 'light' | 'medium' | 'heavy' =
      playerBotConfig.defense >= 65 ? 'heavy'
      : playerBotConfig.aggression >= 65 ? 'light'
      : 'medium';

    const enemyArmor: 'light' | 'medium' | 'heavy' =
      opponent.archetype === 'melee' ? 'heavy'
      : opponent.archetype === 'ranged' ? 'light'
      : 'medium';

    const actors = {
      player: createActorState({
        id: 'player',
        position: { x: map.playerPos.x * UNIT_SCALE, y: map.playerPos.y * UNIT_SCALE },
        facing: 'N',
        armor: playerArmor,
      }),
      enemy: createActorState({
        id: 'enemy',
        position: { x: map.enemyPos.x * UNIT_SCALE, y: map.enemyPos.y * UNIT_SCALE },
        facing: 'S',
        armor: enemyArmor,
      }),
    };
    engineRef.current = createInitialState({ seed, actors });
    botRef.current = createBot(opponent.archetype, new Rng(seed));

    setFeed([
      `Match initialized. Seed ${seed}.`,
      `Arena size ${GRID_SIZE}x${GRID_SIZE}. Opponent: ${opponent.name} [${opponent.archetype}/${enemyArmor}].`,
      `Your loadout: ${playerBotConfig.name.trim() || 'My Bot'} \u2014 armor:${playerArmor} AGGR:${playerBotConfig.aggression} DEF:${playerBotConfig.defense} RISK:${playerBotConfig.risk}`,
    ]);
    setRunning(true);
    setPhase('match');
    void postEvent('play_match_started', { seed, opponent: opponent.id, opponentArchetype: opponent.archetype, gridSize: GRID_SIZE, playerArmor, playerAggr: playerBotConfig.aggression, playerDef: playerBotConfig.defense, playerRisk: playerBotConfig.risk });
  };

  const logFeed = (lines: string[]) => {
    setFeed((prev) => [...lines, ...prev].slice(0, 50));
  };

  const formatEvent = (event: { type: string; actorId: string | null; targetId: string | null; data: any }): string | null => {
    const who = event.actorId === 'player' ? 'You' : opponent.name;
    switch (event.type) {
      case 'DAMAGE_APPLIED': {
        const d = event.data;
        const target = event.targetId === 'player' ? 'you' : opponent.name;
        return `${who} struck ${target} for ${d.amount} dmg (guard: ${d.defenderGuarded}, armor: ${d.armorMult}x)`;
      }
      case 'STATUS_APPLIED':
        return `${who} activated ${event.data.status} (expires tick ${event.data.endsAt})`;
      case 'ILLEGAL_ACTION':
        return `${who}: ${event.data.action.type} rejected \u2014 ${event.data.reason}`;
      case 'ACTION_ACCEPTED': {
        const d = event.data;
        if (d.type === 'NO_OP') return null;
        if (d.type === 'MOVE') return `${who} moves ${d.dir}.`;
        if (d.type === 'DASH') return `${who} dashes ${d.dir}.`;
        return `${who} uses ${d.type}.`;
      }
      case 'MATCH_END':
        return `Match over \u2014 winner: ${event.actorId === 'player' ? 'You' : event.actorId === 'enemy' ? opponent.name : 'draw'} (${event.data.reason})`;
      default:
        return null;
    }
  };

  const executeTurn = (playerAction: { type: string; dir?: string; targetId?: string }) => {
    const state = engineRef.current;
    if (!state || state.ended) return;

    // Energy check before executing
    const currentEnergy = state.actors?.player?.energy ?? 0;
    const cost = (ACTION_COST as Record<string, number>)[playerAction.type] ?? 0;
    if (cost > 0 && currentEnergy < cost) {
      logFeed([`Not enough energy for ${playerAction.type} (need ${cost / 10}e, have ${Math.round(currentEnergy / 10)}e)`]);
      setEnergyFlash(true);
      if (energyFlashTimerRef.current) clearTimeout(energyFlashTimerRef.current);
      energyFlashTimerRef.current = setTimeout(() => setEnergyFlash(false), 600);
      return;
    }

    const startEventIdx = state.events.length;
    const enemyAction = botRef.current?.decide(state, 'enemy') ?? null;

    for (let i = 0; i < DECISION_WINDOW_TICKS; i++) {
      const actionsByActor = new Map();
      if (i === 0) {
        if (playerAction.type !== 'NO_OP') {
          actionsByActor.set('player', { ...playerAction, tick: state.tick, actorId: 'player' });
        }
        if (enemyAction) {
          actionsByActor.set('enemy', enemyAction);
        }
      }
      resolveTick(state, actionsByActor);
      if (state.ended) break;
    }

    const pActor = state.actors.player;
    const eActor = state.actors.enemy;
    const pPos = {
      x: clamp(Math.round(pActor.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
      y: clamp(Math.round(pActor.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
    };
    const ePos = {
      x: clamp(Math.round(eActor.position.x / UNIT_SCALE), 0, GRID_SIZE - 1),
      y: clamp(Math.round(eActor.position.y / UNIT_SCALE), 0, GRID_SIZE - 1),
    };
    setPlayerPos(pPos);
    setEnemyPos(ePos);
    setPlayerHp(pActor.hp);
    setEnemyHp(eActor.hp);
    setPlayerEnergy(pActor.energy);

    // Tactic labels
    setPlayerLastAction(playerAction.type === 'NO_OP' ? '' : playerAction.type.replace(/_/g, ' '));
    const enemyType = enemyAction?.type ?? '';
    setEnemyLastAction(enemyType === 'NO_OP' ? '' : enemyType.replace(/_/g, ' '));

    // Process new events: log + VFX
    const newEvents = state.events.slice(startEventIdx);
    const logEntries = newEvents.map(formatEvent).filter((e: string | null): e is string => e !== null);
    if (logEntries.length) logFeed(logEntries);

    for (const evt of newEvents) {
      if (evt.type === 'DAMAGE_APPLIED') {
        if (evt.actorId === 'player') {
          spawnVfx(ePos, 'KAPOW!', '#FF4D4D', 'burst', 600);
        } else if (evt.actorId === 'enemy') {
          spawnVfx(pPos, 'CLANG!', '#27D9E8', 'ring', 600);
        }
      }
    }

    if (state.ended) {
      if (state.winnerId === 'player') setWinner('You');
      else if (state.winnerId === 'enemy') setWinner(opponent.name);
      else setWinner('Draw');
      setRunning(false);
      setPhase('result');
      // KO VFX
      const koCell = state.winnerId === 'player' ? ePos : pPos;
      spawnVfx(koCell, 'K.O.!', '#FFD233', 'ko', 800);
      setArenaFlash(true);
      window.setTimeout(() => setArenaFlash(false), 600);
    }

    setTurn((prev) => prev + 1);
  };

  // --- Action handlers ---

  const attemptMove = (dx: number, dy: number) => {
    if (!running || winner) return;
    let dir: string;
    if (dx === 0 && dy === -1) dir = 'N';
    else if (dx === 0 && dy === 1) dir = 'S';
    else if (dx === -1 && dy === 0) dir = 'W';
    else if (dx === 1 && dy === 0) dir = 'E';
    else return;
    executeTurn({ type: 'MOVE', dir });
  };

  const handleAttack = () => {
    if (!running || winner) return;
    executeTurn({ type: 'MELEE_STRIKE', targetId: 'enemy' });
  };

  const handleBlock = () => {
    if (!running || winner) return;
    executeTurn({ type: 'GUARD' });
  };

  const handleScan = () => {
    if (!running || winner) return;
    executeTurn({ type: 'UTILITY' });
  };

  const endTurn = () => {
    if (!running || winner) return;
    executeTurn({ type: 'NO_OP' });
  };

  // --- Keyboard controls ---

  useEffect(() => {
    if (!running || winner) return;
    const handleKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target) {
        const tag = target.tagName;
        const isEditable =
          target.isContentEditable ||
          tag === 'INPUT' ||
          tag === 'TEXTAREA' ||
          tag === 'SELECT';
        if (isEditable) return;
      }

      if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w') {
        event.preventDefault();
        attemptMove(0, -1);
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        event.preventDefault();
        attemptMove(1, 0);
      } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        event.preventDefault();
        attemptMove(-1, 0);
      } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 's') {
        event.preventDefault();
        attemptMove(0, 1);
      } else if (event.key.toLowerCase() === 'j') {
        event.preventDefault();
        handleAttack();
      } else if (event.key.toLowerCase() === 'k') {
        event.preventDefault();
        handleBlock();
      } else if (event.key.toLowerCase() === 'l') {
        event.preventDefault();
        handleScan();
      } else if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        endTurn();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [running, winner]);

  // --- Founder checkout ---

  const handleFounderCheckout = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    const checkoutSource = `play-page-founder-cta-${founderCtaVariant.key}-${playFounderCopyVariant}`;
    if (!normalizedEmail || !/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setCheckoutMessage('Enter a valid email to reserve founder pricing.');
      return;
    }
    if (!founderCheckoutUrl) {
      setCheckoutMessage('Checkout is temporarily unavailable. Please join the waitlist from home.');
      void postEvent('founder_checkout_unavailable', { source: checkoutSource, founderCopyVariant: playFounderCopyVariant });
      return;
    }

    if (typeof window !== 'undefined') window.localStorage.setItem(EMAIL_KEY, normalizedEmail);
    setCheckoutBusy(true);
    setCheckoutMessage(null);

    try {
      const intentId = makeFounderIntentId(normalizedEmail, checkoutSource);
      const founderIntentPayload = {
        email: normalizedEmail,
        source: checkoutSource,
        intentId,
        founderCopyVariant: playFounderCopyVariant,
      };

      await postEvent('founder_checkout_clicked', {
        source: checkoutSource,
        ctaVariant: founderCtaVariant.key,
        founderCopyVariant: playFounderCopyVariant,
        intentId,
      });

      try {
        await submitWithRetry('/api/founder-intent', founderIntentPayload, 1, 6000);
      } catch (error) {
        if (shouldQueueForReplay(error)) {
          enqueueFounderIntentReplay(founderIntentPayload);
          await postEvent('founder_intent_buffered', {
            source: checkoutSource,
            intentId,
            founderCopyVariant: playFounderCopyVariant,
            error: error instanceof Error ? error.message : 'unknown',
          });
        }
      }

      if (typeof window !== 'undefined') {
        window.localStorage.setItem('cogcage_last_founder_checkout_source', checkoutSource);
        window.localStorage.setItem('cogcage_last_founder_intent_source', checkoutSource.replace('founder-cta', 'founder-checkout'));
      }
      const url = new URL(founderCheckoutUrl);
      url.searchParams.set('prefilled_email', normalizedEmail);
      window.location.href = url.toString();
    } catch {
      setCheckoutBusy(false);
      setCheckoutMessage('Could not start checkout. Try again in a moment.');
    }
  };

  // --- Derived values ---

  const meleeRangeGrid = Math.ceil(MELEE_RANGE / UNIT_SCALE);
  const actionsDisabled = !running || !!winner;

  const koReason = winner === 'You'
    ? 'ENEMY DESTROYED'
    : winner === 'Draw'
      ? 'MUTUAL DESTRUCTION'
      : winner
        ? 'YOU WERE DESTROYED'
        : '';

  // --- Render helpers ---

  const renderArenaMap = () => (
    <div
      className={`arena-map${arenaFlash ? ' arena-flash' : ''}`}
      style={{ ['--grid-size' as string]: GRID_SIZE }}
    >
      {grid.map((row, y) =>
        row.map((cell, x) => {
          const pos = { x, y };
          const inRange = manhattan(playerPos, pos) <= meleeRangeGrid;
          const isPlayer = isSame(pos, playerPos);
          const isEnemy = isSame(pos, enemyPos);
          const cellVfx = vfxEvents.filter((e) => e.cell.x === x && e.cell.y === y);
          const hasCellVfx = cellVfx.length > 0;
          const className = [
            'arena-cell',
            cell === 'obstacle' ? 'obstacle' : '',
            inRange ? 'in-range' : '',
            isPlayer ? 'player' : '',
            isEnemy ? 'enemy' : '',
            hasCellVfx ? 'cell-vfx-flash' : '',
          ].filter(Boolean).join(' ');

          return (
            <div key={`${x}-${y}`} className={className}>
              {isPlayer && <PlayerBotSvg />}
              {isEnemy && <EnemyBotSvg />}
              {cellVfx.map((vfx) => (
                <div key={vfx.id} className={`vfx-popup ${vfx.type}`}>
                  <span style={{ color: vfx.color }}>{vfx.text}</span>
                </div>
              ))}
            </div>
          );
        })
      )}
    </div>
  );

  const renderArenaLegend = () => (
    <div className="arena-legend">
      <span className="status-pill" style={{ background: 'rgba(46,204,113,0.2)', borderColor: '#2ecc71' }}>YOU</span>
      <span className="status-pill" style={{ background: 'rgba(235,77,75,0.2)', borderColor: '#eb4d4b' }}>BOT</span>
      <span className="status-pill" style={{ background: '#2f2f2f', color: '#fff' }}>OBSTACLE</span>
      <span className="status-pill" style={{ background: 'var(--c-yellow)' }}>IN RANGE</span>
    </div>
  );

  const renderFounderCta = () => (
    <div className="leaderboard">
      <div className="section-label">{founderCtaVariant.title}</div>
      <div className="hint" style={{ marginBottom: '0.7rem' }}>
        {founderCtaVariant.message}
      </div>
      <input
        className="prompt-box"
        type="email"
        placeholder="you@team.com"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        style={{ minHeight: 'unset', height: '48px', marginBottom: '0.8rem' }}
      />
      <button className="cta-btn" onClick={handleFounderCheckout} disabled={checkoutBusy}>
        {checkoutBusy ? 'Opening Checkout\u2026' : founderCtaVariant.button}
      </button>
      {checkoutMessage && (
        <div className="hint" style={{ marginTop: '0.7rem' }}>{checkoutMessage}</div>
      )}
    </div>
  );

  // ============================================================
  // RENDER
  // ============================================================

  return (
    <div className="play-root">
      <div className="bg-scanlines" />
      <header className="play-header">
        <a className="logo" href="/">COG CAGE</a>
        <div className="header-links">
          <a className="header-link" href="/">Home</a>
          <a className="header-link active" href="/play">Play</a>
        </div>
      </header>

      {/* ======================== LOBBY ======================== */}
      {phase === 'lobby' && (
        <main className="play-shell">
          <div className="lobby-container">
            <div className="lobby-grid">
              {/* --- Your Bot --- */}
              <div className="panel">
                <h2>Your Bot</h2>
                <div className="your-bot-card">
                  <h3>Loadout</h3>
                  <input
                    className="prompt-box"
                    style={{ minHeight: 'unset', height: '40px', marginBottom: '0.5rem' }}
                    placeholder="Bot name (e.g. Iron Vanguard)"
                    value={playerBotConfig.name}
                    onChange={(e) => setPlayerBotConfig((prev) => ({ ...prev, name: e.target.value }))}
                  />
                  <textarea
                    className="prompt-box"
                    style={{ minHeight: '56px', marginBottom: '0.6rem', fontSize: '0.85rem' }}
                    placeholder="Directive (e.g. 'press hard early, brace when low HP')"
                    value={playerBotConfig.directive}
                    onChange={(e) => setPlayerBotConfig((prev) => ({ ...prev, directive: e.target.value }))}
                  />
                  {([
                    { key: 'aggression' as const, label: 'AGGR', color: 'var(--c-red, #ff4444)' },
                    { key: 'defense' as const, label: 'DEF', color: 'var(--c-cyan, #00e5ff)' },
                    { key: 'risk' as const, label: 'RISK', color: 'var(--c-yellow, #ffd700)' },
                  ]).map(({ key, label, color }) => (
                    <div key={key} className="slider-row">
                      <label>{label}</label>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={5}
                        value={playerBotConfig[key]}
                        style={{ accentColor: color }}
                        onChange={(e) =>
                          setPlayerBotConfig((prev) => ({ ...prev, [key]: Number(e.target.value) }))
                        }
                      />
                      <span className="slider-val">{playerBotConfig[key]}</span>
                    </div>
                  ))}
                  <div className="hint" style={{ marginTop: '0.3rem' }}>
                    AGGR &rarr; attack damage &middot; DEF &rarr; guard strength &middot; RISK &ge; 40 &rarr; scan overclock
                  </div>
                </div>
              </div>

              {/* --- Pick Opponent --- */}
              <div className="panel">
                <h2>Pick Opponent</h2>
                <div className="opponent-grid">
                  {OPPONENTS.map((bot) => {
                    const colors = archetypeColors(bot.archetype);
                    return (
                      <div
                        key={bot.id}
                        className={`opponent-card${bot.id === opponentId ? ' selected' : ''}`}
                        onClick={() => setOpponentId(bot.id)}
                      >
                        <h4>{bot.name}</h4>
                        <span
                          className="archetype-tag"
                          style={{ background: colors.bg, color: colors.fg }}
                        >
                          {bot.archetype}
                        </span>
                        <div className="hint" style={{ fontSize: '0.8rem', marginBottom: '0.3rem' }}>{bot.tagline}</div>
                        <div style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#888' }}>
                          HP {HP_MAX} &middot; AGGR {bot.aggression} &middot; DEF {bot.defense} &middot; RISK {bot.risk}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* --- Seed (collapsible) --- */}
            <div style={{ textAlign: 'center', marginTop: '0.5rem' }}>
              <button className="seed-toggle" onClick={() => setShowSeedInput((p) => !p)}>
                {showSeedInput ? 'Hide seed' : 'Seed (advanced)'}
              </button>
              {showSeedInput && (
                <input
                  className="prompt-box"
                  style={{ minHeight: 'unset', height: '44px', marginTop: '0.5rem', maxWidth: '400px', margin: '0.5rem auto 0' }}
                  placeholder="Seed (optional, deterministic)"
                  value={seedInput}
                  onChange={(event) => setSeedInput(event.target.value)}
                />
              )}
            </div>

            {/* --- Enter Arena --- */}
            <button className="cta-btn enter-arena-btn" onClick={startMatch}>
              Enter Arena
            </button>

            {/* --- Founder CTA --- */}
            {renderFounderCta()}
          </div>
        </main>
      )}

      {/* ======================== MATCH ======================== */}
      {phase === 'match' && (
        <main className="play-shell">
          <div className="match-grid">
            {/* --- Left sidebar --- */}
            <section className="panel match-sidebar">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="turn-counter">Turn {turn}</span>
                <span className="seed-pill">Seed {activeSeed ?? '\u2014'}</span>
              </div>

              {/* Player HP */}
              <div className="stat-block">
                <div className="stat-title">
                  <span>
                    {playerBotConfig.name.trim() || 'You'}
                    {playerLastAction && <span className="tactic-chip">{playerLastAction}</span>}
                  </span>
                  <span className="status-pill">HP {playerHp}</span>
                </div>
                <div className="bar-shell">
                  <div className="bar-fill" style={{ width: `${playerHp}%`, background: hpBarGradient(playerHp) }} />
                </div>
              </div>

              {/* Energy */}
              <div className="stat-block">
                <div className="stat-title">
                  <span>Energy</span>
                  <span className="status-pill">{Math.round(playerEnergy / 10)}e</span>
                </div>
                <div className="bar-shell">
                  <div
                    className={`bar-fill${energyFlash ? ' energy-flash' : ''}`}
                    style={{ width: `${playerEnergy / ENERGY_MAX * 100}%`, background: 'linear-gradient(90deg, #00e5ff 0%, #0077b6 100%)' }}
                  />
                </div>
              </div>

              {/* Enemy HP */}
              <div className="stat-block">
                <div className="stat-title">
                  <span>
                    {opponent.name}
                    {enemyLastAction && <span className="tactic-chip enemy-chip">{enemyLastAction}</span>}
                  </span>
                  <span className="status-pill">HP {enemyHp}</span>
                </div>
                <div className="bar-shell">
                  <div className="bar-fill" style={{ width: `${enemyHp}%`, background: hpBarGradient(enemyHp) }} />
                </div>
              </div>

              {/* Combat log */}
              <div className="section-label" style={{ marginTop: '0.5rem' }}>Combat Log</div>
              <div className="feed" style={{ maxHeight: '260px' }}>
                {feed.length === 0 && (
                  <div className="feed-item">Awaiting first action...</div>
                )}
                {feed.slice(0, 8).map((entry, index) => (
                  <div key={`${entry}-${index}`} className="feed-item">{entry}</div>
                ))}
              </div>
            </section>

            {/* --- Right: Arena + Actions --- */}
            <section className="panel">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ marginBottom: 0 }}>Arena</h2>
                <span className="arena-badge">Round {turn}</span>
              </div>

              {renderArenaMap()}
              {renderArenaLegend()}

              {/* Action buttons directly below map */}
              <div className="controls-row">
                <div className="dpad">
                  <div className="dpad-spacer" />
                  <button className="action-btn secondary" onClick={() => attemptMove(0, -1)} disabled={actionsDisabled}>{'\u2191'}</button>
                  <div className="dpad-spacer" />
                  <button className="action-btn secondary" onClick={() => attemptMove(-1, 0)} disabled={actionsDisabled}>{'\u2190'}</button>
                  <button className="action-btn secondary" onClick={() => attemptMove(0, 1)} disabled={actionsDisabled}>{'\u2193'}</button>
                  <button className="action-btn secondary" onClick={() => attemptMove(1, 0)} disabled={actionsDisabled}>{'\u2192'}</button>
                </div>
                <div className="combat-actions">
                  <button className="action-btn" onClick={handleAttack} disabled={actionsDisabled}>Strike</button>
                  <button className="action-btn" onClick={handleBlock} disabled={actionsDisabled}>Guard</button>
                  <button className="action-btn" onClick={handleScan} disabled={actionsDisabled}>Utility</button>
                </div>
              </div>
              <div className="skip-row">
                <button className="action-btn secondary" onClick={endTurn} disabled={actionsDisabled}>Skip Turn</button>
              </div>
              <div className="energy-hint">
                Strike 18e &middot; Guard 10e &middot; Utility 20e &middot; Move 4e
              </div>
              <div className="kbd-hint">
                WASD/Arrows move &middot; J strike &middot; K guard &middot; L utility &middot; Enter skip
              </div>
            </section>
          </div>
        </main>
      )}

      {/* ======================== RESULT (KO Overlay) ======================== */}
      {phase === 'result' && (
        <div className="ko-overlay">
          <div className="ko-radial-bg" />
          <div className="ko-content">
            <div className="ko-title">K.O.!</div>
            <div className="ko-winner-name">
              {winner === 'Draw' ? 'DOUBLE K.O.' : `${winner} WINS`}
            </div>
            <div className="ko-reason">{koReason}</div>
            <div className="ko-stats">
              Turn {turn} &middot; HP {playerHp} vs {enemyHp} &middot; Seed {activeSeed}
            </div>
            <div className="ko-actions">
              <button className="ko-btn" onClick={() => startMatch()}>
                Play Again
              </button>
              <button className="ko-btn secondary" onClick={() => { resetMatch(); setPhase('lobby'); }}>
                New Match
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Play;
