# TASK-021: Multiplayer Ownership — Fix the Config Bug

## The Bug
Right now, any player in a lobby can modify any bot's configuration — including their opponent's. This breaks competitive integrity entirely.

## What to Build

### 1. Lobby ownership model
Each lobby has an owner (the creator) and an optional challenger.

Update `web/src/pages/api/lobby/index.ts` (or wherever lobbies are created):
```typescript
interface Lobby {
  id: string;
  ownerId: string;        // userId of creator
  challengerId?: string;  // userId of opponent (set when they join)
  ownerBot: BotConfig;    // owner's bot — only owner can edit
  challengerBot: BotConfig; // challenger's bot — only challenger can edit
  status: 'waiting' | 'ready' | 'active' | 'complete';
  createdAt: number;
}
```

Redis schema:
```
lobby:{id}  →  JSON (Lobby object)
lobby:list  →  sorted set, score = createdAt (for lobby browser)
```

### 2. Join endpoint
`POST /api/lobby/[id]/join` — requires auth
- Sets `challengerId = session.user.id`
- Initializes `challengerBot` with defaults
- Returns updated lobby state

### 3. Bot config ownership enforcement
`PUT /api/lobby/[id]/bot` — requires auth
- Only owner can update `ownerBot`
- Only challenger can update `challengerBot`
- Return 403 if wrong player tries to edit

### 4. Challenge URL
When a lobby is created, it gets a shareable URL:
```
https://themoltpit.com/tank/{lobbyId}
```
Owner sends this to their opponent. Opponent clicks, joins as challenger, configures their own shell.

### 5. Update The Tank (lobby page)
`web/src/components/Lobby.tsx` (or equivalent):
- Show two panels: "Your Shell" (editable) + "Opponent's Shell" (read-only for you)
- If no challenger yet: show "Waiting for opponent..." + copy the challenge URL
- If you're the challenger: your panel is the right side
- Start button only appears when both players are ready (have configured their shell)

### 6. Spectator mode
If you open a lobby URL and you're neither owner nor challenger (or not signed in):
- Read-only view of both shells
- Can watch the match in real time via DO WebSocket (TASK-004)
- No config controls shown at all

## Acceptance Criteria
- [ ] Can create a lobby → get a shareable URL
- [ ] Opponent clicks URL → joins as challenger
- [ ] Each player can only edit their own bot config
- [ ] Trying to edit opponent's config returns 403
- [ ] Both players must mark "Ready" before match starts
- [ ] Signed-out users see spectator-only view
- [ ] Build passes: `npm --prefix web run build`
- [ ] PR opened with CHANGELOG entry

## Depends On
- TASK-020 (auth) — needs session.user.id to assign ownership

## Notes
- This should not touch the DO engine — ownership is purely a Vercel/Redis concern
- Keep the existing Play.tsx single-player demo path working — don't break it
- "The Tank" is the new name for lobby (TASK-022 will rename in copy, but use new naming here)
