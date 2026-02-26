import { performance } from 'node:perf_hooks';

import {
  createStandardActors,
  runMatchWithProvider,
  runMatchFromLog,
  resolveTick,
  createInitialState,
} from '../src/lib/ws2/engine.js';
import { replayMatch, hashEvents } from '../src/lib/ws2/replay.js';
import { Rng } from '../src/lib/ws2/rng.js';
import { createBot, createArchetypePair, randomizeSpawn } from '../src/lib/ws2/bots.js';

const determinismGate = async ({ seeds = 10000 }) => {
  let mismatches = 0;
  let replayMismatches = 0;
  for (let i = 1; i <= seeds; i += 1) {
    const seed = i;
    const rng1 = new Rng(seed);
    const actors1 = createStandardActors();
    randomizeSpawn(actors1, rng1);
    const botA1 = createBot('melee', rng1);
    const botB1 = createBot('ranged', rng1);
    const first = runMatchWithProvider({
      seed,
      actors: actors1,
      actionProvider: (state, actorId) => (actorId === 'alpha' ? botA1.decide(state, actorId) : botB1.decide(state, actorId)),
    });
    const hash1 = hashEvents(first.state.events);

    const rng2 = new Rng(seed);
    const actors2 = createStandardActors();
    randomizeSpawn(actors2, rng2);
    const botA2 = createBot('melee', rng2);
    const botB2 = createBot('ranged', rng2);
    const second = runMatchWithProvider({
      seed,
      actors: actors2,
      actionProvider: (state, actorId) => (actorId === 'alpha' ? botA2.decide(state, actorId) : botB2.decide(state, actorId)),
    });
    const hash2 = hashEvents(second.state.events);

    if (hash1 !== hash2 || first.state.winnerId !== second.state.winnerId) {
      mismatches += 1;
      if (mismatches > 0) break;
    }

    const replay = replayMatch({ seed, actors: first.initialActors, actionLog: first.actionLog });
    if (replay.eventHash !== hash1 || replay.state.winnerId !== first.state.winnerId) {
      replayMismatches += 1;
      if (replayMismatches > 0) break;
    }
  }

  return {
    ok: mismatches === 0 && replayMismatches === 0,
    mismatches,
    replayMismatches,
  };
};

const balanceGate = ({ matchesPerPair = 2000 }) => {
  const pairings = [
    ['melee', 'melee'],
    ['ranged', 'ranged'],
    ['melee', 'ranged'],
    ['ranged', 'melee'],
  ];

  const results = [];
  for (const [aType, bType] of pairings) {
    let aWins = 0;
    let bWins = 0;
    let draws = 0;
    for (let i = 0; i < matchesPerPair; i += 1) {
      const seed = (pairings.indexOf(aType + bType) + 1) * 100000 + i + 1;
      const rng = new Rng(seed);
      const actors = createStandardActors();
      randomizeSpawn(actors, rng);
      const bots = createArchetypePair(rng, aType, bType);
      const match = runMatchWithProvider({
        seed,
        actors,
        actionProvider: (state, actorId) => (actorId === 'alpha' ? bots.alpha.decide(state, actorId) : bots.beta.decide(state, actorId)),
      });
      if (match.state.winnerId === 'alpha') aWins += 1;
      else if (match.state.winnerId === 'beta') bWins += 1;
      else draws += 1;
    }
    const total = aWins + bWins + draws;
    results.push({
      pairing: `${aType} vs ${bType}`,
      aWins,
      bWins,
      draws,
      aWinRate: total ? aWins / total : 0,
      bWinRate: total ? bWins / total : 0,
    });
  }

  const withinEnvelope = results.every((row) => row.aWinRate <= 0.55 && row.bWinRate <= 0.55);
  return { ok: withinEnvelope, results };
};

const perfGate = ({ matches = 20 }) => {
  const durations = [];
  for (let i = 0; i < matches; i += 1) {
    const seed = 500000 + i;
    const rng = new Rng(seed);
    const actors = createStandardActors();
    randomizeSpawn(actors, rng);
    const bots = createArchetypePair(rng, 'melee', 'ranged');
    const state = createInitialState({ seed, actors });

    while (!state.ended && state.tick < state.maxTicks) {
      const actionsByActor = new Map();
      if (state.tick % 3 === 0) {
        actionsByActor.set('alpha', bots.alpha.decide(state, 'alpha'));
        actionsByActor.set('beta', bots.beta.decide(state, 'beta'));
      }
      const start = performance.now();
      resolveTick(state, actionsByActor);
      const end = performance.now();
      durations.push(end - start);
    }
  }

  durations.sort((a, b) => a - b);
  const idx = Math.floor(durations.length * 0.95);
  const p95 = durations[idx] ?? 0;

  return { ok: p95 <= 5, p95, samples: durations.length };
};

const formatPct = (value) => `${(value * 100).toFixed(2)}%`;

const main = async () => {
  const started = Date.now();
  const determinism = await determinismGate({ seeds: 10000 });
  const balance = balanceGate({ matchesPerPair: 2000 });
  const perf = perfGate({ matches: 20 });

  const elapsed = ((Date.now() - started) / 1000).toFixed(2);

  console.log('WS2 Acceptance Gates');
  console.log('--------------------');
  console.log(`Determinism: ${determinism.ok ? 'PASS' : 'FAIL'} (mismatches=${determinism.mismatches}, replay=${determinism.replayMismatches})`);
  console.log(`Performance: ${perf.ok ? 'PASS' : 'FAIL'} (p95=${perf.p95.toFixed(3)}ms, samples=${perf.samples})`);
  console.log(`Balance: ${balance.ok ? 'PASS' : 'FAIL'}`);
  console.log('');
  console.log('Balance detail:');
  for (const row of balance.results) {
    console.log(`- ${row.pairing}: alpha ${formatPct(row.aWinRate)} | beta ${formatPct(row.bWinRate)} | draws ${row.draws}`);
  }
  console.log('');
  console.log(`Elapsed: ${elapsed}s`);

  if (!determinism.ok || !balance.ok || !perf.ok) {
    process.exitCode = 1;
  }
};

main();
