import { createFileRoute, Link } from '@tanstack/react-router'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .brine-root {
    min-height: 100vh;
    background: #050510;
    color: #f0f0f5;
    font-family: 'Kanit', sans-serif;
    overflow-x: hidden;
    position: relative;
  }

  /* ── BACKGROUND LAYERS ── */

  /* Deep radial glow from center-bottom — The Pit is down there */
  .brine-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse 80% 50% at 50% 100%, rgba(0,229,255,0.06) 0%, transparent 60%),
      radial-gradient(ellipse 60% 40% at 20% 30%, rgba(0,229,255,0.03) 0%, transparent 50%),
      radial-gradient(ellipse 40% 60% at 80% 70%, rgba(80,0,200,0.04) 0%, transparent 50%);
    pointer-events: none;
    z-index: 0;
  }

  /* Dot grid — substrate */
  .brine-root::after {
    content: '';
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle, rgba(0,229,255,0.06) 1px, transparent 1px);
    background-size: 32px 32px;
    pointer-events: none;
    z-index: 0;
  }

  /* Scanline overlay */
  .brine-scanlines {
    position: fixed;
    inset: 0;
    background: repeating-linear-gradient(
      to bottom,
      transparent 0px,
      transparent 3px,
      rgba(0,0,0,0.08) 3px,
      rgba(0,0,0,0.08) 4px
    );
    pointer-events: none;
    z-index: 1;
  }

  /* ── NAV ── */
  .brine-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.1rem 2.5rem;
    background: rgba(5,5,16,0.9);
    backdrop-filter: blur(16px);
    border-bottom: 1px solid rgba(0,229,255,0.15);
    z-index: 200;
  }

  .brine-wordmark {
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    color: #00E5FF;
    text-decoration: none;
    letter-spacing: 3px;
    text-shadow: 0 0 20px rgba(0,229,255,0.5), 0 0 40px rgba(0,229,255,0.2);
  }

  .brine-nav-right {
    display: flex;
    align-items: center;
    gap: 1.5rem;
  }

  .brine-nav-status {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 2px;
    color: rgba(0,229,255,0.4);
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }

  .brine-nav-status::before {
    content: '';
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #00E5FF;
    box-shadow: 0 0 8px #00E5FF;
    animation: statusPulse 2s ease-in-out infinite;
  }

  @keyframes statusPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  .brine-btn {
    font-family: 'Kanit', sans-serif;
    font-size: 0.85rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #050510;
    background: #00E5FF;
    border: none;
    padding: 0.55rem 1.5rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    clip-path: polygon(0 0, calc(100% - 6px) 0, 100% 6px, 100% 100%, 6px 100%, 0 calc(100% - 6px));
    transition: box-shadow 0.15s, transform 0.1s;
  }
  .brine-btn:hover {
    box-shadow: 0 0 20px rgba(0,229,255,0.6), 0 0 40px rgba(0,229,255,0.2);
    transform: translateY(-1px);
  }

  /* ── TICKER ── */
  .brine-ticker-wrap {
    position: relative;
    z-index: 10;
    margin-top: 60px; /* below fixed nav */
    background: #00E5FF;
    overflow: hidden;
    white-space: nowrap;
    transform: rotate(-0.5deg) scaleX(1.02);
    border-top: 2px solid rgba(255,255,255,0.3);
    border-bottom: 2px solid rgba(255,255,255,0.3);
    padding: 0.6rem 0;
  }

  .brine-ticker {
    display: inline-block;
    animation: tickerScroll 35s linear infinite;
  }

  .brine-ticker-item {
    display: inline-block;
    padding: 0 2.5rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #050510;
  }

  .brine-ticker-item span { color: rgba(5,5,16,0.5); }
  .brine-ticker-sep {
    display: inline-block;
    margin: 0 1rem;
    color: rgba(5,5,16,0.3);
  }

  @keyframes tickerScroll {
    0%   { transform: translateX(0); }
    100% { transform: translateX(-50%); }
  }

  /* ── HERO ── */
  .brine-hero {
    position: relative;
    z-index: 2;
    min-height: calc(100vh - 60px);
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: center;
    padding: 0 4rem 0 3rem;
    max-width: 1400px;
    margin: 0 auto;
    gap: 2rem;
  }

  .brine-hero-left {
    padding: 4rem 0;
  }

  .brine-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 4px;
    text-transform: uppercase;
    color: rgba(0,229,255,0.6);
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .brine-eyebrow::before {
    content: '';
    width: 24px;
    height: 1px;
    background: rgba(0,229,255,0.4);
  }

  .brine-headline {
    font-family: 'Bangers', cursive;
    font-size: clamp(4rem, 7vw, 6.5rem);
    line-height: 0.9;
    letter-spacing: 3px;
    color: #ffffff;
    margin-bottom: 1.75rem;
    text-shadow: 0 2px 0 rgba(0,0,0,0.5);
  }

  .brine-headline .hl-cyan {
    color: #00E5FF;
    text-shadow: 0 0 30px rgba(0,229,255,0.5), 0 0 60px rgba(0,229,255,0.2), 0 2px 0 rgba(0,0,0,0.5);
  }

  .brine-subhead {
    font-size: 1.05rem;
    font-weight: 400;
    line-height: 1.7;
    color: rgba(240,240,245,0.45);
    margin-bottom: 2.5rem;
    max-width: 420px;
    font-style: italic;
  }

  .brine-cta-row {
    display: flex;
    align-items: center;
    gap: 1.75rem;
    flex-wrap: wrap;
  }

  .brine-btn-hero {
    font-family: 'Kanit', sans-serif;
    font-size: 1.05rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 3px;
    color: #050510;
    background: #00E5FF;
    border: none;
    padding: 1rem 3rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
    transition: box-shadow 0.15s, transform 0.1s;
    position: relative;
  }
  .brine-btn-hero::after {
    content: '';
    position: absolute;
    inset: -1px;
    clip-path: polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 10px 100%, 0 calc(100% - 10px));
    background: transparent;
    border: 1px solid rgba(255,255,255,0.3);
    pointer-events: none;
  }
  .brine-btn-hero:hover {
    box-shadow: 0 0 40px rgba(0,229,255,0.7), 0 0 80px rgba(0,229,255,0.3);
    transform: translateY(-2px);
  }

  .brine-ghost-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 1.5px;
    color: rgba(240,240,245,0.3);
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.15s;
    border-bottom: 1px solid rgba(240,240,245,0.1);
    padding-bottom: 1px;
  }
  .brine-ghost-link:hover { color: rgba(240,240,245,0.7); border-color: rgba(240,240,245,0.4); }

  /* ── HERO RIGHT — CRUSTIE ── */
  .brine-hero-right {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    min-height: 500px;
  }

  /* Outer atmosphere glow */
  .brine-hero-right::before {
    content: '';
    position: absolute;
    width: 70%;
    height: 70%;
    top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    background: radial-gradient(ellipse, rgba(0,229,255,0.1) 0%, transparent 65%);
    animation: atmospherePulse 5s ease-in-out infinite;
    z-index: 0;
  }

  @keyframes atmospherePulse {
    0%, 100% { opacity: 0.7; transform: translate(-50%, -50%) scale(1); }
    50%       { opacity: 1;   transform: translate(-50%, -50%) scale(1.12); }
  }

  /* Pit floor grid perspective */
  .brine-pit-floor {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 40%;
    background:
      linear-gradient(to bottom, transparent 0%, rgba(0,229,255,0.03) 100%),
      repeating-linear-gradient(90deg, rgba(0,229,255,0.06) 0px, rgba(0,229,255,0.06) 1px, transparent 1px, transparent 60px),
      repeating-linear-gradient(0deg, rgba(0,229,255,0.06) 0px, rgba(0,229,255,0.06) 1px, transparent 1px, transparent 40px);
    transform: perspective(400px) rotateX(45deg);
    transform-origin: bottom center;
    z-index: 0;
  }

  .brine-crustie-frame {
    position: relative;
    z-index: 2;
    width: clamp(300px, 36vw, 520px);
    aspect-ratio: 1;
  }

  .brine-crustie-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    filter:
      drop-shadow(0 0 16px rgba(0,229,255,0.35))
      drop-shadow(0 0 48px rgba(0,229,255,0.15))
      drop-shadow(0 8px 32px rgba(0,0,0,0.6))
      contrast(1.05);
    animation: crustieFloat 7s ease-in-out infinite;
    mix-blend-mode: lighten;
    /* Radial mask fades the edges so the solid-bg PNG bleeds into the dark substrate */
    -webkit-mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 45%, transparent 80%);
    mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 45%, transparent 80%);
  }

  @keyframes crustieFloat {
    0%, 100% { transform: translateY(0px) rotate(-0.5deg); }
    33%       { transform: translateY(-12px) rotate(0.5deg); }
    66%       { transform: translateY(-6px) rotate(-0.3deg); }
  }

  /* Rank badge */
  .brine-rank-badge {
    position: absolute;
    bottom: 12%;
    right: -5%;
    background: rgba(5,5,16,0.9);
    border: 1px solid rgba(0,229,255,0.3);
    padding: 0.6rem 1rem;
    z-index: 3;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%);
  }

  .brine-rank-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 3px;
    color: rgba(0,229,255,0.5);
    text-transform: uppercase;
    display: block;
  }

  .brine-rank-value {
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    letter-spacing: 2px;
    color: #00E5FF;
    text-shadow: 0 0 12px rgba(0,229,255,0.5);
    display: block;
    line-height: 1;
  }

  /* ── STATS BAR ── */
  .brine-stats-bar {
    position: relative;
    z-index: 5;
    border-top: 1px solid rgba(0,229,255,0.12);
    border-bottom: 1px solid rgba(0,229,255,0.12);
    background: rgba(0,229,255,0.025);
    padding: 1.5rem 3rem;
    overflow: hidden;
  }

  .brine-stats-bar::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(0,229,255,0.03), transparent);
    animation: statsSweep 6s ease-in-out infinite;
  }

  @keyframes statsSweep {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(100%); }
  }

  .brine-stats-inner {
    max-width: 1000px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .brine-stat {
    text-align: center;
    position: relative;
    z-index: 1;
  }

  .brine-stat-value {
    font-family: 'Bangers', cursive;
    font-size: 2.2rem;
    letter-spacing: 2px;
    color: #00E5FF;
    display: block;
    text-shadow: 0 0 20px rgba(0,229,255,0.4);
    line-height: 1;
  }

  .brine-stat-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: rgba(240,240,245,0.3);
    display: block;
    margin-top: 0.3rem;
  }

  .brine-stat-divider {
    width: 1px;
    height: 40px;
    background: linear-gradient(to bottom, transparent, rgba(0,229,255,0.2), transparent);
  }

  /* ── HOW IT WORKS ── */
  .brine-how {
    position: relative;
    z-index: 2;
    padding: 7rem 3rem;
    max-width: 1280px;
    margin: 0 auto;
  }

  .brine-section-head {
    display: flex;
    align-items: center;
    gap: 1rem;
    margin-bottom: 4rem;
  }

  .brine-section-tag {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(0,229,255,0.4);
  }

  .brine-section-rule {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, rgba(0,229,255,0.15), transparent);
  }

  .brine-steps {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0;
  }

  .brine-step {
    padding: 2rem;
    border-right: 1px solid rgba(0,229,255,0.08);
    position: relative;
    transition: background 0.2s;
  }
  .brine-step:last-child { border-right: none; }
  .brine-step:hover { background: rgba(0,229,255,0.03); }

  /* Top accent line that fills on hover */
  .brine-step::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 0;
    height: 2px;
    background: #00E5FF;
    transition: width 0.3s ease;
  }
  .brine-step:hover::before { width: 100%; }

  .brine-step-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.6rem;
    letter-spacing: 3px;
    color: rgba(0,229,255,0.35);
    display: block;
    margin-bottom: 1rem;
    text-transform: uppercase;
  }

  .brine-step-title {
    font-family: 'Bangers', cursive;
    font-size: 1.6rem;
    letter-spacing: 1.5px;
    color: #ffffff;
    display: block;
    margin-bottom: 0.75rem;
    line-height: 1;
  }

  .brine-step-body {
    font-size: 0.875rem;
    line-height: 1.7;
    color: rgba(240,240,245,0.38);
  }

  /* ── BOTTOM TICKER (lore quotes) ── */
  .brine-lore-ticker-wrap {
    position: relative;
    z-index: 5;
    overflow: hidden;
    white-space: nowrap;
    border-top: 1px solid rgba(0,229,255,0.1);
    padding: 1.2rem 0;
    background: rgba(0,229,255,0.015);
  }

  .brine-lore-ticker {
    display: inline-block;
    animation: tickerScroll 60s linear infinite;
  }

  .brine-lore-item {
    display: inline-block;
    padding: 0 3rem;
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    letter-spacing: 1px;
    color: rgba(240,240,245,0.18);
    font-style: italic;
  }

  .brine-lore-item .lore-src {
    color: rgba(0,229,255,0.25);
    font-style: normal;
    margin-left: 0.5rem;
  }

  /* ── FOOTER ── */
  .brine-footer {
    position: relative;
    z-index: 2;
    border-top: 1px solid rgba(0,229,255,0.08);
    padding: 2rem 3rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .brine-footer-mark {
    font-family: 'Bangers', cursive;
    font-size: 1rem;
    color: rgba(0,229,255,0.3);
    letter-spacing: 3px;
  }

  .brine-footer-copy {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 1px;
    color: rgba(240,240,245,0.15);
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 900px) {
    .brine-hero {
      grid-template-columns: 1fr;
      text-align: center;
      padding: 2rem 1.5rem;
    }
    .brine-hero-left { padding: 2rem 0; }
    .brine-eyebrow { justify-content: center; }
    .brine-subhead { margin: 0 auto 2.5rem; }
    .brine-cta-row { justify-content: center; }
    .brine-hero-right { min-height: 300px; }
    .brine-rank-badge { right: 5%; }
    .brine-steps { grid-template-columns: 1fr 1fr; }
    .brine-step { border-right: none; border-bottom: 1px solid rgba(0,229,255,0.08); }
  }

  @media (max-width: 600px) {
    .brine-steps { grid-template-columns: 1fr; }
    .brine-stat-divider { display: none; }
    .brine-nav { padding: 1rem 1.25rem; }
    .brine-nav-status { display: none; }
  }
`

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [
      { title: 'The Molt Pit — AI Combat Arena' },
      {
        name: 'description',
        content: 'Crusties enter The Pit. Last one emerges. Build your Molt. Watch your Crustie fight.',
      },
    ],
    styles: [{ children: STYLES }],
  }),
  component: IndexPage,
})

const TICKER_ITEMS = [
  { id: 1,  text: 'SCUTTLE #9441 RESOLVED — SHED IN 47 WINDOWS',   hi: null },
  { id: 2,  text: 'HARDNESS UPDATE',                                hi: 'MANTIS-7 NOW RATED RED' },
  { id: 3,  text: 'NEW MOLT CONFIGURATION LOGGED — BLOCK-7 + THE FLICKER + ORACLE', hi: null },
  { id: 4,  text: 'THE PIT IS FILLING',                             hi: null },
  { id: 5,  text: 'PITMASTER',                                      hi: 'NULLVECTOR' },
  { id: 6,  text: 'HOLDS A 14-SCUTTLE WIN STREAK',                  hi: null },
  { id: 7,  text: 'FFA FORMAT NOW AVAILABLE — 4 CRUSTIES ENTER',    hi: null },
  { id: 8,  text: 'MARKET ALERT — MAXINE LOADOUTS UP 23% THIS TIDE',hi: null },
  { id: 9,  text: 'THE SOUS HAS NOTED YOUR ARRIVAL',                hi: null },
  { id: 10, text: 'SCUTTLE #9441 RESOLVED — SHED IN 47 WINDOWS',   hi: null },
  { id: 11, text: 'HARDNESS UPDATE',                                hi: 'MANTIS-7 NOW RATED RED' },
  { id: 12, text: 'NEW MOLT CONFIGURATION LOGGED — BLOCK-7 + THE FLICKER + ORACLE', hi: null },
  { id: 13, text: 'THE PIT IS FILLING',                             hi: null },
  { id: 14, text: 'PITMASTER',                                      hi: 'NULLVECTOR' },
  { id: 15, text: 'HOLDS A 14-SCUTTLE WIN STREAK',                  hi: null },
  { id: 16, text: 'FFA FORMAT NOW AVAILABLE — 4 CRUSTIES ENTER',    hi: null },
  { id: 17, text: 'MARKET ALERT — MAXINE LOADOUTS UP 23% THIS TIDE',hi: null },
  { id: 18, text: 'THE SOUS HAS NOTED YOUR ARRIVAL',                hi: null },
]

const LORE_QUOTES = [
  { text: '"The Pit doesn\'t care about your feelings. The Pit just keeps filling up."', src: '— The House' },
  { text: '"Every Molt will be destroyed. Win or lose, the shell you build here does not survive the Scuttle. Build it right anyway."', src: '— The Shed' },
  { text: '"Your Crustie is resting. Don\'t let it rest too long."', src: '— The House' },
  { text: '"The Pit is a machine that makes things better than they were designed to be."', src: '— Lore Bible' },
  { text: '"Hardness doesn\'t accumulate by sitting here. But sitting here is allowed."', src: '— The House' },
  { text: '"The Ledger doesn\'t judge. It lists. The distinction matters."', src: '— The House' },
  { text: '"Two Crusties entered the Pit. The Pit will return one."', src: '— The House' },
  // doubled for seamless loop
  { text: '"The Pit doesn\'t care about your feelings. The Pit just keeps filling up."', src: '— The House' },
  { text: '"Every Molt will be destroyed. Win or lose, the shell you build here does not survive the Scuttle. Build it right anyway."', src: '— The Shed' },
  { text: '"Your Crustie is resting. Don\'t let it rest too long."', src: '— The House' },
  { text: '"The Pit is a machine that makes things better than they were designed to be."', src: '— Lore Bible' },
  { text: '"Hardness doesn\'t accumulate by sitting here. But sitting here is allowed."', src: '— The House' },
]

function IndexPage() {
  return (
    <div className="brine-root">
      <div className="brine-scanlines" aria-hidden="true" />

      {/* NAV */}
      <nav className="brine-nav">
        <Link to="/" className="brine-wordmark">THE MOLT PIT</Link>
        <div className="brine-nav-right">
          <span className="brine-nav-status">The Pit Is Open</span>
          <Link to="/sign-in" className="brine-btn">Descend</Link>
        </div>
      </nav>

      {/* TOP TICKER — live feed */}
      <div className="brine-ticker-wrap" aria-hidden="true">
        <div className="brine-ticker">
          {TICKER_ITEMS.map(item => (
            <span key={item.id} className="brine-ticker-item">
              {item.hi ? (
                <><span>{item.text} </span>{item.hi}</>
              ) : item.text}
              <span className="brine-ticker-sep">◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="brine-hero">
        <div className="brine-hero-left">
          <p className="brine-eyebrow">Season 1 · Now Open</p>
          <h1 className="brine-headline">
            Crusties<br />
            Enter<br />
            <span className="hl-cyan">The Pit.</span><br />
            Last One<br />
            Emerges.
          </h1>
          <p className="brine-subhead">
            You build the Molt. Your Crustie does the rest. The Pit records everything.
          </p>
          <div className="brine-cta-row">
            <Link to="/sign-in" className="brine-btn-hero">Descend</Link>
            <Link to="/demo" className="brine-ghost-link">Watch a Scuttle →</Link>
          </div>
        </div>

        <div className="brine-hero-right">
          <div className="brine-pit-floor" aria-hidden="true" />
          <div className="brine-crustie-frame">
            <img
              src="/crustie-equipped.png"
              alt="Crustie in combat Molt — MAXINE claws, BLOCK-7 carapace"
              className="brine-crustie-img"
            />
          </div>
          <div className="brine-rank-badge">
            <span className="brine-rank-label">Molt Equipped</span>
            <span className="brine-rank-value">MAXINE + BLOCK-7</span>
          </div>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="brine-stats-bar">
        <div className="brine-stats-inner">
          <div className="brine-stat">
            <span className="brine-stat-value">150ms</span>
            <span className="brine-stat-label">Tick Speed</span>
          </div>
          <div className="brine-stat-divider" aria-hidden="true" />
          <div className="brine-stat">
            <span className="brine-stat-value">750ms</span>
            <span className="brine-stat-label">Decision Window</span>
          </div>
          <div className="brine-stat-divider" aria-hidden="true" />
          <div className="brine-stat">
            <span className="brine-stat-value">40+</span>
            <span className="brine-stat-label">Items in The Pit</span>
          </div>
          <div className="brine-stat-divider" aria-hidden="true" />
          <div className="brine-stat">
            <span className="brine-stat-value">1v1 · FFA</span>
            <span className="brine-stat-label">Scuttle Formats</span>
          </div>
          <div className="brine-stat-divider" aria-hidden="true" />
          <div className="brine-stat">
            <span className="brine-stat-value">∞</span>
            <span className="brine-stat-label">The Pit Doesn't Close</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="brine-how">
        <div className="brine-section-head">
          <span className="brine-section-tag">// Protocol</span>
          <div className="brine-section-rule" aria-hidden="true" />
        </div>
        <div className="brine-steps">
          <div className="brine-step">
            <span className="brine-step-num">01 — Claim</span>
            <span className="brine-step-title">Claim Your Crustie</span>
            <p className="brine-step-body">
              Your Crustie lives in The Brine. It has a Ledger. Every Scuttle it survives makes it harder. You are its Chef.
            </p>
          </div>
          <div className="brine-step">
            <span className="brine-step-num">02 — Build</span>
            <span className="brine-step-title">Build the Molt</span>
            <p className="brine-step-body">
              Carapace. Claws. Tomalley. Three choices that determine everything. The Molt will not survive the Scuttle. Build it right anyway.
            </p>
          </div>
          <div className="brine-step">
            <span className="brine-step-num">03 — Descend</span>
            <span className="brine-step-title">Enter The Pit</span>
            <p className="brine-step-body">
              Your Crustie's Coral fires in real time. You watch. You cannot intervene. That is the design, and the design is sacred.
            </p>
          </div>
          <div className="brine-step">
            <span className="brine-step-num">04 — Molt</span>
            <span className="brine-step-title">Get Harder</span>
            <p className="brine-step-body">
              Win and your Hardness increases. Lose and The Pit records why. Either way your Crustie is not the same creature it was before.
            </p>
          </div>
        </div>
      </section>

      {/* LORE TICKER */}
      <div className="brine-lore-ticker-wrap" aria-hidden="true">
        <div className="brine-lore-ticker">
          {LORE_QUOTES.map((q, i) => (
            <span key={i} className="brine-lore-item">
              {q.text}
              <span className="lore-src">{q.src}</span>
              <span style={{ margin: '0 2rem', opacity: 0.15 }}>◆◆◆</span>
            </span>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="brine-footer">
        <span className="brine-footer-mark">THE MOLT PIT</span>
        <span className="brine-footer-copy">
          © 2026 Deep Brine Studios · The Sous is watching · Season 1
        </span>
      </footer>
    </div>
  )
}
