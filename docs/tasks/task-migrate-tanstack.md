# TASK-MIGRATE: Astro → TanStack Start

## Why
Astro is a static site framework. The Molt Pit is becoming a dynamic game platform with
auth, real-time lobbies, player profiles, and WebSocket connections. Astro fights us at
every turn — awkward API routes, `client:only` FOUC, limited middleware. 

TanStack Start gives us: proper React SSR (no FOUC), type-safe server functions, TanStack
Router (best-in-class routing), TanStack Query for data fetching, and a clean Vercel
deployment path.

## What to Build

### New app structure
Replace `web/` contents with a TanStack Start app:

```
web/
├── app/
│   ├── routes/
│   │   ├── __root.tsx          ← root layout (nav, global styles, fonts)
│   │   ├── index.tsx           ← / (landing page — port CogCageLanding / MoltPitLanding)
│   │   ├── play.tsx            ← /play (game demo — port Play.tsx)
│   │   ├── tank/
│   │   │   └── $id.tsx         ← /tank/:id (The Tank — port Tank.tsx)
│   │   ├── shell.tsx           ← /shell (The Shell — port existing Shell)
│   │   ├── sign-in.tsx         ← /sign-in (placeholder for TASK-020)
│   │   └── api/
│   │       ├── waitlist.ts     ← POST /api/waitlist
│   │       ├── events.ts       ← POST /api/events
│   │       ├── founder-intent.ts
│   │       ├── postback.ts
│   │       ├── ops.ts
│   │       └── molt/
│   │           └── start.ts    ← POST /api/molt/start (calls DO)
├── app.config.ts               ← TanStack Start config
├── package.json
└── vite.config.ts
```

### Setup commands
```bash
cd web/
# Replace with TanStack Start
npm create tanstack@latest -- --template react-router-ts
# OR install manually:
npm install @tanstack/start @tanstack/react-router @tanstack/react-query
```

Use TanStack Start with React. Target: vinxi + vite build, Vercel deployment via
`@tanstack/start-server-fn-vercel` adapter or the Nitro vercel preset.

### app.config.ts
```typescript
import { defineConfig } from '@tanstack/start/config';

export default defineConfig({
  server: {
    preset: 'vercel',
  },
});
```

### Port existing React components
These files move with ZERO or minimal changes:
- `web/src/components/Play.tsx` → `web/app/components/Play.tsx`
- `web/src/components/Tank.tsx` → `web/app/components/Tank.tsx`
- `web/src/components/MoltPitLanding.jsx` → `web/app/components/MoltPitLanding.jsx`
- `web/src/components/Den.tsx` → `web/app/components/Den.tsx`
- `web/src/lib/ws2/` → `web/app/lib/ws2/` (unchanged)
- `web/src/lib/auth.ts` → `web/app/lib/auth.ts`
- `web/src/lib/tank.ts` → `web/app/lib/tank.ts`

Remove: `client:only="react"` wrapper pattern — no longer needed. Components render
server-side by default.

### Port API routes
Existing `web/src/pages/api/*.ts` → `web/app/routes/api/*.ts`
Same logic, same Redis calls. Just different file location + TanStack route export:

```typescript
// web/app/routes/api/waitlist.ts
import { json } from '@tanstack/start/server';
import { createAPIFileRoute } from '@tanstack/start/api';

export const APIRoute = createAPIFileRoute('/api/waitlist')({
  POST: async ({ request }) => {
    // same body as existing waitlist.ts handler
    return json({ ok: true });
  },
});
```

### Root layout (__root.tsx)
Port the global styles, fonts (Bangers, Kanit, Space Grotesk), and nav from the Astro
layout. Include TanStack Query provider and router devtools.

```typescript
import { createRootRoute } from '@tanstack/react-router';
import { Outlet } from '@tanstack/react-router';

export const Route = createRootRoute({
  component: RootLayout,
});

function RootLayout() {
  return (
    <html>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        {/* fonts */}
      </head>
      <body>
        <Outlet />
      </body>
    </html>
  );
}
```

### Vercel deployment
TanStack Start with Vercel preset outputs to `.vercel/output/` automatically.
`vercel.json` at repo root should be minimal or absent — let TanStack Start handle it.

Update `web/package.json` build script if needed.

## What to DELETE
- `web/src/` (all Astro pages, layouts, env.d.ts) — replaced by `web/app/`
- `web/astro.config.mjs` — replaced by `web/app.config.ts`
- `web/public/` — move to `web/public/` (stays same location, fine)
- Any `.astro` files

## Acceptance Criteria
- [ ] `npm --prefix web run build` passes
- [ ] `npm --prefix web run dev` starts a local server
- [ ] `/` landing page loads with no FOUC (styles present on first paint)
- [ ] `/play` game demo works (WebSocket to DO, molt runs)
- [ ] `/tank/:id` tank page loads
- [ ] `/shell` shell config page loads
- [ ] All existing API routes respond correctly
- [ ] Vercel deployment succeeds (check preview URL)
- [ ] PR opened against main with CHANGELOG entry

## Notes
- Do NOT rebuild auth in this task — `/sign-in` is a placeholder page, TASK-020 adds auth
- Do NOT rebuild ownership logic — TASK-021 follows
- Keep Redis env vars the same: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
- Engine URL: PUBLIC_ENGINE_WS_URL (already in Vercel env vars)
- Existing PRs #14 and #15 were closed — their work will be redone for TanStack

## When Done
Update CHANGELOG.md. Commit and open PR to main. Then:
```bash
openclaw system event --text "Done: Astro → TanStack Start migration complete, PR open, no FOUC" --mode now
```
