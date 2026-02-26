#!/usr/bin/env node
import path from 'node:path';
import Database from 'better-sqlite3';

const dbPath = process.env.COGCAGE_DB_PATH ?? path.join(process.cwd(), 'data', 'cogcage.db');

const args = process.argv.slice(2);
const daysArg = args.find((arg) => arg.startsWith('--days='));
const playGuardrailMinSampleArg = args.find((arg) => arg.startsWith('--play-guardrail-min-sample='));
const landingVariantMinSampleArg = args.find((arg) => arg.startsWith('--landing-variant-min-sample='));
const playCopyVariantMinSampleArg = args.find((arg) => arg.startsWith('--play-copy-variant-min-sample='));
const paidLaneMinSampleArg = args.find((arg) => arg.startsWith('--paid-lane-min-sample='));
const jsonMode = args.includes('--json');
const days = Number(daysArg?.split('=')[1] ?? '7');
const playGuardrailMinSample = Number(playGuardrailMinSampleArg?.split('=')[1] ?? '5');
const landingVariantMinSample = Number(landingVariantMinSampleArg?.split('=')[1] ?? '25');
const playCopyVariantMinSample = Number(playCopyVariantMinSampleArg?.split('=')[1] ?? '25');
const paidLaneMinSample = Number(paidLaneMinSampleArg?.split('=')[1] ?? '3');

if (!Number.isFinite(days) || days <= 0) {
  console.error('Invalid --days value. Example: --days=7');
  process.exit(1);
}

if (!Number.isFinite(playGuardrailMinSample) || playGuardrailMinSample < 1) {
  console.error('Invalid --play-guardrail-min-sample value. Example: --play-guardrail-min-sample=5');
  process.exit(1);
}

if (!Number.isFinite(landingVariantMinSample) || landingVariantMinSample < 1) {
  console.error('Invalid --landing-variant-min-sample value. Example: --landing-variant-min-sample=25');
  process.exit(1);
}

if (!Number.isFinite(playCopyVariantMinSample) || playCopyVariantMinSample < 1) {
  console.error('Invalid --play-copy-variant-min-sample value. Example: --play-copy-variant-min-sample=25');
  process.exit(1);
}

