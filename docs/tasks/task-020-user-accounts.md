# TASK-020: User Accounts — Auth.js + Player Tokens

## Why
No accounts = no multiplayer ownership, no player tokens for the OpenClaw plugin, no revenue attribution. This is the blocker for everything in Phase 2.

## Auth Choice: Auth.js (NextAuth v5)
- Self-hosted, zero per-user cost, forever
- Runs in Vercel serverless functions (API routes)
- Email magic links + Google/GitHub OAuth
- Sessions stored in Redis (already in stack via Upstash)
- No Clerk, no Supabase — no vendor per-MAU bill

## What to Build

### 1. Install + configure Auth.js
```bash
npm install next-auth@beta
```

Config file: `web/src/lib/auth.ts`
```typescript
import NextAuth from 'next-auth';
import GitHub from 'next-auth/providers/github';
import Google from 'next-auth/providers/google';
import Resend from 'next-auth/providers/resend'; // magic links

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    GitHub({ clientId: process.env.GITHUB_ID, clientSecret: process.env.GITHUB_SECRET }),
    Google({ clientId: process.env.GOOGLE_ID, clientSecret: process.env.GOOGLE_SECRET }),
    Resend({ apiKey: process.env.AUTH_RESEND_KEY, from: 'noreply@themoltpit.com' }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.playerId = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.playerId) session.user.id = token.playerId as string;
      return session;
    },
  },
});
```

### 2. Auth API route
`web/src/pages/api/auth/[...nextauth].ts` — proxy to Auth.js handlers

### 3. Player token endpoint
`web/src/pages/api/player/token.ts`
- Auth required (session check)
- Generates or returns existing player token (UUID stored in Redis: `player:token:{userId}`)
- This token is what the OpenClaw plugin uses to authenticate queue pushes

```typescript
// POST /api/player/token
// Returns: { token: string, playerId: string }
```

### 4. Session middleware for protected routes
`web/src/middleware.ts` — protect `/shell` (armory), `/tank` (lobby) with redirect to `/sign-in` if no session

### 5. Sign-in page
`web/src/pages/sign-in.astro` — minimal, matches game aesthetic (dark, cyan accents)
- "Sign in with GitHub" / "Sign in with Google" / "Email magic link"
- Copy: "Join the pit."

### 6. Auth state in nav
Update `CogCageLanding.jsx` and nav to show:
- Signed out: "Enter the Pit" → `/sign-in`
- Signed in: username + "The Den" → `/den`

## Environment Variables Needed (add to Vercel)
```
AUTH_SECRET=<random 32 chars>
GITHUB_ID=<OAuth app client id>
GITHUB_SECRET=<OAuth app client secret>
GOOGLE_ID=<OAuth app client id>
GOOGLE_SECRET=<OAuth app client secret>
AUTH_RESEND_KEY=<Resend API key>  # for magic links
```

## Redis Schema
```
player:token:{userId}  →  string (UUID player token)
player:profile:{userId} →  JSON { username, createdAt, hardness: 1000 }
```

## Acceptance Criteria
- [ ] Can sign in via GitHub and Google
- [ ] Session persists across page loads
- [ ] `GET /api/player/token` returns a stable token for authenticated users
- [ ] `/shell` (armory) requires auth — redirects to `/sign-in` if not
- [ ] Sign-in page matches game aesthetic
- [ ] Build passes: `npm --prefix web run build`
- [ ] PR opened with CHANGELOG entry

## Notes
- Don't build username customization yet — use GitHub/Google display name as default
- Don't build `/den` (dashboard) yet — that's TASK-023
- Player token is the auth mechanism for the OpenClaw plugin (TASK-024)
