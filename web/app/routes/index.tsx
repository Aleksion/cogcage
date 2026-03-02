import { createFileRoute, Link } from '@tanstack/react-router'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:wght@400;600;700;800;900&family=IBM+Plex+Mono:wght@400;600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  .brine-root {
    min-height: 100vh;
    background:
      radial-gradient(ellipse at 30% 60%, rgba(0,229,255,0.04) 0%, transparent 50%),
      radial-gradient(ellipse at 70% 20%, rgba(0,229,255,0.03) 0%, transparent 40%),
      #050510;
    color: #f0f0f5;
    font-family: 'Kanit', sans-serif;
    overflow-x: hidden;
    position: relative;
  }

  /* Dot grid overlay — The Brine substrate */
  .brine-root::before {
    content: '';
    position: fixed;
    inset: 0;
    background-image: radial-gradient(circle, rgba(0,229,255,0.07) 1px, transparent 1px);
    background-size: 28px 28px;
    pointer-events: none;
    z-index: 0;
  }

  /* ── NAV ── */
  .brine-nav {
    position: fixed;
    top: 0; left: 0; right: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.25rem 2.5rem;
    background: rgba(5,5,16,0.85);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(0,229,255,0.12);
    z-index: 100;
  }

  .brine-wordmark {
    font-family: 'Bangers', cursive;
    font-size: 1.5rem;
    color: #00E5FF;
    text-decoration: none;
    letter-spacing: 2px;
    text-shadow: 0 0 20px rgba(0,229,255,0.4);
  }

  .brine-descend-nav {
    font-family: 'Kanit', sans-serif;
    font-size: 0.85rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1.5px;
    color: #050510;
    background: #00E5FF;
    border: none;
    padding: 0.5rem 1.4rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: box-shadow 0.15s, transform 0.1s;
  }
  .brine-descend-nav:hover {
    box-shadow: 0 0 18px rgba(0,229,255,0.5);
    transform: translateY(-1px);
  }

  /* ── HERO ── */
  .brine-hero {
    position: relative;
    z-index: 1;
    min-height: 100vh;
    display: flex;
    align-items: center;
    padding: 0 2.5rem;
    max-width: 1280px;
    margin: 0 auto;
    gap: 4rem;
  }

  .brine-hero-text {
    flex: 1;
    max-width: 580px;
    padding-top: 80px;
  }

  .brine-eyebrow {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #00E5FF;
    opacity: 0.7;
    margin-bottom: 1.5rem;
  }

  .brine-headline {
    font-family: 'Bangers', cursive;
    font-size: clamp(3rem, 6vw, 5.5rem);
    line-height: 0.95;
    letter-spacing: 2px;
    color: #ffffff;
    text-shadow: 0 0 40px rgba(0,229,255,0.15);
    margin-bottom: 1.5rem;
  }

  .brine-headline span {
    color: #00E5FF;
    text-shadow: 0 0 30px rgba(0,229,255,0.6);
  }

  .brine-subhead {
    font-size: 1.1rem;
    font-weight: 400;
    line-height: 1.6;
    color: rgba(240,240,245,0.55);
    margin-bottom: 2.5rem;
    font-style: italic;
  }

  .brine-cta-group {
    display: flex;
    align-items: center;
    gap: 1.5rem;
    flex-wrap: wrap;
  }

  .brine-descend-hero {
    font-family: 'Kanit', sans-serif;
    font-size: 1rem;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 2px;
    color: #050510;
    background: #00E5FF;
    border: none;
    padding: 0.85rem 2.5rem;
    cursor: pointer;
    text-decoration: none;
    display: inline-block;
    transition: box-shadow 0.15s, transform 0.1s;
    clip-path: polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 8px 100%, 0 calc(100% - 8px));
  }
  .brine-descend-hero:hover {
    box-shadow: 0 0 30px rgba(0,229,255,0.6), 0 0 60px rgba(0,229,255,0.2);
    transform: translateY(-2px);
  }

  .brine-secondary-link {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 1px;
    color: rgba(240,240,245,0.35);
    text-decoration: none;
    text-transform: uppercase;
    transition: color 0.15s;
  }
  .brine-secondary-link:hover { color: rgba(240,240,245,0.7); }

  /* ── HERO IMAGE ── */
  .brine-hero-art {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding-top: 80px;
    position: relative;
  }

  .brine-crustie-wrap {
    position: relative;
    width: clamp(280px, 38vw, 520px);
    aspect-ratio: 1;
  }

  /* Bioluminescent glow behind the crustie */
  .brine-crustie-wrap::before {
    content: '';
    position: absolute;
    inset: -20%;
    background: radial-gradient(ellipse, rgba(0,229,255,0.08) 0%, transparent 65%);
    z-index: 0;
    animation: pulse 4s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 0.6; transform: scale(1); }
    50%       { opacity: 1;   transform: scale(1.05); }
  }

  .brine-crustie-img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    position: relative;
    z-index: 1;
    filter: drop-shadow(0 0 24px rgba(0,229,255,0.25)) drop-shadow(0 0 60px rgba(0,229,255,0.1));
    animation: float 6s ease-in-out infinite;
  }

  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-14px); }
  }

  /* ── STATS BAR ── */
  .brine-stats {
    position: relative;
    z-index: 1;
    border-top: 1px solid rgba(0,229,255,0.1);
    border-bottom: 1px solid rgba(0,229,255,0.1);
    background: rgba(0,229,255,0.03);
    padding: 1.5rem 2.5rem;
  }

  .brine-stats-inner {
    max-width: 1280px;
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-around;
    gap: 2rem;
    flex-wrap: wrap;
  }

  .brine-stat {
    text-align: center;
  }

  .brine-stat-value {
    font-family: 'Bangers', cursive;
    font-size: 2rem;
    letter-spacing: 2px;
    color: #00E5FF;
    display: block;
    text-shadow: 0 0 20px rgba(0,229,255,0.4);
  }

  .brine-stat-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(240,240,245,0.35);
    display: block;
    margin-top: 0.2rem;
  }

  /* ── HOW IT WORKS ── */
  .brine-how {
    position: relative;
    z-index: 1;
    padding: 6rem 2.5rem;
    max-width: 1280px;
    margin: 0 auto;
  }

  .brine-section-label {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.7rem;
    font-weight: 600;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: rgba(0,229,255,0.5);
    margin-bottom: 3rem;
  }

  .brine-steps {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 2rem;
  }

  .brine-step {
    border: 1px solid rgba(0,229,255,0.1);
    background: rgba(0,229,255,0.02);
    padding: 2rem;
    position: relative;
  }

  .brine-step::before {
    content: '';
    position: absolute;
    top: 0; left: 0;
    width: 2px;
    height: 100%;
    background: linear-gradient(to bottom, #00E5FF, transparent);
    opacity: 0.3;
  }

  .brine-step-num {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.65rem;
    letter-spacing: 3px;
    color: rgba(0,229,255,0.4);
    display: block;
    margin-bottom: 0.75rem;
  }

  .brine-step-title {
    font-family: 'Bangers', cursive;
    font-size: 1.4rem;
    letter-spacing: 1px;
    color: #ffffff;
    margin-bottom: 0.75rem;
    display: block;
  }

  .brine-step-body {
    font-size: 0.9rem;
    line-height: 1.6;
    color: rgba(240,240,245,0.45);
  }

  /* ── FOOTER ── */
  .brine-footer {
    position: relative;
    z-index: 1;
    border-top: 1px solid rgba(0,229,255,0.08);
    padding: 2rem 2.5rem;
    text-align: center;
  }

  .brine-footer-line {
    font-family: 'IBM Plex Mono', monospace;
    font-size: 0.75rem;
    letter-spacing: 1.5px;
    color: rgba(240,240,245,0.2);
    font-style: italic;
  }

  /* ── RESPONSIVE ── */
  @media (max-width: 768px) {
    .brine-hero {
      flex-direction: column;
      text-align: center;
      gap: 2rem;
      padding-top: 5rem;
      align-items: center;
    }
    .brine-hero-text { padding-top: 0; max-width: 100%; }
    .brine-hero-art  { padding-top: 0; width: 100%; }
    .brine-cta-group { justify-content: center; }
    .brine-headline  { font-size: clamp(2.5rem, 10vw, 4rem); }
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

function IndexPage() {
  return (
    <div className="brine-root">
      {/* NAV */}
      <nav className="brine-nav">
        <Link to="/" className="brine-wordmark">THE MOLT PIT</Link>
        <Link to="/sign-in" className="brine-descend-nav">Descend</Link>
      </nav>

      {/* HERO */}
      <section className="brine-hero">
        <div className="brine-hero-text">
          <p className="brine-eyebrow">Deep Brine Studios · Season 1</p>
          <h1 className="brine-headline">
            Crusties<br />Enter<br />
            <span>The Pit.</span><br />
            Last One<br />Emerges.
          </h1>
          <p className="brine-subhead">
            You build the Molt. Your Crustie does the rest.
          </p>
          <div className="brine-cta-group">
            <Link to="/sign-in" className="brine-descend-hero">Descend</Link>
            <Link to="/demo" className="brine-secondary-link">Watch a Scuttle →</Link>
          </div>
        </div>

        <div className="brine-hero-art">
          <div className="brine-crustie-wrap">
            <img
              src="/crustie-base.png"
              alt="Crustie in combat Molt"
              className="brine-crustie-img"
            />
          </div>
        </div>
      </section>

      {/* STATS */}
      <div className="brine-stats">
        <div className="brine-stats-inner">
          <div className="brine-stat">
            <span className="brine-stat-value">150ms</span>
            <span className="brine-stat-label">Tick Speed</span>
          </div>
          <div className="brine-stat">
            <span className="brine-stat-value">750ms</span>
            <span className="brine-stat-label">Decision Window</span>
          </div>
          <div className="brine-stat">
            <span className="brine-stat-value">40+</span>
            <span className="brine-stat-label">Items in The Pit</span>
          </div>
          <div className="brine-stat">
            <span className="brine-stat-value">1v1 · FFA</span>
            <span className="brine-stat-label">Scuttle Formats</span>
          </div>
        </div>
      </div>

      {/* HOW IT WORKS */}
      <section className="brine-how">
        <p className="brine-section-label">// How It Works</p>
        <div className="brine-steps">
          <div className="brine-step">
            <span className="brine-step-num">01 — CLAIM</span>
            <span className="brine-step-title">Claim Your Crustie</span>
            <p className="brine-step-body">
              Your Crustie lives in The Brine. It has a Ledger. Every Scuttle it survives makes it harder. You are its Chef.
            </p>
          </div>
          <div className="brine-step">
            <span className="brine-step-num">02 — BUILD</span>
            <span className="brine-step-title">Build the Molt</span>
            <p className="brine-step-body">
              Carapace. Claws. Tomalley. Three choices. The Molt will not survive the Scuttle. Build it right anyway.
            </p>
          </div>
          <div className="brine-step">
            <span className="brine-step-num">03 — DESCEND</span>
            <span className="brine-step-title">Enter The Pit</span>
            <p className="brine-step-body">
              Your Crustie's Coral fires in real time. You watch. You cannot intervene. That is the design.
            </p>
          </div>
          <div className="brine-step">
            <span className="brine-step-num">04 — MOLT</span>
            <span className="brine-step-title">Get Harder</span>
            <p className="brine-step-body">
              Win and your Hardness increases. Lose and The Pit records why. Either way your Crustie is not the same creature it was before.
            </p>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="brine-footer">
        <p className="brine-footer-line">
          "The Pit doesn't care about your feelings. The Pit just keeps filling up."
          <br />— The House
        </p>
      </footer>
    </div>
  )
}
