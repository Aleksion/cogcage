# TASK-021: Multiplayer Ownership — Fix the Config Bug

## The Bug
Right now, any player in a tank can modify any crawler's configuration — including their opponent's. This breaks competitive integrity entirely.

## What to Build

### 1. Tank ownership model
Each tank has an owner (the creator) and an optional challenger.

Update `web/src/pages/api/tank/index.ts` (or wherever tanks are created):
```typescript
interface Tank {
  id: string;
  ownerId: string;        // userId of creator
  challengerId?: string;  // userId of opponent (set when they join)
  ownerCrawler: CrawlerConfig;    // owner's crawler — only owner can edit
  challengerCrawler: CrawlerConfig; // challenger's crawler — only challenger can edit
  status: 'waiting' | 'ready' | 'active' | 'complete';
  createdAt: number;
}
```

Redis schema:
```
tank:{id}  →  JSON (Tank object)
tank:list  →  sorted set, score = createdAt (for tank browser)
```

### 2. Join endpoint
`POST /api/tank/[id]/join` — requires auth
- Sets `challengerId = session.user.id`
- Initializes `challengerCrawler` with defaults
- Returns updated tank state

### 3. Crawler config ownership enforcement
`PUT /api/tank/[id]/crawler` — requires auth
- Only owner can update `ownerCrawler`
- Only challenger can update `challengerCrawler`
- Return 403 if wrong player tries to edit

### 4. Challenge URL
When a tank is created, it gets a shareable URL:
```
https://themoltpit.com/tank/{tankId}
```
Owner sends this to their opponent. Opponent clicks, joins as challenger, configures their own shell.

### 5. Update The Tank (tank page)
`web/src/components/Tank.tsx` (or equivalent):
- Show two panels: "Your Shell" (editable) + "Opponent's Shell" (read-only for you)
- If no challenger yet: show "Waiting for opponent..." + copy the challenge URL
- If you're the challenger: your panel is the right side
- Start button only appears when both players are ready (have configured their shell)

### 6. Spectator mode
If you open a tank URL and you're neither owner nor challenger (or not signed in):
- Read-only view of both shells
- Can watch the match in real time via DO WebSocket (TASK-004)
- No config controls shown at all

## Acceptance Criteria
- [ ] Can create a tank → get a shareable URL
- [ ] Opponent clicks URL → joins as challenger
- [ ] Each player can only edit their own crawler config
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
- "The Tank" is the official name for what was previously called lobby
