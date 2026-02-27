import { DurableObject } from 'cloudflare:workers';
import { validateToken, validateSecret } from './auth.js';
import { advanceTick, buildMatchResult, createActorState, createInitialState } from './game/engine.js';
import { TICK_MS, MAX_QUEUE_DEPTH, MATCH_TIMEOUT_MS } from './game/constants.js';
import { UNIT_SCALE } from './game/constants.js';
import type { AgentAction, BotConfig, BotStats, GameState, MatchResult } from './game/types.js';

interface Env {
  MATCH: DurableObjectNamespace;
  COGCAGE_ENGINE_SECRET?: string;
}

export class MatchEngine extends DurableObject<Env> {
  private matchState: GameState | null = null;
  private queues = new Map<string, AgentAction[]>();
  private matchId: string | null = null;
  private startedAt: number | null = null;
  private botStats = new Map<string, BotStats>();

  // ── Route incoming requests ──

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket upgrade
    if (request.headers.get('Upgrade') === 'websocket') {
      return this.handleWebSocket(request);
    }

    // POST /start
    if (request.method === 'POST' && path.endsWith('/start')) {
      return this.handleStart(request);
    }

    // POST /queue
    if (request.method === 'POST' && path.endsWith('/queue')) {
      return this.handleQueuePush(request);
    }

    // GET /state
    if (request.method === 'GET' && path.endsWith('/state')) {
      return this.handleGetState();
    }

