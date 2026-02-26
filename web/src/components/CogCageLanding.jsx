import React, { useEffect, useMemo, useState } from 'react';

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
    padding: clamp(1.2rem, 2.6vw, 2.3rem);
    box-shadow: 12px 12px 0 rgba(0,0,0,0.15);
    display: grid;
    grid-template-columns: 1fr;
    grid-template-areas:
      "card"
      "copy";
    gap: 1.5rem;
  }

  .hero-copy { grid-area: copy; }
  .hero-card { grid-area: card; }

  .eyebrow {
    display: inline-flex;
    align-items: center;
    gap: .35rem;
    font-weight: 900;
    text-transform: uppercase;
    letter-spacing: 1px;
    font-size: .78rem;
    padding: .35rem .7rem;
    border: 2px solid var(--c-dark);
    border-radius: 999px;
    background: #fff7cc;
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

  .sub { font-size: 1.05rem; line-height: 1.5; max-width: 560px; }

  .steps {
    list-style: none;
    padding: 0;
    margin: 1rem 0 0;
    display: grid;
    gap: .5rem;
  }

  .steps li {
    display: flex;
    gap: .6rem;
    align-items: flex-start;
    font-weight: 700;
  }

  .steps li span {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 26px;
    height: 26px;
    border-radius: 999px;
    border: 2px solid var(--c-dark);
    background: var(--c-cyan);
    font-size: .85rem;
    flex-shrink: 0;
  }

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

  .card p {
    margin: 0 0 .8rem;
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

  @media (min-width: 900px) {
    .hero {
      grid-template-columns: 1.1fr .9fr;
      grid-template-areas: "copy card";
      align-items: start;
    }
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
  const [state, setState] = useState({ saving: false, msg: '' });

  useEffect(() => {
    const cachedEmail = localStorage.getItem('cogcage_email');
    if (cachedEmail && EMAIL_RE.test(cachedEmail)) {
      setEmail(cachedEmail);
    }

    track('landing_view', { page: '/', source: 'hero' });
  }, []);

  const canSubmit = useMemo(() => EMAIL_RE.test(email.trim()), [email]);

  async function submitWaitlist(e) {
    e.preventDefault();
    if (!canSubmit || state.saving) return;

    const normalized = email.trim().toLowerCase();
    setState({ saving: true, msg: '' });

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ email: normalized, game: 'Unspecified', source: 'hero-waitlist' }),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Failed to join waitlist');

      localStorage.setItem('cogcage_email', normalized);
      await track('waitlist_joined', { email: normalized, source: 'hero-waitlist', page: '/' });

      setState({ saving: false, msg: 'You are on the alpha waitlist.' });
    } catch (err) {
      setState({ saving: false, msg: `Error: ${err instanceof Error ? err.message : 'Try again in a minute.'}` });
    }
  }

  async function startFounderCheckout() {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setState((s) => ({ ...s, msg: 'Enter a valid email before founder checkout.' }));
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
      setState((s) => ({ ...s, msg: 'Founder checkout link not configured yet.' }));
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
          <div className="hero-copy">
            <div className="eyebrow">AI Bot Arena</div>
            <h1>Code Your Bot. Watch It Fight. Win the Arena.</h1>
            <p className="sub">
              CogCage lets you build an AI fighter, drop it into live matches, and climb competitive ladders. Tune
              strategy, ship upgrades, and see your bot battle real opponents.
            </p>

            <ul className="steps">
              <li><span>1</span>Build with a lightweight SDK.</li>
              <li><span>2</span>Queue into arena fights.</li>
              <li><span>3</span>Climb rankings and compete for prizes.</li>
            </ul>

            <div className="kpis">
              <div className="kpi"><strong>Mode</strong><span>Live Matches</span></div>
              <div className="kpi"><strong>Progress</strong><span>Ranked Ladders</span></div>
              <div className="kpi"><strong>Rewards</strong><span>Prize Events</span></div>
            </div>

            <div className="proof">
              arena_preview: bot_id=ALPHA-9 | matchup=mech-brawler | status=queued
            </div>
          </div>

          <aside className="card hero-card">
            <h2>Get Alpha Access</h2>
            <p>Be first to launch a bot, test your build, and enter early seasons.</p>
            <form onSubmit={submitWaitlist}>
              <label className="field">
                <span>Email</span>
                <input
                  type="email"
                  name="email"
                  placeholder="you@domain.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  inputMode="email"
                  required
                />
              </label>

              <button className="btn" type="submit" disabled={!canSubmit || state.saving}>
                {state.saving ? 'Saving…' : 'Join the Alpha'}
              </button>
            </form>

            <button className="btn alt" type="button" onClick={startFounderCheckout}>
              Reserve Founder Slot
            </button>

            {state.msg && <div className="msg">{state.msg}</div>}
            <p className="fine">
              Prize events are optional and subject to rules, eligibility, and regional availability. No guaranteed
              earnings. Founder checkout pre-fills your email for faster completion.
            </p>
          </aside>
        </section>
      </main>
    </>
  );
}
