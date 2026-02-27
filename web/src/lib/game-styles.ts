export const globalStyles = `
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
  .arena-cell.has-bot { padding: 3px; }
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
