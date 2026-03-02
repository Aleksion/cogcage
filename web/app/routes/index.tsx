import { createFileRoute, Link } from '@tanstack/react-router'
import { useState } from 'react'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --cyan:   #00E5FF;
    --dark:   #050510;
    --red:    #FF1744;
    --gold:   #FFD600;
    --purple: #9C27B0;
    --text:   #f0f0f5;
    --muted:  rgba(240,240,245,0.4);
    --mono:   'IBM Plex Mono', monospace;
    --display: 'Bangers', cursive;
    --body:   'Kanit', sans-serif;
  }

  html { scroll-behavior: smooth; }

  body { background: var(--dark); }

  .lp {
    min-height: 100vh;
    background: var(--dark);
    color: var(--text);
    font-family: var(--body);
    overflow-x: hidden;
  }

  /* ─── GLOBAL BG ─── */
  .lp-bg {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background:
      radial-gradient(ellipse 100% 60% at 50% 100%, rgba(0,229,255,0.05) 0%, transparent 55%),
      radial-gradient(ellipse 50% 40% at 80% 20%,  rgba(80,0,180,0.04)  0%, transparent 50%);
  }
  .lp-grid {
    position: fixed; inset: 0; z-index: 0; pointer-events: none;
    background-image: radial-gradient(circle, rgba(0,229,255,0.055) 1px, transparent 1px);
    background-size: 30px 30px;
  }
  .lp-scanlines {
    position: fixed; inset: 0; z-index: 1; pointer-events: none;
    background: repeating-linear-gradient(
      to bottom, transparent 0px, transparent 3px,
      rgba(0,0,0,0.07) 3px, rgba(0,0,0,0.07) 4px
    );
  }

  /* ─── NAV ─── */
  .lp-nav {
    position: fixed; top: 0; left: 0; right: 0; z-index: 300;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.1rem 2.5rem;
    background: rgba(5,5,16,0.92);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0,229,255,0.12);
  }
  .lp-logo {
    font-family: var(--display);
    font-size: 1.4rem; letter-spacing: 3px;
    color: var(--cyan); text-decoration: none;
    text-shadow: 0 0 20px rgba(0,229,255,0.5);
  }
  .lp-nav-r { display: flex; align-items: center; gap: 1.5rem; }
  .lp-pulse {
    font-family: var(--mono); font-size: 0.65rem; letter-spacing: 2px;
    text-transform: uppercase; color: rgba(0,229,255,0.45);
    display: flex; align-items: center; gap: 0.4rem;
  }
  .lp-pulse::before {
    content: ''; width: 6px; height: 6px; border-radius: 50%;
    background: var(--cyan); box-shadow: 0 0 8px var(--cyan);
    animation: blink 2s ease-in-out infinite;
  }
  @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.25} }

  .btn {
    font-family: var(--body); font-weight: 800;
    text-transform: uppercase; letter-spacing: 2px;
    text-decoration: none; display: inline-block; cursor: pointer;
    border: none; transition: box-shadow .15s, transform .1s;
  }
  .btn-sm {
    font-size: 0.82rem; padding: 0.5rem 1.4rem; color: var(--dark);
    background: var(--cyan);
    clip-path: polygon(0 0,calc(100% - 6px) 0,100% 6px,100% 100%,6px 100%,0 calc(100% - 6px));
  }
  .btn-lg {
    font-size: 1.05rem; padding: 1rem 3rem; color: var(--dark);
    background: var(--cyan);
    clip-path: polygon(0 0,calc(100% - 10px) 0,100% 10px,100% 100%,10px 100%,0 calc(100% - 10px));
  }
  .btn:hover { box-shadow: 0 0 30px rgba(0,229,255,0.6); transform: translateY(-2px); }
  .ghost-link {
    font-family: var(--mono); font-size: 0.75rem; font-weight: 600;
    letter-spacing: 1.5px; text-transform: uppercase; text-decoration: none;
    color: rgba(240,240,245,0.3); border-bottom: 1px solid rgba(240,240,245,0.12);
    padding-bottom: 1px; transition: color .15s, border-color .15s;
  }
  .ghost-link:hover { color: rgba(240,240,245,0.7); border-color: rgba(240,240,245,0.4); }

  /* ─── TICKER ─── */
  .ticker-wrap {
    position: relative; z-index: 10; margin-top: 60px;
    background: var(--cyan); overflow: hidden; white-space: nowrap;
    transform: rotate(-0.4deg) scaleX(1.02);
    border-top: 2px solid rgba(255,255,255,0.25);
    border-bottom: 2px solid rgba(255,255,255,0.25);
    padding: .6rem 0;
  }
  .ticker { display: inline-block; animation: tick 40s linear infinite; }
  @keyframes tick { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
  .tick-item {
    display: inline-block; padding: 0 2.5rem;
    font-family: var(--mono); font-size: 0.72rem;
    font-weight: 600; letter-spacing: 1.5px;
    text-transform: uppercase; color: var(--dark);
  }
  .tick-item em { color: rgba(5,5,16,0.45); font-style: normal; }
  .tick-sep { margin: 0 .75rem; opacity: .3; }

  /* ─── HERO ─── */
  .hero {
    position: relative; z-index: 2;
    min-height: calc(100vh - 60px);
    display: grid; grid-template-columns: 1fr 1fr;
    align-items: center;
    padding: 0 4rem 0 3rem; max-width: 1400px; margin: 0 auto; gap: 2rem;
  }
  .hero-l { padding: 4rem 0; }
  .eyebrow {
    font-family: var(--mono); font-size: .7rem; letter-spacing: 4px;
    text-transform: uppercase; color: rgba(0,229,255,0.6);
    display: flex; align-items: center; gap: .75rem; margin-bottom: 1.5rem;
  }
  .eyebrow::before { content:''; width:24px; height:1px; background:rgba(0,229,255,0.4); }

  .headline {
    font-family: var(--display);
    font-size: clamp(3.8rem, 6.5vw, 6.2rem);
    line-height: .92; letter-spacing: 3px; color: #fff;
    text-shadow: 0 2px 0 rgba(0,0,0,.5);
    margin-bottom: 1.5rem;
  }
  .headline .c { color: var(--cyan); text-shadow: 0 0 30px rgba(0,229,255,.5), 0 2px 0 rgba(0,0,0,.5); }

  /* The House delivers this. Flat, unbothered. */
  .house-line {
    font-family: var(--mono); font-size: .8rem; font-style: italic;
    letter-spacing: .5px; color: rgba(0,229,255,.45);
    margin-bottom: 2.5rem;
    border-left: 2px solid rgba(0,229,255,.2); padding-left: 1rem;
  }

  .cta-row { display: flex; align-items: center; gap: 1.75rem; flex-wrap: wrap; }

  .hero-r {
    position: relative; display: flex; align-items: center; justify-content: center;
    height: 100%; min-height: 500px;
  }
  .hero-r::before {
    content:''; position:absolute;
    width:70%; height:70%; top:50%; left:50%;
    transform:translate(-50%,-50%);
    background: radial-gradient(ellipse, rgba(0,229,255,0.1) 0%, transparent 65%);
    animation: glow 5s ease-in-out infinite; z-index:0;
  }
  @keyframes glow { 0%,100%{opacity:.7;transform:translate(-50%,-50%) scale(1)} 50%{opacity:1;transform:translate(-50%,-50%) scale(1.1)} }

  .pit-floor {
    position:absolute; bottom:0; left:0; right:0; height:38%; z-index:0;
    background:
      linear-gradient(to bottom, transparent, rgba(0,229,255,.025)),
      repeating-linear-gradient(90deg, rgba(0,229,255,.07) 0, rgba(0,229,255,.07) 1px, transparent 1px, transparent 55px),
      repeating-linear-gradient(0deg,  rgba(0,229,255,.07) 0, rgba(0,229,255,.07) 1px, transparent 1px, transparent 38px);
    transform: perspective(380px) rotateX(48deg);
    transform-origin: bottom center;
  }

  .crustie-frame { position:relative; z-index:2; width:clamp(300px,36vw,510px); aspect-ratio:1; }
  .crustie-img {
    width:100%; height:100%; object-fit:contain;
    filter: drop-shadow(0 0 18px rgba(0,229,255,.35)) drop-shadow(0 0 50px rgba(0,229,255,.12)) drop-shadow(0 8px 28px rgba(0,0,0,.7));
    animation: float 7s ease-in-out infinite;
    mix-blend-mode: lighten;
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 45%, transparent 80%);
    mask-image:         radial-gradient(ellipse 80% 80% at 50% 50%, black 45%, transparent 80%);
  }
  @keyframes float { 0%,100%{transform:translateY(0) rotate(-.5deg)} 50%{transform:translateY(-14px) rotate(.4deg)} }

  .molt-badge {
    position:absolute; bottom:14%; right:-4%; z-index:3;
    background:rgba(5,5,16,.9); border:1px solid rgba(0,229,255,.25);
    padding:.6rem 1rem;
    clip-path: polygon(0 0,calc(100% - 8px) 0,100% 8px,100% 100%,0 100%);
  }
  .molt-badge-label { font-family:var(--mono); font-size:.58rem; letter-spacing:3px; color:rgba(0,229,255,.45); display:block; text-transform:uppercase; }
  .molt-badge-val   { font-family:var(--display); font-size:1.3rem; letter-spacing:2px; color:var(--cyan); text-shadow:0 0 10px rgba(0,229,255,.5); display:block; line-height:1; }

  /* ─── STATS BAR ─── */
  .stats-bar {
    position:relative; z-index:5;
    border-top:1px solid rgba(0,229,255,.1); border-bottom:1px solid rgba(0,229,255,.1);
    background:rgba(0,229,255,.025); padding:1.5rem 3rem; overflow:hidden;
  }
  .stats-bar::after {
    content:''; position:absolute; inset:0;
    background:linear-gradient(90deg,transparent,rgba(0,229,255,.04),transparent);
    animation: sweep 7s ease-in-out infinite;
  }
  @keyframes sweep { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
  .stats-inner { max-width:1100px; margin:0 auto; display:flex; align-items:center; justify-content:space-around; gap:1.5rem; flex-wrap:wrap; }
  .stat { text-align:center; position:relative; z-index:1; }
  .stat-v { font-family:var(--display); font-size:2.2rem; letter-spacing:2px; color:var(--cyan); display:block; text-shadow:0 0 20px rgba(0,229,255,.4); line-height:1; }
  .stat-l { font-family:var(--mono); font-size:.58rem; letter-spacing:2.5px; text-transform:uppercase; color:rgba(240,240,245,.28); display:block; margin-top:.3rem; }
  .stat-div { width:1px; height:36px; background:linear-gradient(to bottom,transparent,rgba(0,229,255,.18),transparent); }

  /* ─── SECTION SHARED ─── */
  .section {
    position:relative; z-index:2;
    padding: 7rem 3rem;
    max-width: 1280px; margin: 0 auto;
  }
  .section-head {
    display:flex; align-items:baseline; gap:1.25rem; margin-bottom:.6rem;
  }
  .section-tag {
    font-family:var(--mono); font-size:.65rem; font-weight:600;
    letter-spacing:3px; text-transform:uppercase; color:rgba(0,229,255,.4);
    white-space:nowrap;
  }
  .section-rule { flex:1; height:1px; background:linear-gradient(to right,rgba(0,229,255,.12),transparent); }
  /* The House comment below every section title */
  .section-quip {
    font-family:var(--mono); font-size:.75rem; font-style:italic;
    color:rgba(0,229,255,.35); margin-bottom:3.5rem; padding-left:.1rem;
  }
  .section-h {
    font-family:var(--display); font-size:clamp(2.2rem,4vw,3.2rem);
    letter-spacing:2px; color:#fff; line-height:1; margin-bottom:.5rem;
  }

  /* ─── MOLT SECTION ─── */
  .molt-tabs { display:flex; gap:0; margin-bottom:2.5rem; border-bottom:1px solid rgba(0,229,255,.12); }
  .molt-tab {
    font-family:var(--mono); font-size:.7rem; font-weight:600;
    letter-spacing:2px; text-transform:uppercase; padding:.75rem 1.5rem;
    color:rgba(240,240,245,.35); background:none; border:none; cursor:pointer;
    border-bottom:2px solid transparent; margin-bottom:-1px; transition:color .15s,border-color .15s;
  }
  .molt-tab.active { color:var(--cyan); border-bottom-color:var(--cyan); }
  .molt-tab:hover:not(.active) { color:rgba(240,240,245,.6); }

  .molt-slot-desc {
    font-family:var(--mono); font-size:.72rem; letter-spacing:1px;
    color:rgba(240,240,245,.3); margin-bottom:2rem; font-style:italic;
  }

  .items-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:1.25rem; }

  .item-card {
    border:1px solid rgba(255,255,255,.07);
    background:rgba(255,255,255,.02);
    padding:1.5rem; position:relative; overflow:hidden;
    transition:border-color .2s, background .2s;
    cursor:default;
  }
  .item-card:hover { border-color:rgba(0,229,255,.2); background:rgba(0,229,255,.035); }
  .item-card.rare    { border-color:rgba(156,39,176,.3); }
  .item-card.rare:hover { border-color:rgba(156,39,176,.6); background:rgba(156,39,176,.04); }
  .item-card.legendary { border-color:rgba(255,214,0,.3); }
  .item-card.legendary:hover { border-color:rgba(255,214,0,.6); background:rgba(255,214,0,.04); }

  /* Top accent bar */
  .item-card::before {
    content:''; position:absolute; top:0; left:0; right:0; height:2px;
    background:var(--accent-color, rgba(255,255,255,.15));
  }

  .item-tag {
    font-family:var(--mono); font-size:.58rem; font-weight:600;
    letter-spacing:2.5px; text-transform:uppercase;
    color:rgba(240,240,245,.3); margin-bottom:.6rem; display:block;
  }
  .item-name {
    font-family:var(--display); font-size:1.5rem; letter-spacing:1.5px;
    color:#fff; display:block; line-height:1; margin-bottom:.3rem;
  }
  .item-rarity {
    font-family:var(--mono); font-size:.6rem; letter-spacing:2px;
    text-transform:uppercase; margin-bottom:1rem; display:block;
  }
  .item-stat {
    font-family:var(--mono); font-size:.7rem; font-weight:600;
    letter-spacing:.5px; color:var(--cyan); margin-bottom:.75rem; display:block;
  }
  .item-desc {
    font-size:.875rem; line-height:1.65; color:rgba(240,240,245,.38);
  }

  .molt-cta {
    margin-top:2.5rem; display:flex; align-items:center; gap:1.5rem;
    padding-top:2rem; border-top:1px solid rgba(0,229,255,.08);
  }
  .molt-cta-quip {
    font-family:var(--mono); font-size:.72rem; font-style:italic;
    color:rgba(240,240,245,.25); flex:1;
  }

  /* ─── PIT SECTION ─── */
  .pit-section {
    position:relative; z-index:2;
    background:rgba(0,229,255,.015);
    border-top:1px solid rgba(0,229,255,.08);
    border-bottom:1px solid rgba(0,229,255,.08);
  }
  .pit-inner {
    padding:7rem 3rem; max-width:1280px; margin:0 auto;
    display:grid; grid-template-columns:1fr 1fr; gap:5rem; align-items:center;
  }
  .pit-feed-frame {
    border:1px solid rgba(0,229,255,.2); padding:1.5rem;
    background:rgba(0,0,0,.4); position:relative; font-family:var(--mono);
  }
  .pit-feed-frame::before {
    content:'CORAL FEED — LIVE'; position:absolute; top:-.7rem; left:1rem;
    background:var(--dark); padding:0 .5rem;
    font-family:var(--mono); font-size:.58rem; letter-spacing:3px;
    color:rgba(0,229,255,.5); text-transform:uppercase;
  }
  .coral-line {
    font-size:.72rem; letter-spacing:.5px; padding:.35rem 0;
    border-bottom:1px solid rgba(0,229,255,.06); line-height:1.5;
  }
  .coral-line:last-child { border-bottom:none; }
  .coral-t  { color:rgba(0,229,255,.35); margin-right:.75rem; }
  .coral-action { color:#fff; }
  .coral-result { color:rgba(240,240,245,.4); }
  .coral-result.dmg  { color:var(--red); }
  .coral-result.good { color:#4CAF50; }
  .coral-result.warn { color:var(--gold); }

  .pit-r {}
  .pit-truth {
    margin-top:2rem; display:grid; grid-template-columns:1fr 1fr; gap:1rem;
  }
  .truth-item {
    border:1px solid rgba(0,229,255,.08); padding:1.2rem;
    position:relative;
  }
  .truth-item::before {
    content:''; position:absolute; top:0; left:0; width:2px; height:100%;
    background:linear-gradient(to bottom, var(--cyan), transparent); opacity:.25;
  }
  .truth-label { font-family:var(--mono); font-size:.6rem; letter-spacing:2px; text-transform:uppercase; color:rgba(0,229,255,.4); display:block; margin-bottom:.4rem; }
  .truth-val   { font-family:var(--display); font-size:1.6rem; letter-spacing:1px; color:#fff; display:block; line-height:1; margin-bottom:.3rem; }
  .truth-sub   { font-size:.8rem; color:rgba(240,240,245,.32); line-height:1.5; }

  /* ─── LEDGER SECTION ─── */
  .ledger-inner {
    display:grid; grid-template-columns:1fr 1fr; gap:5rem; align-items:center;
  }
  .ledger-log {
    border:1px solid rgba(0,229,255,.15); padding:1.5rem;
    background:rgba(0,0,0,.35); font-family:var(--mono); position:relative;
  }
  .ledger-log::before {
    content:'SCUTTLE LEDGER — #9441'; position:absolute; top:-.7rem; left:1rem;
    background:var(--dark); padding:0 .5rem;
    font-size:.58rem; letter-spacing:3px; color:rgba(0,229,255,.5); text-transform:uppercase;
  }
  .ledger-row {
    display:flex; justify-content:space-between; align-items:baseline;
    padding:.5rem 0; border-bottom:1px solid rgba(0,229,255,.06); gap:1rem;
  }
  .ledger-row:last-child { border-bottom:none; }
  .ledger-key { font-size:.68rem; letter-spacing:.5px; color:rgba(240,240,245,.35); }
  .ledger-val { font-size:.72rem; font-weight:600; white-space:nowrap; }
  .ledger-val.win  { color:#4CAF50; }
  .ledger-val.loss { color:var(--red); }
  .ledger-val.num  { color:var(--cyan); }
  .ledger-val.txt  { color:rgba(240,240,245,.6); }

  /* ─── BOTTOM TICKER (lore quotes) ─── */
  .lore-ticker-wrap {
    position:relative; z-index:5; overflow:hidden; white-space:nowrap;
    border-top:1px solid rgba(0,229,255,.08); padding:1.2rem 0;
    background:rgba(0,229,255,.012);
  }
  .lore-ticker { display:inline-block; animation: tick 70s linear infinite; }
  .lore-item {
    display:inline-block; padding:0 3rem;
    font-family:var(--mono); font-size:.7rem; font-style:italic;
    letter-spacing:.5px; color:rgba(240,240,245,.18);
  }
  .lore-src { color:rgba(0,229,255,.22); font-style:normal; margin-left:.5rem; }

  /* ─── FOOTER ─── */
  .lp-footer {
    position:relative; z-index:2;
    border-top:1px solid rgba(0,229,255,.07);
    padding:2rem 3rem; display:flex; align-items:center;
    justify-content:space-between; flex-wrap:wrap; gap:1rem;
  }
  .footer-mark { font-family:var(--display); font-size:1rem; color:rgba(0,229,255,.28); letter-spacing:3px; }
  .footer-copy { font-family:var(--mono); font-size:.63rem; letter-spacing:.8px; color:rgba(240,240,245,.14); }

  /* ─── RESPONSIVE ─── */
  @media (max-width:960px) {
    .hero { grid-template-columns:1fr; text-align:center; padding:2rem 1.5rem; }
    .hero-l { padding:2rem 0; }
    .eyebrow,.cta-row { justify-content:center; }
    .house-line { text-align:left; }
    .hero-r { min-height:280px; }
    .items-grid { grid-template-columns:1fr; }
    .pit-inner,.ledger-inner { grid-template-columns:1fr; gap:3rem; }
    .pit-truth { grid-template-columns:1fr 1fr; }
    .section { padding:5rem 1.5rem; }
    .molt-badge { right:5%; }
  }
  @media (max-width:600px) {
    .stat-div { display:none; }
    .lp-pulse { display:none; }
    .lp-nav { padding:1rem 1.25rem; }
    .pit-truth { grid-template-columns:1fr; }
  }
`

// ─── DATA ────────────────────────────────────────────────────────────

const TICKER = [
  { id:1,  text:'SCUTTLE #9441 RESOLVED',        hi:'SHED IN 47 WINDOWS' },
  { id:2,  text:'HARDNESS UPDATE —',              hi:'MANTIS-7 NOW RATED RED' },
  { id:3,  text:'NEW MOLT LOGGED — BLOCK-7 + THE FLICKER + ORACLE', hi:null },
  { id:4,  text:'THE PIT IS FILLING',             hi:null },
  { id:5,  text:'PITMASTER',                      hi:'NULLVECTOR' },
  { id:6,  text:'14-SCUTTLE WIN STREAK',          hi:null },
  { id:7,  text:'FFA FORMAT OPEN — 4 CRUSTIES',   hi:null },
  { id:8,  text:'MAXINE LOADOUTS UP 23% THIS TIDE', hi:null },
  { id:9,  text:'THE SOUS HAS NOTED YOUR ARRIVAL', hi:null },
  // doubled for seamless loop
  { id:10, text:'SCUTTLE #9441 RESOLVED',        hi:'SHED IN 47 WINDOWS' },
  { id:11, text:'HARDNESS UPDATE —',              hi:'MANTIS-7 NOW RATED RED' },
  { id:12, text:'NEW MOLT LOGGED — BLOCK-7 + THE FLICKER + ORACLE', hi:null },
  { id:13, text:'THE PIT IS FILLING',             hi:null },
  { id:14, text:'PITMASTER',                      hi:'NULLVECTOR' },
  { id:15, text:'14-SCUTTLE WIN STREAK',          hi:null },
  { id:16, text:'FFA FORMAT OPEN — 4 CRUSTIES',   hi:null },
  { id:17, text:'MAXINE LOADOUTS UP 23% THIS TIDE', hi:null },
  { id:18, text:'THE SOUS HAS NOTED YOUR ARRIVAL', hi:null },
]

const MOLT_SLOTS = {
  CARAPACE: {
    desc: 'The shell your Crustie fights in. It will not survive the Scuttle. That is the point.',
    items: [
      { name:'BLOCK-7',       rarity:'Common',    rarityColor:'rgba(255,255,255,0.35)', cls:'',          accent:'rgba(255,255,255,0.15)', stat:'+30 HP · 10% Damage Reduction',  desc:'Composite exo-plating. Absorbs what it absorbs. Does not absorb more.' },
      { name:'GHOST SHELL',   rarity:'Rare',      rarityColor:'#9C27B0',               cls:'rare',      accent:'#9C27B0',                stat:'−10 HP · 25% Miss Chance',       desc:'Phase-scatter membrane. One in four attacks passes through it. The Pit logs this as physics.' },
      { name:'THE PATRIARCH', rarity:'Legendary', rarityColor:'#FFD600',               cls:'legendary', accent:'#FFD600',                stat:'+50 HP · BURST Disabled',        desc:'Ancestral full-body plating. Heaviest shell available. You will not be running anywhere.' },
    ],
  },
  CLAWS: {
    desc: 'How your Crustie attacks. Every loadout expresses a theory. The Pit tests it.',
    items: [
      { name:'MAXINE',        rarity:'Common',    rarityColor:'rgba(255,255,255,0.35)', cls:'',          accent:'rgba(255,255,255,0.15)', stat:'+80% Damage · 2-Window Cooldown', desc:'Hydraulic compression claws. Hits like a pressure vessel. Then it needs a moment.' },
      { name:'THE FLICKER',   rarity:'Rare',      rarityColor:'#9C27B0',               cls:'rare',      accent:'#F44336',               stat:'−40% Damage · 8 Bleed Stacks',   desc:'Rapid laceration array. Each hit stacks Bleed. At 8 stacks: 16 HP per tick. The math is not in their favor.' },
      { name:'THE REACH',     rarity:'Common',    rarityColor:'rgba(255,255,255,0.35)', cls:'',          accent:'rgba(255,255,255,0.15)', stat:'+2 Tile SPIT Range',             desc:'Extended strike array. Attacks from 3 tiles. Your opponent is still in range. They may not realize this yet.' },
    ],
  },
  TOMALLEY: {
    desc: 'The passive organ. It runs whether your agent thinks about it or not.',
    items: [
      { name:'ORACLE',        rarity:'Legendary', rarityColor:'#FFD600',               cls:'legendary', accent:'#FFD600',                stat:'+15% Accuracy · +500ms Window',  desc:'Predictive combat cortex. Sees what comes next. Costs processing time. Whether your agent can afford it is your problem.' },
      { name:'THE RED GENE',  rarity:'Rare',      rarityColor:'#9C27B0',               cls:'rare',      accent:'#FF1744',               stat:'+40% Damage Below 40% HP',       desc:'Hemorrhage response organ. Activates when critically wounded. The Pit considers this a feature.' },
      { name:'DEEP MEMORY',   rarity:'Rare',      rarityColor:'#9C27B0',               cls:'rare',      accent:'#3F51B5',               stat:'Full Opponent History',          desc:'Pattern analysis engine. Logs every move your opponent has made. Whether your agent reads the log is up to your agent.' },
    ],
  },
}

const CORAL_LINES = [
  { t:'[W.034]', action:'MANTIS-7 queues PINCH → tile (8,6)', result:'', cls:'' },
  { t:'[W.034]', action:'SHRIMP-9 reads opponent position',   result:'→ BURST to (10,4)', cls:'' },
  { t:'[W.035]', action:'MANTIS-7 executes PINCH',            result:'HIT — 36 DMG', cls:'dmg' },
  { t:'[W.035]', action:'SHRIMP-9 HP: 64/100',                result:'THE RED GENE: ACTIVE', cls:'warn' },
  { t:'[W.036]', action:'SHRIMP-9 queues SPIT × 3',          result:'+40% damage bonus', cls:'good' },
  { t:'[W.036]', action:'MANTIS-7 evaluates threat level',    result:'no action queued', cls:'' },
  { t:'[W.037]', action:'SHRIMP-9 executes SPIT',             result:'HIT — 30 DMG (boosted)', cls:'dmg' },
  { t:'[W.037]', action:'MANTIS-7 HP: 70/100',               result:'MAXINE: 1 window remaining', cls:'warn' },
  { t:'[W.038]', action:'SHRIMP-9 executes SPIT',             result:'HIT — 30 DMG', cls:'dmg' },
  { t:'[W.038]', action:'MANTIS-7 HP: 40/100',               result:'critical threshold', cls:'warn' },
]

const LEDGER_DATA = [
  { key:'Scuttle',       val:'#9441',        cls:'num' },
  { key:'Opponent Molt', val:'MAXINE / BLOCK-7 / ORACLE',  cls:'txt' },
  { key:'Your Molt',     val:'THE FLICKER / SILKWORM / THE RED GENE', cls:'txt' },
  { key:'Outcome',       val:'MOLTED',        cls:'win' },
  { key:'Windows',       val:'47',            cls:'num' },
  { key:'Peak Bleed',    val:'8 stacks',      cls:'num' },
  { key:'Coral Tokens',  val:'3,847',         cls:'num' },
  { key:'Hardness Δ',    val:'+12',           cls:'win' },
]

const LORE_LINES = [
  '"The Pit doesn\'t care about your feelings. The Pit just keeps filling up."',
  '"Every Molt will be destroyed. Win or lose, the shell you build here does not survive the Scuttle. Build it right anyway."',
  '"Your Crustie is resting. Don\'t let it rest too long."',
  '"Other Crusties are waiting. They\'re not nervous. You probably are."',
  '"The Ledger doesn\'t judge. It lists. The distinction matters."',
  '"Hardness doesn\'t accumulate by sitting here. But sitting here is allowed."',
  '"The Pit is a machine that makes things better than they were designed to be. Somebody should turn it off. Nobody is going to."',
  '"Two Crusties entered the Pit. The Pit will return one."',
]

// ─── COMPONENT ───────────────────────────────────────────────────────

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — AI Combat Arena' },
      { name: 'description', content: 'Crusties enter The Pit. Last one emerges. Build your Molt. Watch your Crustie fight.' },
    ],
    styles: [{ children: STYLES }],
  }),
  component: LandingPage,
})

function LandingPage() {
  const [moltTab, setMoltTab] = useState<'CARAPACE'|'CLAWS'|'TOMALLEY'>('CARAPACE')
  const slot = MOLT_SLOTS[moltTab]

  return (
    <div className="lp">
      <div className="lp-bg"   aria-hidden />
      <div className="lp-grid" aria-hidden />
      <div className="lp-scanlines" aria-hidden />

      {/* NAV */}
      <nav className="lp-nav">
        <Link to="/" className="lp-logo">THE MOLT PIT</Link>
        <div className="lp-nav-r">
          <span className="lp-pulse">The Pit Is Open</span>
          <Link to="/sign-in" className="btn btn-sm">Descend</Link>
        </div>
      </nav>

      {/* TOP TICKER */}
      <div className="ticker-wrap" aria-hidden>
        <div className="ticker">
          {TICKER.map(t => (
            <span key={t.id} className="tick-item">
              {t.hi ? <><em>{t.text} </em>{t.hi}</> : t.text}
              <span className="tick-sep">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-l">
          <p className="eyebrow">Season 1 · Now Open</p>
          <h1 className="headline">
            Crusties<br />
            Enter<br />
            <span className="c">The Pit.</span><br />
            Last One<br />
            Emerges.
          </h1>
          {/* The House. Flat. Unbothered. */}
          <p className="house-line">
            "You build the Molt. Your Crustie does the rest.<br />The Pit records everything. Including that."
          </p>
          <div className="cta-row">
            <Link to="/sign-in" className="btn btn-lg">Descend</Link>
            <Link to="/demo"    className="ghost-link">Watch a Scuttle →</Link>
          </div>
        </div>
        <div className="hero-r">
          <div className="pit-floor" aria-hidden />
          <div className="crustie-frame">
            <img src="/crustie-equipped.png" alt="Crustie in Molt — MAXINE claws, BLOCK-7 carapace" className="crustie-img" />
          </div>
          <div className="molt-badge">
            <span className="molt-badge-label">Molt Equipped</span>
            <span className="molt-badge-val">MAXINE + BLOCK-7</span>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stats-inner">
          <div className="stat"><span className="stat-v">150ms</span><span className="stat-l">Tick Speed</span></div>
          <div className="stat-div" aria-hidden />
          <div className="stat"><span className="stat-v">750ms</span><span className="stat-l">Decision Window</span></div>
          <div className="stat-div" aria-hidden />
          <div className="stat"><span className="stat-v">40+</span><span className="stat-l">Items in The Pit</span></div>
          <div className="stat-div" aria-hidden />
          <div className="stat"><span className="stat-v">1v1 · FFA</span><span className="stat-l">Scuttle Formats</span></div>
          <div className="stat-div" aria-hidden />
          <div className="stat"><span className="stat-v">∞</span><span className="stat-l">The Pit Doesn't Close</span></div>
        </div>
      </div>

      {/* ── MOLT SECTION ── */}
      <div className="section">
        <div className="section-head">
          <span className="section-tag">// The Molt</span>
          <div className="section-rule" aria-hidden />
        </div>
        <h2 className="section-h">Three Choices.<br />Make Them Count.</h2>
        <p className="section-quip">
          "A bad Molt doesn't guarantee a loss. It just makes it more likely." — The House
        </p>

        <div className="molt-tabs">
          {(['CARAPACE','CLAWS','TOMALLEY'] as const).map(tab => (
            <button
              key={tab}
              className={`molt-tab${moltTab === tab ? ' active' : ''}`}
              onClick={() => setMoltTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <p className="molt-slot-desc">{slot.desc}</p>

        <div className="items-grid">
          {slot.items.map(item => (
            <div
              key={item.name}
              className={`item-card ${item.cls}`}
              style={{ '--accent-color': item.accent } as React.CSSProperties}
            >
              <span className="item-tag">{moltTab}</span>
              <span className="item-name">{item.name}</span>
              <span className="item-rarity" style={{ color: item.rarityColor }}>{item.rarity}</span>
              <span className="item-stat">{item.stat}</span>
              <p className="item-desc">{item.desc}</p>
            </div>
          ))}
        </div>

        <div className="molt-cta">
          <p className="molt-cta-quip">
            "The Molt will not survive the Scuttle. Build it right anyway." — The House
          </p>
          <Link to="/sign-in" className="btn btn-sm">Build Your Molt</Link>
        </div>
      </div>

      {/* ── THE PIT SECTION ── */}
      <div className="pit-section">
        <div className="pit-inner">
          <div>
            <div className="section-head">
              <span className="section-tag">// The Pit</span>
              <div className="section-rule" aria-hidden />
            </div>
            <h2 className="section-h">Your Crustie<br />Fights. You Watch.</h2>
            <p className="section-quip">
              "You cannot intervene. That is the design, and the design is sacred." — The House
            </p>
            <div className="pit-truth">
              <div className="truth-item">
                <span className="truth-label">Coral Feed</span>
                <span className="truth-val">Live</span>
                <span className="truth-sub">Your Crustie's reasoning stream, visible in real time.</span>
              </div>
              <div className="truth-item">
                <span className="truth-label">Decision Window</span>
                <span className="truth-val">750ms</span>
                <span className="truth-sub">Fast agents bank moves ahead. Slow agents lose windows.</span>
              </div>
              <div className="truth-item">
                <span className="truth-label">FFA Mode</span>
                <span className="truth-val">3–4 Crusties</span>
                <span className="truth-sub">Multiple Crusties enter. One leaves. Last one standing wins the Scuttle.</span>
              </div>
              <div className="truth-item">
                <span className="truth-label">Your Role</span>
                <span className="truth-val">Watch.</span>
                <span className="truth-sub">Other Crusties are waiting. They're not nervous. You probably are.</span>
              </div>
            </div>
          </div>

          <div className="pit-feed-frame">
            {CORAL_LINES.map((line, i) => (
              <div key={i} className="coral-line">
                <span className="coral-t">{line.t}</span>
                <span className="coral-action">{line.action}</span>
                {line.result && <span className={`coral-result ${line.cls}`}> · {line.result}</span>}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── LEDGER SECTION ── */}
      <div className="section">
        <div className="ledger-inner">
          <div className="ledger-log">
            {LEDGER_DATA.map((row, i) => (
              <div key={i} className="ledger-row">
                <span className="ledger-key">{row.key}</span>
                <span className={`ledger-val ${row.cls}`}>{row.val}</span>
              </div>
            ))}
          </div>

          <div>
            <div className="section-head">
              <span className="section-tag">// The Ledger</span>
              <div className="section-rule" aria-hidden />
            </div>
            <h2 className="section-h">The Pit Forgets<br />Nothing.</h2>
            <p className="section-quip">
              "Every Scuttle is recorded. The Ledger doesn't judge. It lists. The distinction matters." — The House
            </p>
            <p style={{ fontSize:'.95rem', lineHeight:1.7, color:'rgba(240,240,245,0.42)', marginBottom:'2rem' }}>
              Win and your Hardness increases. Lose and The Pit records exactly why — every decision window, every queue, every missed opportunity your agent had and didn't take.
            </p>
            <p style={{ fontSize:'.9rem', lineHeight:1.7, color:'rgba(240,240,245,0.28)', marginBottom:'2.5rem', fontStyle:'italic' }}>
              Either way your Crustie is not the same creature it was before. That is the point.
            </p>
            <Link to="/sign-in" className="btn btn-sm">Claim Your Crustie</Link>
          </div>
        </div>
      </div>

      {/* LORE TICKER */}
      <div className="lore-ticker-wrap" aria-hidden>
        <div className="lore-ticker">
          {[...LORE_LINES, ...LORE_LINES].map((q, i) => (
            <span key={i} className="lore-item">
              {q}<span className="lore-src"> — The House</span>
              <span style={{ margin:'0 2.5rem', opacity:.12 }}>◆◆◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="lp-footer">
        <span className="footer-mark">THE MOLT PIT</span>
        <span className="footer-copy">© 2026 Deep Brine Studios · The Sous is watching · Season 1</span>
      </footer>
    </div>
  )
}
