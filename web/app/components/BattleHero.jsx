import React, { useEffect, useRef } from 'react';

export const battleHeroStyles = `
  @keyframes bh-blink {
    0%, 90%, 100% { transform: scaleY(1); opacity: 1; }
    95%            { transform: scaleY(0.1); opacity: 0.6; }
  }
  @keyframes bh-glow-pulse {
    0%, 100% { box-shadow: 0 0 8px #00E5FF; }
    50%       { box-shadow: 0 0 22px #00E5FF, 0 0 40px rgba(0,229,255,0.4); }
  }
  @keyframes bh-claw-pinch-l {
    0%, 100% { transform: rotate(-6deg); }
    50%       { transform: rotate(8deg); }
  }
  @keyframes bh-claw-pinch-r {
    0%, 100% { transform: rotate(6deg); }
    50%       { transform: rotate(-8deg); }
  }
  @keyframes bh-stalk-sway {
    0%, 100% { transform: rotate(-6deg); }
    50%       { transform: rotate(6deg); }
  }
  @keyframes bh-stalk-sway-r {
    0%, 100% { transform: rotate(6deg); }
    50%       { transform: rotate(-6deg); }
  }
  @keyframes bh-idle-bounce {
    0%, 100% { transform: rotate(4deg) translateY(0); }
    50%       { transform: rotate(4deg) translateY(-8px); }
  }
  @keyframes bh-molt-glow {
    0%, 70%, 100% { filter: drop-shadow(6px 6px 0 rgba(0,0,0,0.15)); }
    76%           { filter: drop-shadow(0 0 24px #FFD600) drop-shadow(0 0 48px #FF8800) drop-shadow(6px 6px 0 rgba(0,0,0,0.15)); }
    88%           { filter: drop-shadow(0 0 10px #FFD600) drop-shadow(6px 6px 0 rgba(0,0,0,0.15)); }
  }
  @keyframes bh-bar-in {
    from { width: 0; }
  }
  @keyframes bh-fade-in {
    to { opacity: 1; }
  }
  @keyframes bh-cursor-blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }

  /* ── Outer wrapper: card is the layout anchor, claws are absolute ── */
  .bh-wrap {
    position: relative;
    display: inline-block;
    /* horizontal padding carves out space for the claws */
    padding: 60px 90px 0;
    animation: bh-idle-bounce 2.6s ease-in-out infinite, bh-molt-glow 5s ease-in-out infinite;
  }

  /* ── Eye stalks: absolute, top-center of the card ── */
  .bh-stalks {
    position: absolute;
    /* sits above the card's top edge (card starts at padding-top=60px) */
    top: 0px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 36px;
    z-index: 10;
  }
  .bh-stalk { display: flex; flex-direction: column; align-items: center; }
  .bh-stalk:first-child { animation: bh-stalk-sway 2.2s ease-in-out infinite; }
  .bh-stalk:last-child  { animation: bh-stalk-sway-r 2.2s ease-in-out infinite 0.4s; }
  .bh-eyeball {
    width: 22px; height: 22px;
    background: #00E5FF;
    border-radius: 50%;
    border: 3px solid #1A1A1A;
    box-shadow: 0 0 10px #00E5FF;
    animation: bh-blink 4s ease-in-out infinite, bh-glow-pulse 2s ease-in-out infinite;
    position: relative;
  }
  .bh-eyeball::after {
    content: '';
    position: absolute;
    top: 3px; left: 4px;
    width: 6px; height: 6px;
    background: #1A1A1A;
    border-radius: 50%;
  }
  .bh-stalk-stem {
    width: 7px; height: 32px;
    background: #C0392B;
    border-left: 2px solid rgba(0,0,0,0.3);
    border-radius: 0 0 4px 4px;
  }
  .bh-stalk-base {
    width: 14px; height: 10px;
    background: #C0392B;
    border-radius: 0 0 8px 8px;
    border: 2px solid #1A1A1A;
  }

  /* ── Claw assemblies: absolutely anchored to the card sides ── */
  .bh-claw {
    position: absolute;
    top: 120px; /* align with mid-card */
    display: flex;
    flex-direction: column;
    align-items: center;
    z-index: 2;
  }
  .bh-claw.left  { left: 0; align-items: flex-end; }
  .bh-claw.right { right: 0; align-items: flex-start; }

  .bh-claw-arm {
    width: 28px; height: 72px;
    background: #C0392B;
    border: 3px solid #1A1A1A;
    border-radius: 8px;
    box-shadow: 3px 3px 0 #1A1A1A;
  }
  .bh-claw-elbow {
    width: 34px; height: 34px;
    background: #EB4D4B;
    border: 3px solid #1A1A1A;
    border-radius: 50%;
    margin: -4px 0;
    box-shadow: 2px 2px 0 #1A1A1A;
  }
  .bh-pincer {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .bh-claw.left  .bh-pincer { align-items: flex-end; }
  .bh-claw.right .bh-pincer { align-items: flex-start; }

  .bh-pincer-top, .bh-pincer-bot {
    width: 80px; height: 34px;
    background: radial-gradient(ellipse at 30% 30%, #FF6B6B, #EB4D4B);
    border: 3px solid #1A1A1A;
    box-shadow: 3px 3px 0 #1A1A1A;
  }
  /* left claw: points right */
  .bh-claw.left .bh-pincer-top {
    border-radius: 8px 28px 4px 8px;
    transform-origin: right center;
    animation: bh-claw-pinch-l 1.6s ease-in-out infinite;
  }
  .bh-claw.left .bh-pincer-bot {
    border-radius: 8px 4px 28px 8px;
    transform-origin: right center;
    animation: bh-claw-pinch-r 1.6s ease-in-out infinite;
  }
  /* right claw: points left */
  .bh-claw.right .bh-pincer-top {
    border-radius: 28px 8px 8px 4px;
    transform-origin: left center;
    animation: bh-claw-pinch-r 1.6s ease-in-out infinite;
  }
  .bh-claw.right .bh-pincer-bot {
    border-radius: 4px 8px 8px 28px;
    transform-origin: left center;
    animation: bh-claw-pinch-l 1.6s ease-in-out infinite;
  }

  /* ── Card ── */
  .bh-card {
    width: min(420px, 100%);
    background: #FFFFFF;
    border: 5px solid #1A1A1A;
    border-radius: 30px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative;
    z-index: 3;
  }
  .bh-header {
    background: #EB4D4B;
    height: 120px;
    display: flex;
    align-items: flex-end;
    justify-content: center;
    padding-bottom: 18px;
    border-bottom: 5px solid #1A1A1A;
  }
  .bh-face {
    width: 80px; height: 60px;
    background: #1A1A1A;
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }
  .bh-face-eye {
    width: 20px; height: 20px;
    background: #00E5FF;
    border-radius: 50%;
    animation: bh-blink 3s infinite, bh-glow-pulse 2s ease-in-out infinite;
    box-shadow: 0 0 10px #00E5FF;
  }
  .bh-body {
    padding: 1.6rem 2rem;
    flex-grow: 1;
    background: repeating-linear-gradient(45deg, #fff, #fff 10px, #f4f4f4 10px, #f4f4f4 20px);
  }
  .bh-name {
    font-family: 'Bangers', 'Impact', display;
    font-size: 2.8rem;
    letter-spacing: 3px;
    text-transform: uppercase;
    transform: skewX(-5deg);
    display: inline-block;
    margin-bottom: 1.2rem;
    -webkit-text-stroke: 1px #1A1A1A;
    color: #1A1A1A;
  }
  .bh-stat { margin-bottom: 0.9rem; }
  .bh-stat-label {
    font-weight: 900;
    font-size: 0.85rem;
    text-transform: uppercase;
    display: flex;
    justify-content: space-between;
    margin-bottom: 0.2rem;
    font-family: 'Kanit', sans-serif;
  }
  .bh-bar-track {
    height: 18px;
    background: #ddd;
    border: 2px solid #1A1A1A;
    border-radius: 9px;
    overflow: hidden;
  }
  .bh-bar-fill {
    height: 100%;
    border-radius: 9px;
    animation: bh-bar-in 1s ease-out forwards;
  }
  .bh-terminal {
    margin-top: 1.2rem;
    padding: 0.9rem 1rem;
    background: #1A1A1A;
    border-radius: 8px;
    font-family: 'Courier New', monospace;
    font-size: 0.72rem;
    color: #00E5FF;
    min-height: 58px;
    border: 2px solid #00E5FF;
  }
  .bh-t-line { margin-bottom: 2px; opacity: 0; animation: bh-fade-in 0.3s forwards; }
  .bh-cursor {
    display: inline-block;
    width: 7px; height: 11px;
    background: #00E5FF;
    animation: bh-cursor-blink 0.8s step-end infinite;
    vertical-align: middle;
  }
  .bh-badge {
    text-align: center;
    padding: 0.7rem 0 0.9rem;
    background: #1A1A1A;
    border-top: 5px solid #1A1A1A;
    font-family: 'Bangers', display;
    font-size: 1.5rem;
    letter-spacing: 4px;
    color: #FFD600;
  }

  /* ── Mobile: tighten the claw padding ── */
  @media (max-width: 540px) {
    .bh-wrap {
      padding: 60px 60px 0;
    }
    .bh-pincer-top, .bh-pincer-bot {
      width: 52px; height: 28px;
    }
    .bh-claw-arm  { width: 22px; height: 56px; }
    .bh-claw-elbow { width: 26px; height: 26px; }
    .bh-stalks { gap: 28px; }
  }
`;

