# TASK-004: Migrate MatchView to DO WebSocket

## Context
The Molt Pit's game engine is now a Cloudflare Durable Object running at:
- `https://themoltpit-engine.aleks-precurion.workers.dev` (workers.dev — live now)
- `https://engine.themoltpit.com` (custom domain — DNS pending)

The client currently runs the match engine inside the browser via `match-runner.ts`.
That needs to go. The client should be a **dumb spectator** — it subscribes to the DO
WebSocket and renders whatever state it receives.

## Your Job

### 1. Update `web/src/pages/api/lobby/[id]/start.ts`
When a match starts, call the DO instead of running the engine client-side:
```typescript
const ENGINE_URL = process.env.ENGINE_URL ?? 'https://themoltpit-engine.aleks-precurion.workers.dev';
const ENGINE_SECRET = process.env.COGCAGE_ENGINE_SECRET ?? '';

const res = await fetch(`${ENGINE_URL}/match/${matchId}/start`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${ENGINE_SECRET}`,
  },
  body: JSON.stringify({ botA, botB, seed }),
});
```
If the `start` API doesn't exist yet, create it at that path.

### 2. Migrate `web/src/components/Play.tsx` — spectator mode
Replace `runMatchAsync` / `match-runner.ts` with a WebSocket subscription:

```typescript
// Remove: import { runMatchAsync } from '../lib/ws2/match-runner';
// Add WebSocket connection after match starts:

const ws = useRef<WebSocket | null>(null);

function connectToMatch(matchId: string) {
  const url = `wss://themoltpit-engine.aleks-precurion.workers.dev/match/${matchId}`;
  ws.current = new WebSocket(url);
  
  ws.current.onmessage = (e) => {
    const msg = JSON.parse(e.data);
    if (msg.type === 'tick') {
      setGameState(msg.state);  // replace whatever state setter exists
      setCurrentTick(msg.tick);
    }
    if (msg.type === 'match_complete') {
      setMatchResult(msg.result);
      setPhase('result');
      ws.current?.close();
    }
  };
  
  ws.current.onerror = () => setPhase('error');
}
```

The UI rendering logic (HP bars, event log, positions, VFX) should stay exactly as-is —
just swap the data source from local sim to WebSocket.

### 3. Remove client-side engine execution
- Stop calling `runMatchAsync()` to drive the match
- The DO drives the match; the client just renders
- Keep `web/src/lib/ws2/` files for now (types are still useful) — TASK-005 removes them

### 4. Handle the "no live engine yet" case gracefully
The custom domain `engine.themoltpit.com` isn't DNS'd yet. Use workers.dev URL as fallback:
```typescript
const ENGINE_WS_URL = 'wss://themoltpit-engine.aleks-precurion.workers.dev';
```

Add an env var `PUBLIC_ENGINE_WS_URL` in `web/src/env.d.ts` so it's configurable.

### 5. Update CHANGELOG.md
Add an entry for TASK-004 before opening the PR.

## Acceptance Criteria
- `Play.tsx` no longer calls `runMatchAsync` to drive a match
- Lobby start triggers the DO via HTTP POST
- WebSocket connection established after match start
- Game state updates flow from DO → client → render
- TypeScript compiles clean (`npm --prefix web run build` passes)
- PR opened against main

## Important
- Workers.dev URL: `themoltpit-engine.aleks-precurion.workers.dev`
- DO WebSocket path: `/match/:matchId` (connect with WS upgrade)
- DO start path: `POST /match/:matchId/start`
- DO queue path: `POST /match/:matchId/queue`
- Keep the lobby API route structure — just add the DO call inside it

## When Done
```bash
openclaw system event --text "Done: TASK-004 complete — MatchView migrated to DO WebSocket, PR open" --mode now
```
