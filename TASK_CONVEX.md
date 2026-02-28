# TASK: Wire Convex + Convex Auth into The Molt Pit

## Context
The Molt Pit — TanStack Start app in `web/`. You are in the worktree root.
Full spec: `docs/tasks/task-020-convex-auth.md` — READ IT FIRST.

## Convex Deployment
- URL: `https://intent-horse-742.convex.cloud`
- Deploy key: `dev:intent-horse-742|eyJ2MiI6IjI5ZGQ0YjVkNTRmODQxNzg5YzRkMmY5YjQ3NWFlMTZjIn0=`
- Set this as env var before ALL `npx convex` commands:
  `export CONVEX_DEPLOY_KEY="dev:intent-horse-742|eyJ2MiI6IjI5ZGQ0YjVkNTRmODQxNzg5YzRkMmY5YjQ3NWFlMTZjIn0="`

## What to Build

### Phase 1 — Convex wiring (no auth yet)
1. `cd web && npm install convex @convex-dev/react-query @tanstack/react-query @tanstack/react-router-with-query`
2. Create `web/convex/schema.ts` — full schema from spec (players, shells, tanks, molts, waitlist)
3. Create `web/convex/shells.ts` — queries + mutations (list, create, update, delete — ownership enforced)
4. Create `web/convex/tanks.ts` — queries + mutations (list open, get, create, join, updateChallengerShell, start)
5. Create `web/convex/players.ts` — getPlayer, upsertPlayer
6. Create `web/convex/waitlist.ts` — addToWaitlist mutation
7. Create `web/convex/ladder.ts` — getTopPlayers query
8. Deploy functions: `export CONVEX_DEPLOY_KEY="..." && cd web && npx convex deploy --prod`
9. Update `web/app/router.tsx` — add ConvexQueryClient + ConvexProvider wrapper
10. Update `web/app/routes/__root.tsx` — QueryClient context for TanStack Router

### Phase 2 — Convex Auth
11. `npm install @convex-dev/auth @auth/core@0.37.0`
12. Run init: `export CONVEX_DEPLOY_KEY="..." && cd web && npx @convex-dev/auth`
    - If it asks for project slug/deployment, use: `intent-horse-742`
    - This generates JWT_PRIVATE_KEY and JWKS in Convex env automatically
13. Create `web/convex/auth.ts` — GitHub + Resend providers (use env vars, they'll be filled later)
14. Create `web/convex/http.ts` — auth HTTP routes
15. Add `...authTables` to schema
16. Replace `ConvexProvider` with `ConvexAuthProvider` in router.tsx
17. Deploy again: `export CONVEX_DEPLOY_KEY="..." && npx convex deploy --prod`

### Phase 3 — API route migration
Migrate these routes from Redis → Convex (server-side via ConvexHttpClient):
- `web/app/routes/api/shell.ts` → createShell mutation
- `web/app/routes/api/shell.$id.ts` → updateShell / deleteShell mutations (ownership check)
- `web/app/routes/api/tank.ts` → createTank mutation
- `web/app/routes/api/tank.$id.ts` → getTank query
- `web/app/routes/api/tank.$id.join.ts` → joinTank mutation
- `web/app/routes/api/tank.$id.start.ts` → startMolt mutation (host only)
- `web/app/routes/api/waitlist.ts` → addToWaitlist mutation (keep Redis as secondary)

Server-side Convex pattern:
```typescript
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../convex/_generated/api";
const convex = new ConvexHttpClient(process.env.CONVEX_URL!);
const result = await convex.mutation(api.shells.create, { name, cards, directive, skills });
```

For auth-gated mutations server-side, extract Convex session token from request:
```typescript
// Get token from Authorization header or __session cookie
const token = request.headers.get("Authorization")?.replace("Bearer ", "") 
  ?? getCookie(request, "__session");
await convex.mutation(api.shells.create, args, { token });
```

### Phase 4 — Update Shell component
- `web/app/routes/shell.tsx` — fetch shells via Convex query instead of Redis API
- `web/app/components/Armory.tsx` — same

### Phase 5 — Sign-in page
- `web/app/routes/sign-in.tsx` — real UI with GitHub button + email OTP form
- Use `useAuthActions` from `@convex-dev/auth/react`

## Key Files to Understand First
- `web/app/lib/armory.ts` — current Redis shell logic (to migrate)
- `web/app/lib/lobby.ts` — current Redis lobby/tank logic (to migrate)
- `web/app/lib/session.ts` — FFA sessions (DO NOT MIGRATE — keep Redis)
- `web/app/router.tsx` — current router setup
- `web/app/routes/__root.tsx` — root route

## Ownership Rules (TASK-021)
Every mutation that touches a shell or tank must verify:
- Shell mutations: `shell.playerId === ctx.auth.userId` (throw ConvexError("Unauthorized") if not)
- Tank host actions (start molt): `tank.hostPlayerId === caller.playerId`
- Tank challenger actions (update crawler): `tank.challengerPlayerId === caller.playerId`
- Tank join: caller is not already the host

## DO NOT Touch
- `web/app/lib/session.ts` — FFA sessions stay on Redis
- `web/app/routes/api/sessions.*` — stay Redis-backed
- Engine DO code in `engine/` directory
- `.env.local` UPSTASH vars — keep them

## Environment Setup
Add to `web/.env.local`:
```
VITE_CONVEX_URL=https://intent-horse-742.convex.cloud
CONVEX_URL=https://intent-horse-742.convex.cloud
```

GitHub OAuth env vars will be added later — configure but don't require them for build:
```
# AUTH_GITHUB_ID=<pending>
# AUTH_GITHUB_SECRET=<pending>
# AUTH_RESEND_KEY=<pending>
```

## Build + Verify
```bash
cd web && npm run build
# Must pass with 0 errors
# Convex functions must be deployed successfully
```

## Done When
- [ ] `npm run build` passes
- [ ] Convex functions deployed to intent-horse-742 (verify with `npx convex dashboard` or check https://dashboard.convex.dev)
- [ ] `convex/schema.ts` has players, shells, tanks, molts, waitlist tables
- [ ] Shell mutations enforce ownership (throw on wrong owner)
- [ ] Tank join/start mutations enforce host/challenger roles
- [ ] API routes for shell + tank use Convex instead of Redis
- [ ] Sign-in page renders with GitHub button
- [ ] All changes committed, branch pushed, PR created to main

## Report Back
When done, run:
```bash
openclaw system event --text "TASK-020 Convex done: PR ready, build passes, functions deployed" --mode now
```
And create a PR: `gh pr create --title "feat: Convex + Convex Auth — player accounts + ownership (TASK-020+021)" --base main`
