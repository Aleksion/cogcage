#!/usr/bin/env node
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.COGCAGE_DB_PATH ?? path.join(process.cwd(), 'data', 'cogcage.db');

const args = process.argv.slice(2);
const daysArg = args.find((arg) => arg.startsWith('--days='));
const playGuardrailMinSampleArg = args.find((arg) => arg.startsWith('--play-guardrail-min-sample='));
const jsonMode = args.includes('--json');
const days = Number(daysArg?.split('=')[1] ?? '7');
const playGuardrailMinSample = Number(playGuardrailMinSampleArg?.split('=')[1] ?? '5');

if (!Number.isFinite(days) || days <= 0) {
  console.error('Invalid --days value. Example: --days=7');
  process.exit(1);
}

if (!Number.isFinite(playGuardrailMinSample) || playGuardrailMinSample < 1) {
  console.error('Invalid --play-guardrail-min-sample value. Example: --play-guardrail-min-sample=5');
  process.exit(1);
}

const db = new Database(dbPath, { readonly: true });

function count(sql, params = {}) {
  const row = db.prepare(sql).get(params);
  return Number(row?.value ?? 0);
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return (numerator / denominator) * 100;
}

function getPlayFounderDailySplit(windowStart, minSample) {
  const rows = db
    .prepare(
      `SELECT date(created_at) AS day,
              SUM(CASE WHEN source = 'play-page-founder-cta-winner' THEN 1 ELSE 0 END) AS winner,
              SUM(CASE WHEN source = 'play-page-founder-cta-loser' THEN 1 ELSE 0 END) AS loser,
              SUM(CASE WHEN source = 'play-page-founder-cta-neutral' THEN 1 ELSE 0 END) AS neutral
       FROM conversion_events
       WHERE event_name = 'founder_checkout_clicked'
         AND source LIKE 'play-page-founder-cta-%'
         AND created_at >= @windowStart
       GROUP BY date(created_at)
       ORDER BY day DESC`,
      )
    .all({ windowStart });

  return rows.map((row) => {
    const winner = Number(row.winner ?? 0);
    const loser = Number(row.loser ?? 0);
    const neutral = Number(row.neutral ?? 0);
    const total = winner + loser + neutral;

    return {
      day: row.day,
      winner,
      loser,
      neutral,
      total,
      guardrailQualified: total >= minSample,
      loserSharePct: pct(loser, total),
      winnerSharePct: pct(winner, total),
      loserBeatsWinner: loser > winner,
    };
  });
}

function consecutiveLoserBeatsWinnerStreak(days) {
  let streak = 0;
  for (const day of days) {
    if (!day.guardrailQualified || !day.loserBeatsWinner) break;
    streak += 1;
  }
  return streak;
}

const windowStart = db
  .prepare("SELECT datetime('now', @window) AS value")
  .get({ window: `-${days} days` })?.value;

const playFounderDailySplit = getPlayFounderDailySplit(windowStart, playGuardrailMinSample);
const loserBeatsWinnerStreakDays = consecutiveLoserBeatsWinnerStreak(playFounderDailySplit);

const totals = {
  waitlistLeads: count('SELECT COUNT(*) AS value FROM waitlist_leads'),
  founderIntents: count('SELECT COUNT(*) AS value FROM founder_intents'),
  conversionEvents: count('SELECT COUNT(*) AS value FROM conversion_events'),
  paidConversions: count("SELECT COUNT(*) AS value FROM conversion_events WHERE event_name = 'paid_conversion_confirmed'"),
};

