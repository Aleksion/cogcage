import React, { useState, useEffect, useRef } from 'react';

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
  }

  .btn-arcade:active {
    transform: translateY(6px);
    box-shadow: 0 0 0 var(--c-dark);
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

  .nav-link {
    font-weight: 800;
    text-transform: uppercase;
    text-decoration: none;
    color: var(--c-dark);
    font-size: 1.1rem;
    cursor: pointer;
    background: none;
    border: none;
    font-family: var(--f-body);
  }

  .hero-section {
    display: grid;
    grid-template-columns: 1.2fr 1fr;
    min-height: 85vh;
    padding: 0 4rem;
    align-items: center;
    position: relative;
    overflow: hidden;
  }

  .hero-h1 {
    font-size: 7rem;
    line-height: 0.85;
    margin-bottom: 1.5rem;
    transform: rotate(-2deg);
  }

  .hero-visual { display:flex; justify-content:center; align-items:center; }

  .bot-card {
    width: 400px;
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

  .bot-body { padding: 2rem; flex-grow:1; background: repeating-linear-gradient(45deg, #fff, #fff 10px, #f4f4f4 10px, #f4f4f4 20px); }
  .stat-bar { margin-bottom: 1rem; }
  .stat-label { font-weight:900; text-transform:uppercase; font-size:.9rem; margin-bottom:.2rem; display:flex; justify-content:space-between; }
  .bar-container { height:20px; background:#ddd; border:2px solid var(--c-dark); border-radius:10px; overflow:hidden; }
  .bar-fill { height:100%; position:relative; transition:width 1s ease-out; }

  .ticker-wrap { width:100%; background:var(--c-dark); color:var(--c-yellow); padding:1rem 0; overflow:hidden; white-space:nowrap; border-top:4px solid var(--c-yellow); border-bottom:4px solid var(--c-yellow); transform:rotate(-1deg) scale(1.01); }
  .ticker { display:inline-block; animation:ticker 20s linear infinite; }
  .ticker-item { display:inline-block; padding:0 2rem; font-size:1.2rem; font-weight:800; font-family:var(--f-display); letter-spacing:1px; }

  .section-config { padding: 6rem 4rem; }
  .section-header { text-align:center; margin-bottom:4rem; }
  .section-header h2 { font-size:5rem; color:var(--c-yellow); -webkit-text-stroke:3px var(--c-dark); text-shadow:5px 5px 0 var(--c-dark); }
  .parts-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:2rem; max-width:1200px; margin:0 auto; }
  .part-card { background:var(--c-white); border:4px solid var(--c-dark); border-radius:20px; overflow:hidden; transition:transform .2s; cursor:pointer; }
  .part-card:hover { transform: translateY(-10px) rotate(1deg); box-shadow:10px 10px 0 var(--c-cyan); }
  .part-img { height:180px; display:flex; align-items:center; justify-content:center; border-bottom:4px solid var(--c-dark); font-size:4rem; }
  .part-info { padding:1.5rem; }

  .section-arena { background: var(--c-yellow); padding:6rem 4rem; border-top:5px solid var(--c-dark); border-bottom:5px solid var(--c-dark); }
  .leaderboard-container { max-width:1000px; margin:0 auto; background:var(--c-white); border:5px solid var(--c-dark); border-radius:10px; box-shadow:15px 15px 0 rgba(0,0,0,.8); padding:2rem; }
  .rank-row { display:grid; grid-template-columns:.5fr 2fr 1fr 1fr; padding:1rem; border-bottom:2px solid #eee; align-items:center; font-weight:800; font-size:1.2rem; }

  @keyframes ticker { 0% { transform: translateX(0%);} 100% { transform: translateX(-50%);} }
  @keyframes blink { 0%,90%,100% { transform:scaleY(1);} 95% { transform:scaleY(0.1);} }
`;

const StatBar = ({ label, value, pct, color }) => {
  const [width, setWidth] = useState('0%');
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 100);
    return () => clearTimeout(t);
  }, [pct]);
  return (
    <div className="stat-bar">
      <div className="stat-label"><span>{label}</span><span>{value}</span></div>
      <div className="bar-container"><div className="bar-fill" style={{ width, background: color || 'var(--c-yellow)' }} /></div>
    </div>
  );
};

const BotCard = () => (
  <div className="bot-card">
    <div className="bot-header"><div className="bot-face"><div className="eye" /><div className="eye" /></div></div>
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

const HomePage = () => {
  const heroRef = useRef(null);
  const buildRef = useRef(null);
  const arenaRef = useRef(null);
  const [toast, setToast] = useState(null);

  const scrollTo = (section) => {
    const map = { hero: heroRef, build: buildRef, arena: arenaRef };
    map[section]?.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const parts = [
    { emoji: '⚡', bgColor: '#FFF3CD', tag: 'WEAPON', title: 'Volt Smasher', desc: 'High voltage melee attachment.', stat: 'DMG: 85', price: '350 CR' },
    { emoji: '🛡️', bgColor: '#D1F2EB', tag: 'ARMOR', title: 'Titan Plating', desc: 'Reinforced tungsten alloy.', stat: 'DEF: 120', price: '500 CR' },
    { emoji: '🧠', bgColor: '#FADBD8', tag: 'MODEL', title: 'GPT-Tactician', desc: 'Fine-tuned for strategic dominance.', stat: 'IQ: 200', price: '1200 CR' },
  ];

  const onAdd = (name) => {
    setToast(`${name} added to your loadout!`);
    setTimeout(() => setToast(null), 1400);
  };

  return (
    <>
      <nav className="cog-nav">
        <div className="logo" onClick={() => scrollTo('hero')} style={{ cursor: 'pointer' }}>COG CAGE</div>
        <div className="nav-links">
          <button className="nav-link" onClick={() => scrollTo('build')}>Builder</button>
          <button className="nav-link" onClick={() => scrollTo('arena')}>Arena</button>
          <button className="nav-link" onClick={() => scrollTo('build')}>Marketplace</button>
          <button className="nav-link" onClick={() => scrollTo('hero')}>Guide</button>
        </div>
        <button className="btn-arcade" style={{ fontSize: '1rem', padding: '0.8rem 2rem' }} onClick={() => scrollTo('hero')}>Play Now</button>
      </nav>

      <section className="hero-section" ref={heroRef} id="hero">
        <div>
          <h1 className="hero-h1 text-stroke">CODE.<br /><span style={{ color: 'var(--c-red)', WebkitTextStroke: '0' }}>COMPETE.</span><br />CASH OUT.</h1>
          <p style={{ fontSize: '1.4rem', maxWidth: '560px', marginBottom: '2rem', fontWeight: 500, lineHeight: 1.5 }}>
            Build your LLM fighter. Tune strategy, loadouts, and model behavior. Enter skill-based arena battles and win prize pools.
          </p>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button className="btn-arcade red">Join Alpha</button>
            <button className="btn-arcade" style={{ background: 'var(--c-white)' }}>Watch Replay</button>
          </div>
        </div>
        <div className="hero-visual"><BotCard /></div>
      </section>

      <div className="ticker-wrap"><div className="ticker">
        <div className="ticker-item">USER SKULLCRUSHER WON 500 CREDITS ON MATCH #8842</div>
        <div className="ticker-item">NEW CHAMPION CROWNED: NEURAL_KNIGHT</div>
        <div className="ticker-item">PRIZE POOL UPDATED: $4,200 LIVE</div>
        <div className="ticker-item">META UPDATE: TITAN PLATING PICK RATE +15%</div>
      </div></div>

      <section className="section-config" ref={buildRef} id="build">
        {toast && <div style={{ position:'fixed', bottom:'2rem', left:'50%', transform:'translateX(-50%)', background:'var(--c-dark)', color:'#00E676', padding:'1rem 2rem', borderRadius:'50px', fontWeight:900, zIndex:9999 }}>✓ {toast}</div>}
        <div className="section-header"><h2>BUILD YOUR CHAMPION</h2></div>
        <div className="parts-grid">
          {parts.map((p) => (
            <div className="part-card" key={p.title} onClick={() => onAdd(p.title)}>
              <div className="part-img" style={{ background: p.bgColor }}>{p.emoji}</div>
              <div className="part-info">
                <h3>{p.title}</h3>
                <p>{p.desc}</p>
                <div style={{ marginTop: '1rem', display:'flex', justifyContent:'space-between', fontWeight:800 }}><span>{p.stat}</span><span style={{ color:'var(--c-red)' }}>{p.price}</span></div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="section-arena" ref={arenaRef} id="arena">
        <div className="section-header"><h2 className="text-stroke" style={{ color:'var(--c-white)' }}>LIVE RANKINGS</h2></div>
        <div className="leaderboard-container">
          <div className="rank-row"><div>Rank</div><div>Bot Name</div><div>Win Rate</div><div>Status</div></div>
          <div className="rank-row"><div>1</div><div>MECHA_GODZILLA_V9</div><div>98.4%</div><div>In Combat</div></div>
          <div className="rank-row"><div>2</div><div>DeepBlue_Revenge</div><div>94.1%</div><div>Waiting...</div></div>
          <div className="rank-row"><div>3</div><div>NullPointerEx</div><div>91.8%</div><div>In Combat</div></div>
        </div>
      </section>

      <footer style={{ background:'var(--c-dark)', color:'var(--c-white)', padding:'4rem', textAlign:'center' }}>
        <h2 style={{ fontFamily:'var(--f-display)', marginBottom:'1rem' }}>READY TO RUMBLE?</h2>
        <p style={{ opacity:0.7 }}>Join 15,000+ engineers in the arena.</p>
        <p style={{ marginTop:'1rem', opacity:0.7, fontSize:'0.9rem' }}>Skill-based competition. Real-money features may be unavailable in some regions.</p>
      </footer>
    </>
  );
};

export default function CogCageLanding() {
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = globalStyles;
    document.head.appendChild(style);
    return () => document.head.removeChild(style);
  }, []);

  return (
    <>
      <div className="bg-mesh" />
      <HomePage />
    </>
  );
}
