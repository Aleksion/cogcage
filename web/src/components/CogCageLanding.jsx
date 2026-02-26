import React, { useMemo, useState } from 'react';

const founderCheckoutUrl = import.meta.env.PUBLIC_STRIPE_FOUNDER_URL || '';

const globalStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Bangers&family=Kanit:wght@400;700;900&display=swap');

  :root {
    --c-yellow: #FFD600;
    --c-red: #EB4D4B;
    --c-cyan: #00E5FF;
    --c-dark: #111;
    --c-white: #fff;
    --f-display: 'Bangers', display;
    --f-body: 'Kanit', sans-serif;
  }

  * { box-sizing: border-box; }

  body {
    margin: 0;
    font-family: var(--f-body);
    color: var(--c-dark);
    background:
      radial-gradient(circle at 10% 20%, rgba(255,214,0,0.16) 0%, transparent 40%),
      radial-gradient(circle at 90% 80%, rgba(0,229,255,0.12) 0%, transparent 40%),
      #f4f4f6;
  }

  .shell { max-width: 1080px; margin: 0 auto; padding: 1rem 1rem 4rem; }

  .nav { display: flex; justify-content: space-between; align-items: center; gap: 1rem; }

  .logo {
    font-family: var(--f-display);
    font-size: 2.2rem;
    color: var(--c-red);
    text-shadow: 2px 2px 0 var(--c-dark);
    letter-spacing: 1px;
  }

  .hero {
    margin-top: 1rem;
    border: 4px solid var(--c-dark);
    border-radius: 24px;
    background: white;
    padding: clamp(1.2rem, 2vw, 2rem);
    box-shadow: 12px 12px 0 rgba(0,0,0,0.15);
    display: grid;
    grid-template-columns: 1.1fr .9fr;
    gap: 1.5rem;
  }

  h1 {
    font-family: var(--f-display);
    font-size: clamp(2.4rem, 7vw, 5rem);
    line-height: .86;
    margin: 0 0 .75rem;
    text-transform: uppercase;
    color: var(--c-yellow);
    -webkit-text-stroke: 2px var(--c-dark);
  }

  .sub { font-size: 1.1rem; line-height: 1.5; max-width: 560px; }

  .kpis {
    margin-top: 1rem;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: .6rem;
  }

  .kpi {
    border: 2px solid var(--c-dark);
    border-radius: 12px;
    padding: .6rem;
    background: #fffdf2;
  }

  .kpi strong { display: block; font-size: .8rem; text-transform: uppercase; }
  .kpi span { font-size: 1.2rem; font-weight: 900; }

  .card {
    border: 4px solid var(--c-dark);
    border-radius: 18px;
    padding: 1rem;
    background: linear-gradient(145deg, #fff 0%, #f6faff 100%);
    align-self: start;
  }

  .card h2 {
    margin: 0 0 .6rem;
    font-family: var(--f-display);
    letter-spacing: 1px;
    font-size: 2rem;
    color: var(--c-red);
  }

  .field {
    display: grid;
    gap: .35rem;
    margin-bottom: .7rem;
  }

  input, select {
    border: 2px solid var(--c-dark);
    border-radius: 10px;
    padding: .65rem .7rem;
    font-size: 1rem;
    font-family: var(--f-body);
    background: white;
  }

  .btn {
    width: 100%;
    border: 3px solid var(--c-dark);
    border-radius: 999px;
    padding: .7rem .9rem;
    font-size: 1rem;
    font-weight: 900;
    cursor: pointer;
    background: var(--c-yellow);
    box-shadow: 0 5px 0 var(--c-dark);
  }

  .btn:disabled { opacity: .6; cursor: not-allowed; }

  .btn.alt { margin-top: .5rem; background: var(--c-red); color: white; }

  .msg { margin-top: .6rem; font-size: .9rem; }

  .fine { margin-top: .5rem; font-size: .76rem; opacity: .8; line-height: 1.4; }

  .proof {
    margin-top: 1rem;
    border: 3px solid var(--c-dark);
    border-radius: 16px;
    background: #0f1118;
    color: #d9ddff;
    padding: .85rem;
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, monospace;
    font-size: .8rem;
  }

  @media (max-width: 900px) {
    .hero { grid-template-columns: 1fr; }
  }
`;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function track(event, payload = {}) {
  return fetch('/api/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ event, ...payload }),
    keepalive: true,
  }).catch(() => undefined);
}

export default function CogCageLanding() {
  const [email, setEmail] = useState('');
  const [game, setGame] = useState('');
  const [state, setState] = useState({ saving: false, msg: '' });

  const canSubmit = useMemo(() => EMAIL_RE.test(email.trim()) && game.trim().length > 1, [email, game]);

  async function submitWaitlist(e) {
    e.preventDefault();
    if (!canSubmit || state.saving) return;

    const normalized = email.trim().toLowerCase();
    setState({ saving: true, msg: '' });

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: normalized, game: game.trim(), source: 'hero-waitlist' }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to join waitlist');

      localStorage.setItem('cogcage_email', normalized);
      await track('waitlist_joined', { email: normalized, source: 'hero-waitlist', page: '/' });

      setState({ saving: false, msg: '✅ You are on the alpha waitlist.' });
    } catch (err) {
      setState({ saving: false, msg: `⚠️ ${err instanceof Error ? err.message : 'Try again in a minute.'}` });
    }
  }

  async function startFounderCheckout() {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setState((s) => ({ ...s, msg: '⚠️ Enter a valid email before founder checkout.' }));
      return;
    }

    localStorage.setItem('cogcage_email', normalized);

    await fetch('/api/founder-intent', {
      method: 'POST',
      headers: { 'content-type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ email: normalized, source: 'hero-founder-cta' }),
      keepalive: true,
    }).catch(() => undefined);

    await track('founder_checkout_clicked', {
      email: normalized,
      tier: 'founder',
      source: 'hero-founder-cta',
      href: founderCheckoutUrl || undefined,
      page: '/',
    });

    if (!founderCheckoutUrl) {
      setState((s) => ({ ...s, msg: '⚠️ Founder checkout link not configured yet.' }));
      return;
    }

    const joiner = founderCheckoutUrl.includes('?') ? '&' : '?';
    window.location.href = `${founderCheckoutUrl}${joiner}prefilled_email=${encodeURIComponent(normalized)}`;
  }

  return (
    <>
      <style>{globalStyles}</style>
      <main className="shell">
        <header className="nav">
          <div className="logo">COG CAGE</div>
          <div><strong>AI Skill Arena</strong></div>
        </header>

        <section className="hero" id="join">
          <div>
            <h1>Code. Compete. Cash Out.</h1>
            <p className="sub">
              CogCage is building paid AI skill ladders where players tune model strategy and compete for cash prizes.
              Join alpha now and secure a founder slot before public launch.
            </p>

            <div className="kpis">
              <div className="kpi"><strong>Target</strong><span>$10/day by Day 30</span></div>
              <div className="kpi"><strong>Offer</strong><span>Founder Access</span></div>
              <div className="kpi"><strong>Loop</strong><span>Weekly Revenue Tests</span></div>
            </div>

            <div className="proof">
              monetization_hypothesis: Email-first founder checkout increases paid conversion by reducing checkout friction.
            </div>
          </div>

          <aside className="card">
            <h2>Get Early Access</h2>
            <form onSubmit={submitWaitlist}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </label>
              <label className="field">
                <span>Main game you play</span>
                <select value={game} onChange={(e) => setGame(e.target.value)} required>
                  <option value="">Choose one…</option>
                  <option value="League of Legends">League of Legends</option>
                  <option value="Valorant">Valorant</option>
                  <option value="CS2">CS2</option>
                  <option value="Dota 2">Dota 2</option>
                  <option value="Rocket League">Rocket League</option>
                  <option value="Other">Other</option>
                </select>
              </label>

              <button className="btn" type="submit" disabled={!canSubmit || state.saving}>
                {state.saving ? 'Saving…' : 'Join Alpha Waitlist'}
              </button>
            </form>

            <button className="btn alt" type="button" onClick={startFounderCheckout}>
              Reserve Founder Spot
            </button>

            {state.msg && <div className="msg">{state.msg}</div>}
            <p className="fine">Founder checkout pre-fills your email and logs intent for follow-up if checkout is abandoned.</p>
          </aside>
        </section>
      </main>
    </>
  );
}