    return jsonResponse({ error: 'Not found' }, 404);
  }

  // ── WebSocket ──

  async handleWebSocket(request: Request): Promise<Response> {
    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];

    // Extract botId from query param or token
    const url = new URL(request.url);
    const botId = url.searchParams.get('botId') ?? 'spectator';

    this.ctx.acceptWebSocket(server, [botId]);

    server.send(
      JSON.stringify({
        type: 'connected',
        botId,
        matchId: this.matchId,
        tick: this.matchState?.tick ?? 0,
      }),
    );

    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): void {
    // Clients don't send game messages over WS — they use POST /queue.
    // But we handle pings gracefully.
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        if (parsed.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong', tick: this.matchState?.tick ?? 0 }));
        }
      } catch {
        // ignore malformed messages
      }
    }
  }

  webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean): void {
    // Hibernation handles cleanup automatically
  }

  webSocketError(ws: WebSocket, error: unknown): void {
    ws.close(1011, 'WebSocket error');
  }

  // ── Start match ──

  async handleStart(request: Request): Promise<Response> {
    if (!validateSecret(request, this.env.COGCAGE_ENGINE_SECRET)) {
      return jsonResponse({ error: 'Unauthorized' }, 401);
    }

    if (this.matchState && !this.matchState.ended) {
      return jsonResponse({ error: 'Match already in progress' }, 409);
    }

    const body = (await request.json()) as {
      botA: BotConfig;
      botB: BotConfig;
      seed?: number;
      matchId?: string;
    };

    const seed = body.seed ?? Date.now();
    this.matchId = body.matchId ?? crypto.randomUUID();

    const actors = {
      [body.botA.id]: createActorState({
        id: body.botA.id,
        position: body.botA.position ?? { x: 6 * UNIT_SCALE, y: 10 * UNIT_SCALE },
        facing: 'E',
        armor: body.botA.armor ?? 'medium',
        moveCost: body.botA.moveCost,
      }),
      [body.botB.id]: createActorState({
        id: body.botB.id,
        position: body.botB.position ?? { x: 14 * UNIT_SCALE, y: 10 * UNIT_SCALE },
        facing: 'W',
        armor: body.botB.armor ?? 'medium',
        moveCost: body.botB.moveCost,
      }),
    };

    this.matchState = createInitialState({ seed, actors });
    this.queues.set(body.botA.id, []);
    this.queues.set(body.botB.id, []);
    this.botStats.set(body.botA.id, { ticksPlayed: 0, ticksMissed: 0, actionsQueued: 0 });
    this.botStats.set(body.botB.id, { ticksPlayed: 0, ticksMissed: 0, actionsQueued: 0 });
    this.startedAt = Date.now();

    // Persist initial state
    this.ctx.storage.sql.exec(
      `CREATE TABLE IF NOT EXISTS ticks (tick INTEGER PRIMARY KEY, state TEXT NOT NULL)`,
    );
    this.ctx.storage.sql.exec(
      `INSERT INTO ticks (tick, state) VALUES (?, ?)`,
      0,
      JSON.stringify(this.matchState),
    );

    // Schedule first tick
    await this.ctx.storage.setAlarm(Date.now() + TICK_MS);

    return jsonResponse({ matchId: this.matchId, ok: true });
  }

  // ── Queue action ──

  async handleQueuePush(request: Request): Promise<Response> {
    const auth = validateToken(request);
    if (!auth.ok) {
      return jsonResponse({ error: auth.error }, 401);
    }

    if (!this.matchState || this.matchState.ended) {
      return jsonResponse({ error: 'No active match' }, 400);
    }

    const botId = auth.botId!;
    if (!this.queues.has(botId)) {
      return jsonResponse({ error: `Unknown bot: ${botId}` }, 403);
    }

    const queue = this.queues.get(botId)!;
    if (queue.length >= MAX_QUEUE_DEPTH) {
      return jsonResponse({ error: 'Queue full', queueDepth: queue.length }, 429);
    }

    const action = (await request.json()) as AgentAction;
    action.actorId = botId;
    queue.push(action);

    const stats = this.botStats.get(botId);
    if (stats) stats.actionsQueued++;

    return jsonResponse({ ok: true, queueDepth: queue.length });
  }

  // ── State snapshot ──

  handleGetState(): Response {
    if (!this.matchState) {
      return jsonResponse({ error: 'No match' }, 404);
    }

    // Return state without the full events array (too large for polling)
    const { events: _, ...stateWithoutEvents } = this.matchState;
    return jsonResponse({
      ...stateWithoutEvents,
      matchId: this.matchId,
      eventCount: this.matchState.events.length,
    });
  }

  // ── Tick loop ──

  async alarm(): Promise<void> {
    if (!this.matchState || this.matchState.ended) return;

    // Watchdog: kill match if it's been running too long
    if (this.startedAt && Date.now() - this.startedAt > MATCH_TIMEOUT_MS) {
      this.matchState.ended = true;
      this.matchState.endReason = 'TIMEOUT_WATCHDOG';
      this.broadcast({ type: 'match_complete', result: buildMatchResult(this.matchState, this.botStats) });
      return;
    }

    // 1. Pop one action per bot (or nothing → engine defaults to NO_OP)
    const actionsByActor = new Map<string, AgentAction>();
    for (const [botId, queue] of this.queues.entries()) {
      const stats = this.botStats.get(botId);
      if (stats) stats.ticksPlayed++;
      if (queue.length > 0) {
        actionsByActor.set(botId, queue.shift()!);
      } else if (stats) {
        stats.ticksMissed++;
      }
    }

    // 2. Clear per-tick events before advancing
    this.matchState.events = [];

    // 3. Advance tick
    advanceTick(this.matchState, actionsByActor);

    // 4. Persist tick to SQLite
    this.ctx.storage.sql.exec(
      `INSERT OR REPLACE INTO ticks (tick, state) VALUES (?, ?)`,
      this.matchState.tick,
      JSON.stringify(this.matchState),
    );

    // 5. Broadcast to all WebSocket connections
    const { events: _, ...stateWithoutEvents } = this.matchState;
    this.broadcast({
      type: 'tick',
      state: stateWithoutEvents,
      tick: this.matchState.tick,
      events: this.matchState.events,
    });

    // 6. Check if match is over
    if (this.matchState.ended) {
      const result = buildMatchResult(this.matchState, this.botStats);
      this.broadcast({ type: 'match_complete', result });
      return;
    }

    // 7. Schedule next alarm
    await this.ctx.storage.setAlarm(Date.now() + TICK_MS);
  }

  // ── Broadcast to all hibernated WebSockets ──

  private broadcast(message: Record<string, unknown>): void {
    const payload = JSON.stringify(message);
    for (const ws of this.ctx.getWebSockets()) {
      try {
        ws.send(payload);
      } catch {
        // WebSocket already closed — hibernation will clean up
      }
    }
  }
}

// ── Helpers ──

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