const TERMINAL_MSGS = [
  '> CLAWS: LOCKED & LOADED',
  '> PREY: ACQUIRED',
  '> DREAD PROTOCOL: ACTIVE',
  '> LOGIC: FLANK_LEFT',
  '> STATUS: ENTERING PIT...',
  '> THREAT: DETECTED',
  '> COUNTER: DEPLOY EMP...',
  '> HARDNESS: MAXIMUM',
];

export default function BattleHero() {
  const termRef = useRef(null);
  const idxRef  = useRef(0);

  useEffect(() => {
    const term = termRef.current;
    if (!term) return;

    const seed = document.createElement('div');
    seed.className = 'bh-t-line';
    seed.style.opacity = '1';
    seed.textContent = TERMINAL_MSGS[0];
    term.insertBefore(seed, term.querySelector('.bh-cursor'));

    const interval = setInterval(() => {
      idxRef.current = (idxRef.current + 1) % TERMINAL_MSGS.length;
      const line = document.createElement('div');
      line.className = 'bh-t-line';
      line.textContent = TERMINAL_MSGS[idxRef.current];
      const cursor = term.querySelector('.bh-cursor');
      const lines  = term.querySelectorAll('.bh-t-line');
      if (lines.length >= 3) lines[0].remove();
      term.insertBefore(line, cursor);
    }, 2200);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bh-wrap">

      {/* Eye stalks — absolute, top-center */}
      <div className="bh-stalks">
        <div className="bh-stalk">
          <div className="bh-eyeball" />
          <div className="bh-stalk-stem" />
          <div className="bh-stalk-base" />
        </div>
        <div className="bh-stalk">
          <div className="bh-eyeball" />
          <div className="bh-stalk-stem" />
          <div className="bh-stalk-base" />
        </div>
      </div>

      {/* Left claw — absolute */}
      <div className="bh-claw left">
        <div className="bh-claw-arm" />
        <div className="bh-claw-elbow" />
        <div className="bh-pincer">
          <div className="bh-pincer-top" />
          <div className="bh-pincer-bot" />
        </div>
      </div>

      {/* Card */}
      <div className="bh-card">
        <div className="bh-header">
          <div className="bh-face">
            <div className="bh-face-eye" />
            <div className="bh-face-eye" />
          </div>
        </div>
        <div className="bh-body">
          <div className="bh-name">DREADCLAW</div>
          <div className="bh-stat">
            <div className="bh-stat-label"><span>Aggression</span><span>92%</span></div>
            <div className="bh-bar-track">
              <div className="bh-bar-fill" style={{ width: '92%', background: 'linear-gradient(to right, #EB4D4B, #FF8080)' }} />
            </div>
          </div>
          <div className="bh-stat">
            <div className="bh-stat-label"><span>Armor</span><span>65%</span></div>
            <div className="bh-bar-track">
              <div className="bh-bar-fill" style={{ width: '65%', background: 'linear-gradient(to right, #FFD600, #FFE866)' }} />
            </div>
          </div>
          <div className="bh-stat">
            <div className="bh-stat-label"><span>Compute Speed</span><span>88%</span></div>
            <div className="bh-bar-track">
              <div className="bh-bar-fill" style={{ width: '88%', background: 'linear-gradient(to right, #00E5FF, #80F2FF)' }} />
            </div>
          </div>
          <div className="bh-terminal" ref={termRef}>
            <span className="bh-cursor" />
          </div>
        </div>
        <div className="bh-badge">⚡ THE MOLT PIT ⚡</div>
      </div>

      {/* Right claw — absolute */}
      <div className="bh-claw right">
        <div className="bh-claw-arm" />
        <div className="bh-claw-elbow" />
        <div className="bh-pincer">
          <div className="bh-pincer-top" />
          <div className="bh-pincer-bot" />
        </div>
      </div>

    </div>
  );
}