if (!Number.isFinite(paidLaneMinSample) || paidLaneMinSample < 1) {
  console.error('Invalid --paid-lane-min-sample value. Example: --paid-lane-min-sample=3');
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
              SUM(CASE WHEN source LIKE 'play-page-founder-cta-winner%' THEN 1 ELSE 0 END) AS winner,
              SUM(CASE WHEN source LIKE 'play-page-founder-cta-loser%' THEN 1 ELSE 0 END) AS loser,
              SUM(CASE WHEN source LIKE 'play-page-founder-cta-neutral%' THEN 1 ELSE 0 END) AS neutral
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
       AND source LIKE 'play-page-founder-cta-neutral%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  winner: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'play-page-founder-cta-winner%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  loser: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'play-page-founder-cta-loser%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};


const playFounderClicksByCopyVariant = {
  momentum: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'play-page-founder-cta-%-momentum'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  utility: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE 'play-page-founder-cta-%-utility'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const playFounderIntentsByCopyVariant = {
  momentum: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE 'play-page-founder-checkout-%-momentum'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  utility: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE 'play-page-founder-checkout-%-utility'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const playCopyVariantQualified = {
  momentum: playFounderClicksByCopyVariant.momentum >= playCopyVariantMinSample,
  utility: playFounderClicksByCopyVariant.utility >= playCopyVariantMinSample,
};

function playCopyVariantRecommendation() {
  if (!playCopyVariantQualified.momentum || !playCopyVariantQualified.utility) {
    return {
      ready: false,
      winner: null,
      reason: 'insufficient_sample',
    };
  }

  const momentumClickToIntent = pct(
    playFounderIntentsByCopyVariant.momentum,
    playFounderClicksByCopyVariant.momentum,
  );
  const utilityClickToIntent = pct(
    playFounderIntentsByCopyVariant.utility,
    playFounderClicksByCopyVariant.utility,
  );

  if (momentumClickToIntent === utilityClickToIntent) {
    return {
      ready: true,
      winner:
        playFounderClicksByCopyVariant.momentum >= playFounderClicksByCopyVariant.utility
          ? 'momentum'
          : 'utility',
      reason: 'tie_broken_by_click_volume',
    };
  }

  return {
    ready: true,
    winner: momentumClickToIntent > utilityClickToIntent ? 'momentum' : 'utility',
    reason: 'higher_click_to_intent',
  };
}

const playFounderCopyVariantRecommendation = playCopyVariantRecommendation();

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


const landingViewsByHeroVariant = {
  value: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'landing_view'
       AND source = 'hero-value'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  competition: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'landing_view'
       AND source = 'hero-competition'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const landingFounderClicksByHeroVariant = {
  value: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE '%-founder-cta-value-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  competition: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'founder_checkout_clicked'
       AND source LIKE '%-founder-cta-competition-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const landingFounderIntentsByHeroVariant = {
  value: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE '%-founder-checkout-value-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  competition: count(
    `SELECT COUNT(*) AS value
     FROM founder_intents
     WHERE source LIKE '%-founder-checkout-competition-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const landingWaitlistJoinedByHeroVariant = {
  value: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'waitlist_joined'
       AND source LIKE '%-waitlist-value%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  competition: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'waitlist_joined'
       AND source LIKE '%-waitlist-competition%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const landingVariantQualified = {
  value: landingViewsByHeroVariant.value >= landingVariantMinSample,
  competition: landingViewsByHeroVariant.competition >= landingVariantMinSample,
};

function landingVariantRecommendation() {
  if (!landingVariantQualified.value || !landingVariantQualified.competition) {
    return {
      ready: false,
      winner: null,
      reason: 'insufficient_sample',
    };
  }

  const valueClickRate = pct(landingFounderClicksByHeroVariant.value, landingViewsByHeroVariant.value);
  const competitionClickRate = pct(
    landingFounderClicksByHeroVariant.competition,
    landingViewsByHeroVariant.competition,
  );

  if (valueClickRate === competitionClickRate) {
    const valueIntentRate = pct(
      landingFounderIntentsByHeroVariant.value,
      landingFounderClicksByHeroVariant.value,
    );
    const competitionIntentRate = pct(
      landingFounderIntentsByHeroVariant.competition,
      landingFounderClicksByHeroVariant.competition,
    );
    return {
      ready: true,
      winner: valueIntentRate >= competitionIntentRate ? 'value' : 'competition',
      reason: 'tie_broken_by_click_to_intent',
    };
  }

  return {
    ready: true,
    winner: valueClickRate > competitionClickRate ? 'value' : 'competition',
    reason: 'higher_founder_click_per_view',
  };
}

const landingHeroVariantRecommendation = landingVariantRecommendation();

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

const paidConversionsBySource = {
  landing: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'paid_conversion_confirmed'
       AND source LIKE '%-founder-cta-%'
       AND source NOT LIKE 'play-page-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  play: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'paid_conversion_confirmed'
       AND source LIKE 'play-page-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  postWaitlist: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'paid_conversion_confirmed'
       AND source LIKE '%-post-waitlist-founder-cta-%'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
  unattributed: count(
    `SELECT COUNT(*) AS value
     FROM conversion_events
     WHERE event_name = 'paid_conversion_confirmed'
       AND source = 'stripe-success'
       AND created_at >= @windowStart`,
    { windowStart },
  ),
};

const paidLanePerformance = {
  landing: {
    clicks: inWindow.landingFounderClicks,
    paid: paidConversionsBySource.landing,
    clickToPaidPct: pct(paidConversionsBySource.landing, inWindow.landingFounderClicks),
  },
  play: {
    clicks: inWindow.playFounderClicks,
    paid: paidConversionsBySource.play,
    clickToPaidPct: pct(paidConversionsBySource.play, inWindow.playFounderClicks),
  },
  postWaitlist: {
    clicks: postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    paid: paidConversionsBySource.postWaitlist,
    clickToPaidPct: pct(
      paidConversionsBySource.postWaitlist,
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    ),
  },
};

const paidLaneQualified = {
  landing: paidLanePerformance.landing.paid >= paidLaneMinSample,
  play: paidLanePerformance.play.paid >= paidLaneMinSample,
  postWaitlist: paidLanePerformance.postWaitlist.paid >= paidLaneMinSample,
};

function paidLaneRecommendation() {
  const candidates = Object.entries(paidLanePerformance)
    .filter(([lane]) => paidLaneQualified[lane])
    .map(([lane, metrics]) => ({ lane, ...metrics }));

  if (candidates.length < 2) {
    return {
      ready: false,
      winner: null,
      reason: 'insufficient_qualified_paid_sample',
    };
  }

  candidates.sort((a, b) => {
    if (b.clickToPaidPct !== a.clickToPaidPct) return b.clickToPaidPct - a.clickToPaidPct;
    if (b.paid !== a.paid) return b.paid - a.paid;
    return b.clicks - a.clicks;
  });

  const [winner, runnerUp] = candidates;
  return {
    ready: true,
    winner: winner.lane,
    reason:
      winner.clickToPaidPct === runnerUp.clickToPaidPct
        ? 'tie_broken_by_paid_then_click_volume'
        : 'higher_click_to_paid',
  };
}

const paidLaneWinnerRecommendation = paidLaneRecommendation();

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
  playFounderClicksByCopyVariant,
  playFounderIntentsByCopyVariant,
  landingViewsByHeroVariant,
  landingFounderClicksByHeroVariant,
  landingFounderIntentsByHeroVariant,
  landingWaitlistJoinedByHeroVariant,
  landingFounderClicksByCtaVariant,
  landingFounderIntentsByCtaVariant,
  postWaitlistFounderClicksBySource,
  postWaitlistFounderIntentsBySource,
  paidConversionsBySource,
  paidLanePerformance,
  playFounderDailySplit,
  alerts: {
    playGuardrailMinSample,
    playGuardrailQualifiedDaysInWindow: playFounderDailySplit.filter((day) => day.guardrailQualified).length,
    loserCtaOutperformingWinnerStreakDays: loserBeatsWinnerStreakDays,
    loserCtaOutperformingWinnerGuardrailTriggered: loserBeatsWinnerStreakDays >= 3,
    landingVariantMinSample,
    landingVariantQualified,
    landingHeroVariantRecommendation,
    playCopyVariantMinSample,
    playCopyVariantQualified,
    playFounderCopyVariantRecommendation,
    paidLaneMinSample,
    paidLaneQualified,
    paidLaneWinnerRecommendation,
  },
  uniqueInWindow,
  rates: {
    founderClickToIntentPct: pct(inWindow.founderIntents, inWindow.founderClicks),
    founderIntentToPaidPct: pct(inWindow.paidConversions, inWindow.founderIntents),
    founderClickToPaidPct: pct(inWindow.paidConversions, inWindow.founderClicks),
    waitlistToPaidPct: pct(inWindow.paidConversions, inWindow.waitlistLeads),
    landingFounderClickToPaidPct: pct(paidConversionsBySource.landing, inWindow.landingFounderClicks),
    playFounderClickToPaidPct: pct(paidConversionsBySource.play, inWindow.playFounderClicks),
    postWaitlistFounderClickToPaidPct: pct(
      paidConversionsBySource.postWaitlist,
      postWaitlistFounderClicksBySource.hero + postWaitlistFounderClicksBySource.footer,
    ),

    reserveCtaSharePct: pct(landingFounderClicksByCtaVariant.reserve, inWindow.landingFounderClicks),
    claimCtaSharePct: pct(landingFounderClicksByCtaVariant.claim, inWindow.landingFounderClicks),
    reserveCtaClickToIntentPct: pct(landingFounderIntentsByCtaVariant.reserve, landingFounderClicksByCtaVariant.reserve),
    claimCtaClickToIntentPct: pct(landingFounderIntentsByCtaVariant.claim, landingFounderClicksByCtaVariant.claim),

    valueHeroViewToFounderClickPct: pct(landingFounderClicksByHeroVariant.value, landingViewsByHeroVariant.value),
    competitionHeroViewToFounderClickPct: pct(
      landingFounderClicksByHeroVariant.competition,
      landingViewsByHeroVariant.competition,
    ),
    valueHeroFounderClickToIntentPct: pct(
      landingFounderIntentsByHeroVariant.value,
      landingFounderClicksByHeroVariant.value,
    ),
    competitionHeroFounderClickToIntentPct: pct(
      landingFounderIntentsByHeroVariant.competition,
      landingFounderClicksByHeroVariant.competition,
    ),
    valueHeroViewToWaitlistPct: pct(landingWaitlistJoinedByHeroVariant.value, landingViewsByHeroVariant.value),
    competitionHeroViewToWaitlistPct: pct(
      landingWaitlistJoinedByHeroVariant.competition,
      landingViewsByHeroVariant.competition,
    ),

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
    playFounderClickMomentumSharePct: pct(playFounderClicksByCopyVariant.momentum, inWindow.playFounderClicks),
    playFounderClickUtilitySharePct: pct(playFounderClicksByCopyVariant.utility, inWindow.playFounderClicks),
    playMomentumClickToIntentPct: pct(
      playFounderIntentsByCopyVariant.momentum,
      playFounderClicksByCopyVariant.momentum,
    ),
    playUtilityClickToIntentPct: pct(
      playFounderIntentsByCopyVariant.utility,
      playFounderClicksByCopyVariant.utility,
    ),
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

console.log('Paid conversions by source:');
console.log(`- Landing founder CTA sourced paid conversions: ${paidConversionsBySource.landing}`);
console.log(`- Play founder CTA sourced paid conversions: ${paidConversionsBySource.play}`);
console.log(`- Post-waitlist founder CTA sourced paid conversions: ${paidConversionsBySource.postWaitlist}`);
console.log(`- Unattributed paid conversions (legacy stripe-success): ${paidConversionsBySource.unattributed}`);
console.log(`- Landing founder click -> paid: ${rollup.rates.landingFounderClickToPaidPct.toFixed(2)}%`);
console.log(`- Play founder click -> paid: ${rollup.rates.playFounderClickToPaidPct.toFixed(2)}%`);
console.log(`- Post-waitlist founder click -> paid: ${rollup.rates.postWaitlistFounderClickToPaidPct.toFixed(2)}%`);
console.log(`- Paid-lane decision sample floor: ${paidLaneMinSample} paid conversions each (landing qualified=${paidLaneQualified.landing ? 'yes' : 'no'}, play qualified=${paidLaneQualified.play ? 'yes' : 'no'}, postWaitlist qualified=${paidLaneQualified.postWaitlist ? 'yes' : 'no'})`);
if (paidLaneWinnerRecommendation.ready) {
  console.log(`- Recommended paid-performance winner: ${paidLaneWinnerRecommendation.winner} (${paidLaneWinnerRecommendation.reason})`);
} else {
  console.log('- Recommended paid-performance winner: pending (insufficient qualified paid sample)');
}
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

console.log('Landing hero message variant split (value vs competition):');
console.log(`- Value landing views: ${landingViewsByHeroVariant.value}`);
console.log(`- Competition landing views: ${landingViewsByHeroVariant.competition}`);
console.log(`- Value founder clicks: ${landingFounderClicksByHeroVariant.value}`);
console.log(`- Competition founder clicks: ${landingFounderClicksByHeroVariant.competition}`);
console.log(`- Value founder intents: ${landingFounderIntentsByHeroVariant.value}`);
console.log(`- Competition founder intents: ${landingFounderIntentsByHeroVariant.competition}`);
console.log(`- Value waitlist joins: ${landingWaitlistJoinedByHeroVariant.value}`);
console.log(`- Competition waitlist joins: ${landingWaitlistJoinedByHeroVariant.competition}`);
console.log(`- Value view -> founder click: ${rollup.rates.valueHeroViewToFounderClickPct.toFixed(2)}%`);
console.log(`- Competition view -> founder click: ${rollup.rates.competitionHeroViewToFounderClickPct.toFixed(2)}%`);
console.log(`- Value founder click -> intent: ${rollup.rates.valueHeroFounderClickToIntentPct.toFixed(2)}%`);
console.log(`- Competition founder click -> intent: ${rollup.rates.competitionHeroFounderClickToIntentPct.toFixed(2)}%`);
console.log(`- Value view -> waitlist join: ${rollup.rates.valueHeroViewToWaitlistPct.toFixed(2)}%`);
console.log(`- Competition view -> waitlist join: ${rollup.rates.competitionHeroViewToWaitlistPct.toFixed(2)}%`);
console.log(`- Variant decision sample floor: ${landingVariantMinSample} views each (value qualified=${landingVariantQualified.value ? 'yes' : 'no'}, competition qualified=${landingVariantQualified.competition ? 'yes' : 'no'})`);
if (landingHeroVariantRecommendation.ready) {
  console.log(`- Recommended winner: ${landingHeroVariantRecommendation.winner} (${landingHeroVariantRecommendation.reason})`);
} else {
  console.log('- Recommended winner: pending (insufficient qualified sample)');
}
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

console.log('Play founder clicks by source/copy:');
console.log(`- Neutral CTA (play-page-founder-cta-neutral*): ${playFounderClicksBySource.neutral}`);
console.log(`- Winner CTA (play-page-founder-cta-winner*): ${playFounderClicksBySource.winner}`);
console.log(`- Loser CTA (play-page-founder-cta-loser*): ${playFounderClicksBySource.loser}`);
console.log(`- Momentum copy clicks (*-momentum): ${playFounderClicksByCopyVariant.momentum}`);
console.log(`- Utility copy clicks (*-utility): ${playFounderClicksByCopyVariant.utility}`);
console.log(`- Momentum copy intent logs (*-momentum): ${playFounderIntentsByCopyVariant.momentum}`);
console.log(`- Utility copy intent logs (*-utility): ${playFounderIntentsByCopyVariant.utility}`);
console.log(`- Play copy decision sample floor: ${playCopyVariantMinSample} clicks each (momentum qualified=${playCopyVariantQualified.momentum ? 'yes' : 'no'}, utility qualified=${playCopyVariantQualified.utility ? 'yes' : 'no'})`);
if (playFounderCopyVariantRecommendation.ready) {
  console.log(`- Recommended play founder copy winner: ${playFounderCopyVariantRecommendation.winner} (${playFounderCopyVariantRecommendation.reason})`);
} else {
  console.log('- Recommended play founder copy winner: pending (insufficient qualified sample)');
}
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
console.log(`- Play founder copy mix (momentum/utility): ${rollup.rates.playFounderClickMomentumSharePct.toFixed(2)}% / ${rollup.rates.playFounderClickUtilitySharePct.toFixed(2)}%`);
console.log(`- Momentum click -> intent: ${rollup.rates.playMomentumClickToIntentPct.toFixed(2)}%`);
console.log(`- Utility click -> intent: ${rollup.rates.playUtilityClickToIntentPct.toFixed(2)}%`);

db.close();
