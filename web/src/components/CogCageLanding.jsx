import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// ─── Style injection ───────────────────────────────────────────────────────────
const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:ital,wght@0,400;0,800;1,900&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-orange: #FF9F1C;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #1A1A1A;
    --c-white: #FFFFFF;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
    --skew: -6deg;
    --radius: 12px;
    --shadow-hard: 6px 6px 0px rgba(0,0,0,0.2);
    --shadow-pop: 0px 10px 20px rgba(255, 214, 0, 0.4);
  }

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    background: linear-gradient(135deg, #fdfbfb 0%, #ebedee 100%);
    background-color: #F8F9FA;
    font-family: var(--f-body);
    color: var(--c-dark);
    overflow-x: hidden;
  }

  .bg-mesh {
    position: fixed;
    top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: -1;
    background:
      radial-gradient(circle at 10% 20%, rgba(255,214,0,0.15) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(235,77,75,0.1) 0%, transparent 40%),
      repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.03) 10px, rgba(0,0,0,0.03) 20px);
  }

  h1, h2, h3 {
    font-family: var(--f-display);
    text-transform: uppercase;
    letter-spacing: 2px;
    line-height: 0.9;
  }

  .text-stroke {
    -webkit-text-stroke: 2px var(--c-dark);
    color: var(--c-white);
    text-shadow: 4px 4px 0px var(--c-orange);
  }

  .btn-arcade {
    display: inline-flex;
    justify-content: center;
    align-items: center;
    font-family: var(--f-display);
    font-size: 1.5rem;
    text-transform: uppercase;
    padding: 1rem 3rem;
    background: var(--c-yellow);
    color: var(--c-dark);
    border: 4px solid var(--c-dark);
    border-radius: 50px;
    box-shadow: 0 6px 0 var(--c-dark);
    cursor: pointer;
    transition: all 0.1s ease;
    text-decoration: none;
    position: relative;
    overflow: hidden;
    min-height: 52px;
  }

  .btn-arcade:active {
    transform: translateY(6px);
    box-shadow: 0 0 0 var(--c-dark);
  }

  .btn-arcade:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .btn-arcade.red {
    background: var(--c-red);
    color: var(--c-white);
  }

  .btn-arcade::after {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 100%; height: 50%;
    background: linear-gradient(to bottom, rgba(255,255,255,0.6), transparent);
    border-radius: 40px 40px 0 0;
    pointer-events: none;
  }

  .panel-skew {
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    border-radius: var(--radius);
    transform: skewX(var(--skew));
    box-shadow: var(--shadow-hard);
    padding: 2rem;
    position: relative;
  }

  .panel-content-unskew {
    transform: skewX(calc(var(--skew) * -1));
  }

  nav.cog-nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 4rem;
    position: sticky;
    top: 0;
    z-index: 100;
    background: rgba(255,255,255,0.9);
    backdrop-filter: blur(10px);
    border-bottom: 4px solid var(--c-dark);
    gap: 1.5rem;
  }

  .logo {
    font-family: var(--f-display);
    font-size: 2.5rem;
    color: var(--c-red);
    transform: skewX(var(--skew));
    text-shadow: 2px 2px 0px var(--c-dark);
    text-decoration: none;
  }

  .nav-links { display: flex; gap: 2rem; }

  .nav-controls {
    display: flex;
    align-items: center;
    gap: 1rem;
  }

  .nav-toggle {
    display: none;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border-radius: 12px;
    background: var(--c-white);
    border: 3px solid var(--c-dark);
    box-shadow: var(--shadow-hard);
    font-family: var(--f-display);
    font-size: 1.4rem;
    cursor: pointer;
  }

  .nav-toggle span {
    display: block;
    line-height: 1;
  }

  .nav-mobile {
    display: none;
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: var(--c-white);
    border-bottom: 4px solid var(--c-dark);
    padding: 1rem 1.5rem 1.5rem;
    box-shadow: 0 12px 0 rgba(0,0,0,0.15);
    z-index: 99;
  }

  .nav-mobile .nav-link {
    font-size: 1.1rem;
    padding: 0.75rem 0.25rem;
    text-align: left;
  }

  .nav-mobile.open {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .nav-link {
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--c-dark);
    font-size: 1.1rem;
    position: relative;
    cursor: pointer;
    background: none;
    border: none;
    font-family: var(--f-body);
  }

  .nav-link::after {
    content: '';
    display: block;
    width: 0;
    height: 4px;
    background: var(--c-cyan);
    transition: width 0.3s;
  }

  .nav-link:hover::after { width: 100%; }

  .hero-section {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    min-height: 85vh;
    padding: 0 4rem;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .hero-content { z-index: 2; }

  .hero-h1 {
    font-size: clamp(3.4rem, 8vw, 7rem);
    line-height: 0.85;
    margin-bottom: 1.5rem;
    transform: rotate(-2deg);
  }

  .hero-tagline {
    font-size: clamp(1.05rem, 2.5vw, 1.5rem);
    font-weight: 800;
    color: var(--c-dark);
    margin-bottom: 2.5rem;
    background: var(--c-cyan);
    display: inline-block;
    padding: 0.5rem 1rem;
    transform: skewX(var(--skew));
    border: 2px solid var(--c-dark);
  }

  .hero-visual {
    position: relative;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .hero-body {
    font-size: 1.35rem;
    max-width: 520px;
    margin-bottom: 2rem;
    font-weight: 500;
    line-height: 1.5;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
  }

  .hero-waitlist {
    margin-bottom: 2rem;
    max-width: 520px;
    width: min(520px, 100%);
  }

  .waitlist-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 1.1rem;
    margin-bottom: 0.75rem;
  }

  .waitlist-form {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
  }

  .waitlist-input {
    padding: 0.9rem 1.2rem;
    border: 3px solid var(--c-dark);
    border-radius: 16px;
    font-size: 1rem;
    font-family: var(--f-body);
    font-weight: 700;
    background: #fff;
    color: var(--c-dark);
    min-height: 52px;
    outline: none;
  }

  .waitlist-input:focus {
    box-shadow: 0 0 0 4px rgba(0, 229, 255, 0.35);
  }

  .waitlist-message {
    margin-top: 0.75rem;
    font-weight: 800;
  }

  .waitlist-hint {
    margin-top: 0.5rem;
    font-size: 0.95rem;
    opacity: 0.8;
  }

  .bot-card {
    width: min(400px, 90vw);
    height: 550px;
    background: var(--c-white);
    border: 5px solid var(--c-dark);
    border-radius: 30px;
    position: relative;
    transform: rotate(4deg);
    box-shadow: 20px 20px 0px rgba(0,0,0,0.1);
    overflow: hidden;
    display: flex;
    flex-direction: column;
  }

  .bot-header {
    background: var(--c-red);
    height: 120px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 5px solid var(--c-dark);
  }

  .bot-face {
    width: 80px;
    height: 60px;
    background: var(--c-dark);
    border-radius: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
  }

  .eye {
    width: 20px;
    height: 20px;
    background: var(--c-cyan);
    border-radius: 50%;
    animation: blink 3s infinite;
    box-shadow: 0 0 10px var(--c-cyan);
  }

  .bot-body {
    padding: 2rem;
    flex-grow: 1;
    background: repeating-linear-gradient(45deg, #fff, #fff 10px, #f4f4f4 10px, #f4f4f4 20px);
  }

  .stat-bar { margin-bottom: 1rem; }

  .stat-label {
    font-weight: 900;
    text-transform: uppercase;
    font-size: 0.9rem;
    margin-bottom: 0.2rem;
    display: flex;
    justify-content: space-between;
  }

  .bar-container {
    height: 20px;
    background: #ddd;
    border: 2px solid var(--c-dark);
    border-radius: 10px;
    overflow: hidden;
  }

  .bar-fill {
    height: 100%;
    background: var(--c-yellow);
    position: relative;
    transition: width 1s ease-out;
  }

  .bar-fill::after {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    background: linear-gradient(to bottom, rgba(255,255,255,0.4), transparent);
  }

  .ticker-wrap {
    width: 100%;
    background: var(--c-dark);
    color: var(--c-yellow);
    padding: 1rem 0;
    overflow: hidden;
    white-space: nowrap;
    border-top: 4px solid var(--c-yellow);
    border-bottom: 4px solid var(--c-yellow);
    transform: rotate(-1deg) scale(1.01);
  }

  .ticker {
    display: inline-block;
    animation: ticker 20s linear infinite;
  }

  .ticker-item {
    display: inline-block;
    padding: 0 2rem;
    font-size: clamp(0.95rem, 2.2vw, 1.2rem);
    font-weight: 800;
    font-family: var(--f-display);
    letter-spacing: 1px;
  }

  .accent-text { color: var(--c-cyan); }

  .section-config {
    padding: 6rem 4rem;
    position: relative;
  }

  .section-header {
    text-align: center;
    margin-bottom: 4rem;
  }

  .section-header h2 {
    font-size: clamp(2.6rem, 7vw, 5rem);
    color: var(--c-yellow);
    -webkit-text-stroke: 3px var(--c-dark);
    text-shadow: 5px 5px 0px var(--c-dark);
  }

  .parts-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 2rem;
    max-width: 1200px;
    margin: 0 auto;
  }

  .part-card {
    background: var(--c-white);
    border: 4px solid var(--c-dark);
    border-radius: 20px;
    padding: 0;
    overflow: hidden;
    transition: transform 0.2s;
    cursor: pointer;
  }

  .part-card:hover {
    transform: translateY(-10px) rotate(1deg);
    box-shadow: 10px 10px 0px var(--c-cyan);
  }

  .part-img {
    height: 180px;
    background: #eee;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 4px solid var(--c-dark);
    font-size: 4rem;
  }

  .part-info { padding: 1.5rem; }

  .part-title {
    font-weight: 900;
    font-size: 1.5rem;
    text-transform: uppercase;
    margin-bottom: 0.5rem;
  }

  .tag {
    display: inline-block;
    background: var(--c-dark);
    color: var(--c-white);
    padding: 0.2rem 0.6rem;
    border-radius: 4px;
    font-size: 0.8rem;
    font-weight: bold;
    margin-right: 0.5rem;
  }

  .section-arena {
    background: var(--c-yellow);
    padding: 6rem 4rem;
    border-top: 5px solid var(--c-dark);
    border-bottom: 5px solid var(--c-dark);
    background-image:
      linear-gradient(135deg, #FFC107 25%, transparent 25%),
      linear-gradient(225deg, #FFC107 25%, transparent 25%),
      linear-gradient(45deg, #FFC107 25%, transparent 25%),
      linear-gradient(315deg, #FFC107 25%, transparent 25%);
    background-position: 20px 0, 20px 0, 0 0, 0 0;
    background-size: 40px 40px;
    background-repeat: repeat;
  }

  .leaderboard-container {
    max-width: 1000px;
    margin: 0 auto;
    background: var(--c-white);
    border: 5px solid var(--c-dark);
    border-radius: 10px;
    box-shadow: 15px 15px 0px rgba(0,0,0,0.8);
    padding: 2rem;
  }

  .rank-row {
    display: grid;
    grid-template-columns: 0.5fr 2fr 1fr 1fr;
    padding: 1rem;
    border-bottom: 2px solid #eee;
    align-items: center;
    font-weight: 800;
    font-size: 1.2rem;
  }

  .rank-row:last-child { border-bottom: none; }

  .rank-head {
    color: #888;
    text-transform: uppercase;
    font-size: 0.9rem;
  }

  .rank-num {
    width: 40px;
    height: 40px;
    background: var(--c-dark);
    color: var(--c-white);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: var(--f-display);
  }

  .status-dot {
    height: 12px;
    width: 12px;
    background: #00E676;
    border-radius: 50%;
    display: inline-block;
    margin-right: 5px;
    box-shadow: 0 0 5px #00E676;
  }

  .decor {
    position: absolute;
    pointer-events: none;
    z-index: 1;
  }

  .circle-decor {
    width: 100px;
    height: 100px;
    border: 8px solid var(--c-cyan);
    border-radius: 50%;
    top: 20%;
    right: 10%;
    opacity: 0.6;
  }

  .plus-decor {
    font-family: var(--f-display);
    font-size: 8rem;
    color: var(--c-red);
    top: 60%;
    left: 5%;
    transform: rotate(15deg);
    opacity: 0.2;
  }

  @keyframes ticker {
    0% { transform: translateX(0%); }
    100% { transform: translateX(-50%); }
  }

  @keyframes blink {
    0%, 90%, 100% { transform: scaleY(1); }
    95% { transform: scaleY(0.1); }
  }

  @media (max-width: 1200px) {
    .parts-grid { grid-template-columns: repeat(2, 1fr); }
  }

  @media (max-width: 900px) {
    nav.cog-nav {
      padding: 1rem 1.5rem;
      flex-wrap: wrap;
      justify-content: space-between;
    }

    .logo { font-size: 2rem; }

    .nav-links { display: none; }

    .nav-toggle { display: inline-flex; }

    .nav-cta { display: none; }

    .hero-section {
      grid-template-columns: 1fr;
      min-height: auto;
      padding: 2.5rem 1.5rem 3rem;
      gap: 2rem;
    }

    .hero-visual {
      order: 2;
    }

    .hero-body {
      font-size: 1.1rem;
    }

    .hero-actions {
      flex-direction: column;
      align-items: stretch;
    }

    .hero-actions .btn-arcade {
      width: 100%;
    }

    .waitlist-form {
      grid-template-columns: 1fr;
    }

    .bot-card {
      height: auto;
      min-height: 440px;
      transform: rotate(2deg);
    }

    .decor { opacity: 0.3; }

    .section-config,
    .section-arena {
      padding: 4rem 1.5rem;
    }

    .leaderboard-container {
      padding: 1.5rem;
    }
  }

  @media (max-width: 700px) {
    .parts-grid { grid-template-columns: 1fr; }

    .rank-row {
      grid-template-columns: 0.6fr 1.6fr 1fr 1fr;
      font-size: 1rem;
      gap: 0.5rem;
    }

    .ticker-wrap { padding: 0.8rem 0; }

    footer {
      padding: 3rem 1.5rem;
    }
  }

  @media (max-width: 520px) {
    .hero-section { padding: 2rem 1.2rem 2.5rem; }
    .hero-h1 { letter-spacing: 1px; }
    .panel-skew { padding: 1.5rem; }
    .waitlist-label { font-size: 1rem; }
  }
`;

const STRIPE_FOUNDER_URL = import.meta.env.PUBLIC_STRIPE_FOUNDER_URL || '';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const postJson = async (url, payload) => {
  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
  } catch {
    // best-effort tracking only
  }
};

// ─── Reusable Components ───────────────────────────────────────────────────────

const StatBar = ({ label, value, pct, color }) => {
  const [width, setWidth] = useState('0%');
  useEffect(() => {
    const timer = setTimeout(() => setWidth(pct), 100);
    return () => clearTimeout(timer);
  }, [pct]);

  return (
    <div className="stat-bar">
      <div className="stat-label">
        <span>{label}</span>
        <span>{value}</span>
      </div>
      <div className="bar-container">
        <div className="bar-fill" style={{ width, background: color || 'var(--c-yellow)' }} />
      </div>
    </div>
  );
};

const BotCard = () => (
  <div className="bot-card">
    <div className="bot-header">
      <div className="bot-face">
        <div className="eye" />
        <div className="eye" />
      </div>
    </div>
    <div className="bot-body">
      <h2 style={{ fontSize: '2.5rem', marginBottom: '1.5rem', transform: 'skewX(-5deg)' }}>RUMBLE-V4</h2>
      <StatBar label="Aggression" value="92%" pct="92%" color="var(--c-red)" />
      <StatBar label="Armor" value="65%" pct="65%" color="var(--c-yellow)" />
      <StatBar label="Compute Speed" value="88%" pct="88%" color="var(--c-cyan)" />
      <div style={{ marginTop: '2rem', padding: '1rem', background: '#eee', borderRadius: '8px', fontWeight: 'bold', fontFamily: 'monospace' }}>
        &gt; SYSTEM: TARGET ACQUIRED<br />
        &gt; LOGIC: FLANK_LEFT<br />
        &gt; STATUS: CHARGING CANNON...
      </div>
    </div>
  </div>
);

const PartCard = ({ emoji, bgColor, emojiColor, tag, title, desc, stat, price, onAdd }) => {
  const [added, setAdded] = useState(false);

  const handleAdd = () => {
    setAdded(true);
    onAdd && onAdd(title);
    setTimeout(() => setAdded(false), 1500);
  };

  return (
    <div className="part-card" onClick={handleAdd}>
      <div className="part-img" style={{ background: bgColor, color: emojiColor }}>{emoji}</div>
      <div className="part-info">
        <span className="tag">{tag}</span>
        <h3 className="part-title">{title}</h3>
        <p>{desc}</p>
        <div style={{ marginTop: '1rem', display: 'flex', justifyContent: 'space-between', fontWeight: '800' }}>
          <span>{stat}</span>
          <span style={{ color: 'var(--c-red)' }}>{price}</span>
        </div>
        {added && (
          <div style={{ marginTop: '0.5rem', color: '#00E676', fontWeight: 900, fontSize: '0.9rem' }}>
            ✓ Added to loadout!
          </div>
        )}
      </div>
    </div>
  );
};

const RankRow = ({ rank, rankBg, rankColor, name, winRate, status, isOnline }) => (
  <div className="rank-row">
    <div className="rank-num" style={{ background: rankBg || 'var(--c-dark)', color: rankColor || 'var(--c-white)' }}>{rank}</div>
    <div>{name}</div>
    <div style={{ color: 'var(--c-red)' }}>{winRate}</div>
    <div>
      {isOnline && <span className="status-dot" />}
      {status}
    </div>
  </div>
);

// ─── Navigation ────────────────────────────────────────────────────────────────

const NavBar = ({ onNavClick }) => {
  const [playPressed, setPlayPressed] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const handlePlay = () => {
    setPlayPressed(true);
    setTimeout(() => setPlayPressed(false), 300);
    onNavClick('hero');
    setMenuOpen(false);
  };

  const handleNav = (section) => {
    onNavClick(section);
    setMenuOpen(false);
  };

  return (
    <nav className="cog-nav">
      <div className="logo" onClick={() => handleNav('hero')} style={{ cursor: 'pointer' }}>COG CAGE</div>
      <div className="nav-links">
        {[['Builder', 'build'], ['Arena', 'arena'], ['Marketplace', 'build'], ['Guide', 'hero']].map(([label, section]) => (
          <button key={label} className="nav-link" onClick={() => handleNav(section)}>{label}</button>
        ))}
      </div>
      <div className="nav-controls">
        <button
          className={`btn-arcade nav-cta${playPressed ? ' pressed' : ''}`}
          style={{ fontSize: '1rem', padding: '0.8rem 2rem' }}
          onClick={handlePlay}
        >
          Play Now
        </button>
        <button
          className="nav-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          onClick={() => setMenuOpen(open => !open)}
        >
          <span>{menuOpen ? '✕' : '☰'}</span>
        </button>
      </div>
      <div className={`nav-mobile ${menuOpen ? 'open' : ''}`}>
        {[['Builder', 'build'], ['Arena', 'arena'], ['Marketplace', 'build'], ['Guide', 'hero']].map(([label, section]) => (
          <button key={label} className="nav-link" onClick={() => handleNav(section)}>{label}</button>
        ))}
        <button
          className="btn-arcade"
          style={{ fontSize: '1rem', padding: '0.8rem 2rem', width: '100%' }}
          onClick={handlePlay}
        >
          Play Now
        </button>
      </div>
    </nav>
  );
};

// ─── Sections ─────────────────────────────────────────────────────────────────

const HeroSection = ({ sectionRef }) => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const savedEmail = localStorage.getItem('cogcage_email');
    if (savedEmail) setEmail(savedEmail);
    postJson('/api/events', { event: 'landing_view', source: 'hero', page: '/' });
  }, []);

  const submitWaitlist = async (event) => {
    event?.preventDefault();
    if (status === 'loading') return;

    const trimmed = email.trim();
    if (!trimmed) {
      setStatus('error');
      setMessage('Enter your email to join the beta.');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setMessage('Please use a valid email address.');
      return;
    }

    setStatus('loading');
    setMessage('');

    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: trimmed,
          game: 'Unspecified',
          source: 'cogcage-hero'
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || 'Something went wrong. Try again.');
      }
      localStorage.setItem('cogcage_email', trimmed.toLowerCase());
      await postJson('/api/events', {
        event: 'waitlist_joined',
        source: 'hero',
        email: trimmed.toLowerCase(),
        page: '/',
      });
      setStatus('success');
      setMessage('You are on the list. Watch for your invite.');
      setEmail('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : 'Something went wrong. Try again.');
    }
  };

  const handleFounderCheckout = async () => {
    const trimmed = email.trim() || localStorage.getItem('cogcage_email') || '';
    if (!EMAIL_RE.test(trimmed)) {
      setStatus('error');
      setMessage('Add your email first so we can reserve your founder slot.');
      return;
    }

    localStorage.setItem('cogcage_email', trimmed.toLowerCase());
    await postJson('/api/events', {
      event: 'founder_checkout_clicked',
      source: 'hero',
      email: trimmed.toLowerCase(),
      tier: 'founder',
      page: '/',
    });
    await postJson('/api/founder-intent', {
      email: trimmed.toLowerCase(),
      source: 'hero-founder-checkout',
    });

    if (STRIPE_FOUNDER_URL) {
      const target = new URL(STRIPE_FOUNDER_URL, window.location.origin);
      target.searchParams.set('prefilled_email', trimmed.toLowerCase());
      window.location.href = target.toString();
      return;
    }

    setStatus('error');
    setMessage('Founder checkout link not configured yet.');
  };

  return (
    <section className="hero-section" ref={sectionRef} id="hero">
      <div className="decor circle-decor" />
      <div className="decor plus-decor">+</div>

      <div className="hero-content">
        <div className="panel-skew" style={{ display: 'inline-block', marginBottom: '2rem', background: 'var(--c-yellow)' }}>
          <div className="panel-content-unskew">
            <span style={{ fontWeight: 900, textTransform: 'uppercase', fontSize: '1.2rem' }}>Season 4 is Live!</span>
          </div>
        </div>
        <h1 className="hero-h1 text-stroke">
          PROGRAM.<br />
          <span style={{ color: 'var(--c-red)', WebkitTextStroke: '0' }}>FIGHT.</span><br />
          DOMINATE.
        </h1>
        <p className="hero-body">
          Construct the ultimate LLM-powered combatant. Configure weaponry, optimize logic gates, and bet on the outcome in real-time neural battles.
        </p>
        <div className="panel-skew hero-waitlist" style={{ background: 'var(--c-white)' }}>
          <div className="panel-content-unskew">
            <div className="waitlist-label">Join the beta waitlist</div>
            <form className="waitlist-form" onSubmit={submitWaitlist}>
              <input
                className="waitlist-input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@domain.com"
                autoComplete="email"
                aria-label="Email address"
              />
              <button
                className="btn-arcade red"
                style={{ fontSize: '1rem', padding: '0.85rem 1.6rem' }}
                type="submit"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
            <div className="waitlist-message" role="status" aria-live="polite" style={{ color: status === 'error' ? 'var(--c-red)' : '#00C853' }}>
              {message}
            </div>
            <div className="waitlist-hint">Early access invites, creator perks, and arena updates.</div>
          </div>
        </div>
        <div className="hero-actions">
          <button className="btn-arcade red" type="button" onClick={handleFounderCheckout}>Reserve Founder Spot</button>
          <button className="btn-arcade" style={{ background: 'var(--c-white)' }} type="button">Watch Live</button>
        </div>
      </div>

      <div className="hero-visual">
        <BotCard />
      </div>
    </section>
  );
};

const TickerSection = () => {
  const items = [
    { id: 1, content: <><span>USER </span><span className="accent-text">SKULLCRUSHER</span> WON 500 CREDITS ON MATCH #8842</> },
    { id: 2, content: <><span>// NEW CHAMPION CROWNED: </span><span className="accent-text">NEURAL_KNIGHT</span></> },
    { id: 3, content: <span>ODDS SHIFTING FOR NEXT BOUT: RED CORNER +250</span> },
    { id: 4, content: <><span>MARKET ALERT: </span><span className="accent-text">PLASMA CANNON</span> PRICES UP 15%</> },
    { id: 5, content: <><span>USER </span><span className="accent-text">SKULLCRUSHER</span> WON 500 CREDITS ON MATCH #8842</> },
    { id: 6, content: <><span>// NEW CHAMPION CROWNED: </span><span className="accent-text">NEURAL_KNIGHT</span></> },
    { id: 7, content: <span>ODDS SHIFTING FOR NEXT BOUT: RED CORNER +250</span> },
    { id: 8, content: <><span>MARKET ALERT: </span><span className="accent-text">PLASMA CANNON</span> PRICES UP 15%</> },
  ];

  return (
    <div className="ticker-wrap">
      <div className="ticker">
        {items.map(item => (
          <div key={item.id} className="ticker-item">{item.content}</div>
        ))}
      </div>
    </div>
  );
};

const BuildSection = ({ sectionRef }) => {
  const [toast, setToast] = useState(null);

  const showToast = (name) => {
    setToast(`${name} added to your loadout!`);
    setTimeout(() => setToast(null), 2000);
  };

  const parts = [
    { emoji: '⚡', bgColor: '#FFF3CD', emojiColor: '#FFD600', tag: 'WEAPON', title: 'Volt Smasher', desc: 'High voltage melee attachment. Stuns enemy logic gates for 0.5s on impact.', stat: 'DMG: 85', price: '350 CR' },
    { emoji: '🛡️', bgColor: '#D1F2EB', emojiColor: '#00E5FF', tag: 'ARMOR', title: 'Titan Plating', desc: 'Reinforced tungsten alloy. Reduces incoming kinetic damage by 40%.', stat: 'DEF: 120', price: '500 CR' },
    { emoji: '🧠', bgColor: '#FADBD8', emojiColor: '#EB4D4B', tag: 'MODEL', title: 'GPT-Tactician', desc: 'Fine-tuned for strategic dominance. Predicts enemy movement with 88% accuracy.', stat: 'IQ: 200', price: '1200 CR' },
  ];

  return (
    <section className="section-config" ref={sectionRef} id="build">
      {toast && (
        <div style={{
          position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
          background: 'var(--c-dark)', color: '#00E676', padding: '1rem 2rem',
          borderRadius: '50px', fontWeight: 900, zIndex: 9999,
          border: '3px solid #00E676', fontSize: '1rem',
          animation: 'none'
        }}>
          ✓ {toast}
        </div>
      )}
      <div className="section-header">
        <h2>BUILD YOUR CHAMPION</h2>
        <p style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Equip lethal hardware &amp; train your neural net.</p>
      </div>
      <div className="parts-grid">
        {parts.map(p => (
          <PartCard key={p.title} {...p} onAdd={showToast} />
        ))}
      </div>
    </section>
  );
};

const ArenaSection = ({ sectionRef }) => {
  const [showFull, setShowFull] = useState(false);

  const extraRows = [
    { rank: 5, name: 'IronFist_7', winRate: '85.3%', status: 'In Combat', isOnline: true },
    { rank: 6, name: 'OMEGA_PRIME', winRate: '82.1%', status: 'Waiting...', isOnline: false },
    { rank: 7, name: 'RustBucket3000', winRate: '79.9%', status: 'Repairing', isOnline: false },
    { rank: 8, name: 'SteelPhantom', winRate: '77.4%', status: 'In Combat', isOnline: true },
  ];

  return (
    <section className="section-arena" ref={sectionRef} id="arena">
      <div className="section-header" style={{ marginBottom: '2rem' }}>
        <h2 className="text-stroke" style={{ color: 'var(--c-white)', textShadow: '4px 4px 0 var(--c-dark)' }}>LIVE RANKINGS</h2>
      </div>

      <div className="leaderboard-container">
        <div className="rank-row">
          <div className="rank-head">Rank</div>
          <div className="rank-head">Bot Name</div>
          <div className="rank-head">Win Rate</div>
          <div className="rank-head">Status</div>
        </div>

        <RankRow rank="1" rankBg="var(--c-yellow)" rankColor="var(--c-dark)" name="MECHA_GODZILLA_V9" winRate="98.4%" status="In Combat" isOnline={true} />
        <RankRow rank="2" rankBg="#C0C0C0" rankColor="var(--c-dark)" name="DeepBlue_Revenge" winRate="94.1%" status="Waiting..." isOnline={false} />
        <RankRow rank="3" rankBg="#CD7F32" rankColor="var(--c-white)" name="NullPointerEx" winRate="91.8%" status="In Combat" isOnline={true} />
        <RankRow rank="4" rankBg="var(--c-dark)" rankColor="var(--c-white)" name="Chaos_Engine" winRate="88.2%" status="Repairing" isOnline={false} />

        {showFull && extraRows.map(row => (
          <RankRow key={row.rank} rank={String(row.rank)} name={row.name} winRate={row.winRate} status={row.status} isOnline={row.isOnline} />
        ))}

        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button className="btn-arcade" onClick={() => setShowFull(v => !v)}>
            {showFull ? 'Collapse Ladder' : 'View Full Ladder'}
          </button>
        </div>
      </div>
    </section>
  );
};

const FooterSection = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmed = email.trim();
    if (!trimmed) {
      setError('Please enter your email!');
      return;
    }
    if (!EMAIL_RE.test(trimmed)) {
      setError('Invalid email address.');
      return;
    }

    setError('');
    try {
      const response = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email: trimmed, game: 'Unspecified', source: 'cogcage-footer' }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.error || 'Could not create account.');
      }
      localStorage.setItem('cogcage_email', trimmed.toLowerCase());
      await postJson('/api/events', { event: 'waitlist_joined', source: 'footer', page: '/', email: trimmed.toLowerCase() });
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account.');
    }
  };

  return (
    <footer style={{ background: 'var(--c-dark)', color: 'var(--c-white)', padding: '4rem', textAlign: 'center' }}>
      <h2 style={{ fontFamily: 'var(--f-display)', marginBottom: '1rem' }}>READY TO RUMBLE?</h2>
      <p style={{ marginBottom: '2rem', opacity: 0.7 }}>Join 15,000+ engineers in the arena.</p>

      {!submitted ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="Enter your email..."
            style={{
              padding: '0.8rem 1.5rem',
              border: '3px solid var(--c-yellow)',
              borderRadius: '50px',
              fontSize: '1rem',
              fontFamily: 'var(--f-body)',
              fontWeight: 700,
              background: 'rgba(255,255,255,0.1)',
              color: '#fff',
              outline: 'none',
              width: '300px',
              textAlign: 'center'
            }}
            onKeyDown={e => e.key === 'Enter' && handleCreate()}
          />
          {error && <p style={{ color: 'var(--c-red)', fontWeight: 800 }}>{error}</p>}
          <button className="btn-arcade red" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }} onClick={handleCreate}>
            Create Account
          </button>
        </div>
      ) : (
        <div style={{ color: '#00E676', fontWeight: 900, fontSize: '1.5rem', fontFamily: 'var(--f-display)' }}>
          ✓ WELCOME TO THE ARENA, ENGINEER!
        </div>
      )}

      <div style={{ marginTop: '4rem', fontSize: '0.8rem', opacity: 0.5 }}>
        © 2023 Cog Cage eSports League. All bots are simulated.
      </div>
    </footer>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────

const HomePage = () => {
  const heroRef = useRef(null);
  const buildRef = useRef(null);
  const arenaRef = useRef(null);

  const scrollTo = (section) => {
    const map = { hero: heroRef, build: buildRef, arena: arenaRef };
    map[section]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <NavBar onNavClick={scrollTo} />
      <HeroSection sectionRef={heroRef} />
      <TickerSection />
      <BuildSection sectionRef={buildRef} />
      <ArenaSection sectionRef={arenaRef} />
      <FooterSection />
    </>
  );
};

// ─── App ───────────────────────────────────────────────────────────────────────

const App = () => {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <Router basename="/">
      <div className="bg-mesh" />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<HomePage />} />
      </Routes>
    </Router>
  );
};

export default App;