const inWindow = {
  landingViews: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'landing_view'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  founderClicks: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  landingFounderClicks: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE '%-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  founderIntents: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE created_at >= @windowStart`,
    { windowStart },
  ),
  waitlistJoinedEvents: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'waitlist_joined'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  waitlistLeads: count(
    `SELECT COUNT(*) AS value
     FROM waitlist_leads
     WHERE created_at >= @windowStart`,
    { windowStart },
  ),
  paidConversions: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'paid_conversion_confirmed'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  playPageViews: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'play_page_viewed'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  playMatchStarts: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'play_match_started'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  playMatchCompletions: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'play_match_completed'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  playFounderClicks: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'play-page-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const playFounderClicksBySource = {
  neutral: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source = 'play-page-founder-cta-neutral'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  winner: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source = 'play-page-founder-cta-winner'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  loser: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source = 'play-page-founder-cta-loser'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const landingFounderClicksByCtaVariant = {
  reserve: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE '%-founder-cta-%-reserve'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  claim: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE '%-founder-cta-%-claim'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const landingFounderIntentsByCtaVariant = {
  reserve: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE '%-founder-checkout-%-reserve'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  claim: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE '%-founder-checkout-%-claim'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const postWaitlistFounderClicksBySource = {
  hero: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'hero-post-waitlist-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  footer: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'footer-post-waitlist-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const postWaitlistFounderIntentsBySource = {
  hero: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE 'hero-post-waitlist-founder-checkout-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  footer: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE 'footer-post-waitlist-founder-checkout-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const uniqueInWindow = {
  founderClickEmails: count(
    `SELECT COUNT(DISTINCT lower(email)) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND email IS NOT NULL
       AND email != ''
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  founderIntentEmails: count(
    `SELECT COUNT(DISTINCT lower(email)) AS value
     FROM founder_intents
     WHERE email IS NOT NULL
       AND email != ''
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  waitlistEmails: count(
    `SELECT COUNT(DISTINCT lower(email)) AS value
     FROM waitlist_leads
     WHERE email IS NOT NULL
       AND email != ''
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  paidEmails: count(
    `SELECT COUNT(DISTINCT lower(email)) AS value
     FROM conversion_events
     WHERE event_name = 'paid_conversion_confirmed'
       AND email IS NOT NULL
       AND email != ''
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const rollup = {
  days,
  windowStart,
  totals,
  inWindow,
  playFounderClicksBySource,
  landingFounderClicksByCtaVariant,
  landingFounderIntentsByCtaVariant,
  postWaitlistFounderClicksBySource,
  postWaitlistFounderIntentsBySource,
  playFounderDailySplit,
  alerts: {
    playGuardrailMinSample,
    playGuardrailQualifiedDaysInWindow: playFounderDailySplit.filter((day) => day.guardrailQualified).length,
    loserCtaOutperformingWinnerStreakDays: loserBeatsWinnerStreakDays,
    loserCtaOutperformingWinnerGuardrailTriggered: loserBeatsWinnerStreakDays >= 3,
  },
  uniqueInWindow,
  rates: {
    founderClickToIntentPct: pct(inWindow.founderIntents, inWindow.founderClicks),
    founderIntentToPaidPct: pct(inWindow.paidConversions, inWindow.founderIntents),
    founderClickToPaidPct: pct(inWindow.paidConversions, inWindow.founderClicks),
    waitlistToPaidPct: pct(inWindow.paidConversions, inWindow.waitlistLeads),

    reserveCtaSharePct: pct(landingFounderClicksByCtaVariant.reserve, inWindow.landingFounderClicks),
    claimCtaSharePct: pct(landingFounderClicksByCtaVariant.claim, inWindow.landingFounderClicks),
    reserveCtaClickToIntentPct: pct(landingFounderIntentsByCtaVariant.reserve, landingFounderClicksByCtaVariant.reserve),
    claimCtaClickToIntentPct: pct(landingFounderIntentsByCtaVariant.claim, landingFounderClicksByCtaVariant.claim),

    postWaitlistFounderClicksTotal:
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    postWaitlistFounderIntentsTotal:
      postWaitlistFounderIntentsBySource.hero + postWaitlistFounderIntentsBySource.footer,
    heroPostWaitlistFounderClickSharePct: pct(
      postWaitlistFounderClicksBySource.hero,
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    ),
    footerPostWaitlistFounderClickSharePct: pct(
      postWaitlistFounderClicksBySource.footer,
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    ),
    postWaitlistWaitlistJoinToFounderClickPct: pct(
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
      inWindow.waitlistJoinedEvents,
    ),
    postWaitlistFounderClickToIntentPct: pct(
      postWaitlistFounderIntentsBySource.hero + postWaitlistFounderIntentsBySource.footer,
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    ),

    playViewToMatchStartPct: pct(inWindow.playMatchStarts, inWindow.playPageViews),
    playStartToCompletionPct: pct(inWindow.playMatchCompletions, inWindow.playMatchStarts),
    playCompletionToFounderClickPct: pct(inWindow.playFounderClicks, inWindow.playMatchCompletions),
    playViewToFounderClickPct: pct(inWindow.playFounderClicks, inWindow.playPageViews),
    playCompletionToFounderClickNeutralPct: pct(playFounderClicksBySource.neutral, inWindow.playMatchCompletions),
    playCompletionToFounderClickWinnerPct: pct(playFounderClicksBySource.winner, inWindow.playMatchCompletions),
    playCompletionToFounderClickLoserPct: pct(playFounderClicksBySource.loser, inWindow.playMatchCompletions),
    playFounderClickWinnerSharePct: pct(playFounderClicksBySource.winner, inWindow.playFounderClicks),
    playFounderClickLoserSharePct: pct(playFounderClicksBySource.loser, inWindow.playFounderClicks),
    playFounderClickNeutralSharePct: pct(playFounderClicksBySource.neutral, inWindow.playFounderClicks),
  },
};

if (jsonMode) {
  console.log(JSON.stringify(rollup, null, 2));
  db.close();
  process.exit(0);
}

console.log('CogCage Funnel Rollup');
console.log(`Window: last ${days} day(s) since ${windowStart}`);
console.log('');

console.log('Totals (all-time):');
console.log(`- Waitlist leads: ${totals.waitlistLeads}`);
console.log(`- Founder intents: ${totals.founderIntents}`);
console.log(`- Paid conversions: ${totals.paidConversions}`);
console.log(`- Conversion events: ${totals.conversionEvents}`);
console.log('');

console.log(`Windowed funnel (${days} day(s)):`);
console.log(`- Landing views: ${inWindow.landingViews}`);
console.log(`- Founder checkout clicks: ${inWindow.founderClicks}`);
console.log(`- Landing founder checkout clicks: ${inWindow.landingFounderClicks}`);
console.log(`- Founder intents logged: ${inWindow.founderIntents}`);
console.log(`- Waitlist joined events: ${inWindow.waitlistJoinedEvents}`);
console.log(`- Waitlist leads created: ${inWindow.waitlistLeads}`);
console.log(`- Paid conversion confirmations: ${inWindow.paidConversions}`);
console.log('');

console.log('Unique emails in window:');
console.log(`- Founder click emails: ${uniqueInWindow.founderClickEmails}`);
console.log(`- Founder intent emails: ${uniqueInWindow.founderIntentEmails}`);
console.log(`- Waitlist emails: ${uniqueInWindow.waitlistEmails}`);
console.log(`- Paid emails: ${uniqueInWindow.paidEmails}`);
console.log('');

console.log('Step conversion rates:');
console.log(`- Founder click -> intent: ${rollup.rates.founderClickToIntentPct.toFixed(2)}%`);
console.log(`- Founder intent -> paid: ${rollup.rates.founderIntentToPaidPct.toFixed(2)}%`);
console.log(`- Founder click -> paid: ${rollup.rates.founderClickToPaidPct.toFixed(2)}%`);
console.log(`- Waitlist lead -> paid: ${rollup.rates.waitlistToPaidPct.toFixed(2)}%`);
console.log('');

console.log('Landing founder CTA copy split:');
console.log(`- Reserve clicks: ${landingFounderClicksByCtaVariant.reserve}`);
console.log(`- Claim clicks: ${landingFounderClicksByCtaVariant.claim}`);
console.log(`- Reserve intent logs: ${landingFounderIntentsByCtaVariant.reserve}`);
console.log(`- Claim intent logs: ${landingFounderIntentsByCtaVariant.claim}`);
console.log(`- Landing founder click mix (reserve/claim): ${rollup.rates.reserveCtaSharePct.toFixed(2)}% / ${rollup.rates.claimCtaSharePct.toFixed(2)}%`);
console.log(`- Reserve click -> intent: ${rollup.rates.reserveCtaClickToIntentPct.toFixed(2)}%`);
console.log(`- Claim click -> intent: ${rollup.rates.claimCtaClickToIntentPct.toFixed(2)}%`);
console.log('');

console.log('Post-waitlist founder upsell:');
console.log(`- Hero post-waitlist founder clicks: ${postWaitlistFounderClicksBySource.hero}`);
console.log(`- Footer post-waitlist founder clicks: ${postWaitlistFounderClicksBySource.footer}`);
console.log(`- Hero post-waitlist founder intents: ${postWaitlistFounderIntentsBySource.hero}`);
console.log(`- Footer post-waitlist founder intents: ${postWaitlistFounderIntentsBySource.footer}`);
console.log(`- Post-waitlist founder clicks total: ${rollup.rates.postWaitlistFounderClicksTotal}`);
console.log(`- Post-waitlist founder intents total: ${rollup.rates.postWaitlistFounderIntentsTotal}`);
console.log(`- Post-waitlist founder click mix (hero/footer): ${rollup.rates.heroPostWaitlistFounderClickSharePct.toFixed(2)}% / ${rollup.rates.footerPostWaitlistFounderClickSharePct.toFixed(2)}%`);
console.log(`- Waitlist joined -> post-waitlist founder click: ${rollup.rates.postWaitlistWaitlistJoinToFounderClickPct.toFixed(2)}%`);
console.log(`- Post-waitlist founder click -> intent: ${rollup.rates.postWaitlistFounderClickToIntentPct.toFixed(2)}%`);
console.log('');

console.log(`Play funnel (${days} day(s)):`);
console.log(`- Play page views: ${inWindow.playPageViews}`);
console.log(`- Play match starts: ${inWindow.playMatchStarts}`);
console.log(`- Play match completions: ${inWindow.playMatchCompletions}`);
console.log(`- Play-page founder checkout clicks: ${inWindow.playFounderClicks}`);
console.log('');

console.log('Play founder clicks by source:');
console.log(`- Neutral CTA (play-page-founder-cta-neutral): ${playFounderClicksBySource.neutral}`);
console.log(`- Winner CTA (play-page-founder-cta-winner): ${playFounderClicksBySource.winner}`);
console.log(`- Loser CTA (play-page-founder-cta-loser): ${playFounderClicksBySource.loser}`);
console.log('');

console.log('Play winner vs loser daily guardrail:');
if (!playFounderDailySplit.length) {
  console.log('- No play founder click data in this window yet.');
} else {
  console.log(
    `- Minimum daily sample for streak qualification: ${playGuardrailMinSample} clicks`,
  );
  for (const day of playFounderDailySplit) {
    console.log(
      `- ${day.day}: winner=${day.winner}, loser=${day.loser}, neutral=${day.neutral}, total=${day.total}, qualified=${day.guardrailQualified ? 'yes' : 'no'}, loser>winner=${day.loserBeatsWinner ? 'yes' : 'no'}`,
    );
  }
}
console.log(
  `- Consecutive days loser>winner: ${rollup.alerts.loserCtaOutperformingWinnerStreakDays}`,
);
console.log(
  `- Guardrail (>=3 consecutive days) triggered: ${rollup.alerts.loserCtaOutperformingWinnerGuardrailTriggered ? 'YES' : 'no'}`,
);
console.log('');

console.log('Play funnel conversion rates:');
console.log(`- Play page view -> match start: ${rollup.rates.playViewToMatchStartPct.toFixed(2)}%`);
console.log(`- Play match start -> completion: ${rollup.rates.playStartToCompletionPct.toFixed(2)}%`);
console.log(`- Play completion -> founder click: ${rollup.rates.playCompletionToFounderClickPct.toFixed(2)}%`);
console.log(`- Play page view -> founder click: ${rollup.rates.playViewToFounderClickPct.toFixed(2)}%`);
console.log(`- Play completion -> neutral CTA click: ${rollup.rates.playCompletionToFounderClickNeutralPct.toFixed(2)}%`);
console.log(`- Play completion -> winner CTA click: ${rollup.rates.playCompletionToFounderClickWinnerPct.toFixed(2)}%`);
console.log(`- Play completion -> loser CTA click: ${rollup.rates.playCompletionToFounderClickLoserPct.toFixed(2)}%`);
console.log(`- Play founder click mix (neutral/winner/loser): ${rollup.rates.playFounderClickNeutralSharePct.toFixed(2)}% / ${rollup.rates.playFounderClickWinnerSharePct.toFixed(2)}% / ${rollup.rates.playFounderClickLoserSharePct.toFixed(2)}%`);

db.close();
