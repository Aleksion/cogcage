/**
 * waitlist-redis.ts — Durable Redis-backed storage for waitlist leads, founder intents,
 * conversion events, and observable ops logs.
 *
 * Replaces ephemeral SQLite (/tmp) as primary storage tier on Vercel.
 * SQLite remains as a local-dev / fallback secondary tier.
 *
 * Redis key layout:
 *   moltpit:waitlist              LIST  — newline-delimited JSON entries (newest first)
 *   moltpit:founder-intents       LIST  — newline-delimited JSON entries (newest first)
 *   moltpit:conversions           LIST  — newline-delimited JSON entries (newest first)
 *   moltpit:ops-log               LIST  — last 500 structured log lines (newest first)
 *   moltpit:ratelimit:{key}:{win} STRING — counter per sliding window bucket
 */

import { Redis } from '@upstash/redis';

const MAX_WAITLIST = 20_000;
const MAX_CONVERSIONS = 10_000;
const MAX_OPS_LOG = 500;

const WAITLIST_KEY = 'moltpit:waitlist';
const FOUNDER_INTENT_KEY = 'moltpit:founder-intents';
const CONVERSIONS_KEY = 'moltpit:conversions';
const OPS_LOG_KEY = 'moltpit:ops-log';
const RATE_LIMIT_PREFIX = 'moltpit:ratelimit:';
const IDEMPOTENCY_PREFIX = 'moltpit:idempotency:';
const WAITLIST_EMAIL_PREFIX = 'moltpit:waitlist:email:';
const FOUNDER_INTENT_ID_PREFIX = 'moltpit:founder-intent:id:';
const CONVERSION_EVENT_ID_PREFIX = 'moltpit:conversion:event-id:';
const IDEMPOTENCY_TTL_SECONDS = 3 * 24 * 60 * 60;
const DEDUPE_TTL_SECONDS = 365 * 24 * 60 * 60;

function getRedis(): Redis {
  const url = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.UPSTASH_REDIS_REST_URL
    ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
    ?.UPSTASH_REDIS_REST_TOKEN
    ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error('Upstash Redis credentials not configured');
  }
  return new Redis({ url, token });
}

export type RedisFunnelCounts = {
  waitlistLeads: number;
  founderIntents: number;
  conversionEvents: number;
};

type RedisApiRequestReceipt = {
  route: string;
  idempotencyKey: string;
  responseStatus: number;
  responseBody: string;
  createdAt?: string;
};

function idempotencyRedisKey(route: string, idempotencyKey: string) {
  const routeKey = route.replace(/[^a-z0-9_-]/gi, '_').slice(0, 80);
  return `${IDEMPOTENCY_PREFIX}${routeKey}:${idempotencyKey}`;
}

function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

// ── Waitlist ─────────────────────────────────────────────────────────────────

export async function redisInsertWaitlistLead(lead: {
  email: string;
  game: string;
  source: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<void> {
  const r = getRedis();
  const normalizedEmail = lead.email.trim().toLowerCase();
  const entry = JSON.stringify({ ...lead, email: normalizedEmail, createdAt: new Date().toISOString() });
  const leadKey = `${WAITLIST_EMAIL_PREFIX}${normalizedEmail}`;
  const inserted = await r.set(leadKey, entry, { nx: true, ex: DEDUPE_TTL_SECONDS });
  if (inserted) {
    await r.lpush(WAITLIST_KEY, entry);
    // Trim to cap storage
    void r.ltrim(WAITLIST_KEY, 0, MAX_WAITLIST - 1);
    return;
  }

  // Keep latest attributes for this email while preserving unique-list semantics.
  await r.set(leadKey, entry, { ex: DEDUPE_TTL_SECONDS });
}

// ── Founder Intent ────────────────────────────────────────────────────────────

export async function redisInsertFounderIntent(intent: {
  email: string;
  source: string;
  intentId?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<void> {
  const r = getRedis();
  const normalizedEmail = intent.email.trim().toLowerCase();
  const dedupeId =
    intent.intentId?.trim()
    || `derived:${new Date().toISOString().slice(0, 10)}:${hashString(`${normalizedEmail}|${intent.source}`)}`;
  const entry = JSON.stringify({
    ...intent,
    email: normalizedEmail,
    intentId: intent.intentId?.trim() || dedupeId,
    createdAt: new Date().toISOString(),
  });
  const intentKey = `${FOUNDER_INTENT_ID_PREFIX}${dedupeId}`;
  const inserted = await r.set(intentKey, entry, { nx: true, ex: DEDUPE_TTL_SECONDS });
  if (inserted) {
    await r.lpush(FOUNDER_INTENT_KEY, entry);
    void r.ltrim(FOUNDER_INTENT_KEY, 0, MAX_WAITLIST - 1);
    return;
  }

  await r.set(intentKey, entry, { ex: DEDUPE_TTL_SECONDS });
}

// ── Conversion Events ─────────────────────────────────────────────────────────

export async function redisInsertConversionEvent(event: {
  eventName: string;
  eventId?: string;
  page?: string;
  href?: string;
  tier?: string;
  source?: string;
  email?: string;
  metaJson?: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<void> {
  const r = getRedis();
  const normalizedEmail = event.email?.trim().toLowerCase();
  const entry = JSON.stringify({
    ...event,
    email: normalizedEmail,
    createdAt: new Date().toISOString(),
  });
  const eventId = event.eventId?.trim();

  if (!eventId) {
    await r.lpush(CONVERSIONS_KEY, entry);
    void r.ltrim(CONVERSIONS_KEY, 0, MAX_CONVERSIONS - 1);
    return;
  }

  const conversionKey = `${CONVERSION_EVENT_ID_PREFIX}${eventId}`;
  const inserted = await r.set(conversionKey, entry, { nx: true, ex: DEDUPE_TTL_SECONDS });
  if (inserted) {
    await r.lpush(CONVERSIONS_KEY, entry);
    void r.ltrim(CONVERSIONS_KEY, 0, MAX_CONVERSIONS - 1);
    return;
  }

  await r.set(conversionKey, entry, { ex: DEDUPE_TTL_SECONDS });
}

// ── Ops Log ───────────────────────────────────────────────────────────────────

export async function redisAppendOpsLog(logEvent: Record<string, unknown>): Promise<void> {
  const r = getRedis();
  const entry = JSON.stringify({ ts: new Date().toISOString(), ...logEvent });
  await r.lpush(OPS_LOG_KEY, entry);
  void r.ltrim(OPS_LOG_KEY, 0, MAX_OPS_LOG - 1);
}

export async function redisGetOpsLogTail(n = 50): Promise<string[]> {
  const r = getRedis();
  const raw = await r.lrange(OPS_LOG_KEY, 0, n - 1);
  return raw as string[];
}

// ── Funnel Counts ─────────────────────────────────────────────────────────────

export async function redisGetFunnelCounts(): Promise<RedisFunnelCounts> {
  const r = getRedis();
  const [waitlist, founder, conversions] = await Promise.all([
    r.llen(WAITLIST_KEY),
    r.llen(FOUNDER_INTENT_KEY),
    r.llen(CONVERSIONS_KEY),
  ]);
  return {
    waitlistLeads: waitlist ?? 0,
    founderIntents: founder ?? 0,
    conversionEvents: conversions ?? 0,
  };
}

// ── Idempotency Receipts ─────────────────────────────────────────────────────

export async function redisReadApiRequestReceipt(route: string, idempotencyKey: string): Promise<RedisApiRequestReceipt | null> {
  const r = getRedis();
  const raw = await r.get(idempotencyRedisKey(route, idempotencyKey));
  if (typeof raw !== 'string' || raw.length === 0) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as RedisApiRequestReceipt;
    if (!parsed || typeof parsed !== 'object') return null;
    if (typeof parsed.responseStatus !== 'number' || typeof parsed.responseBody !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function redisWriteApiRequestReceipt(receipt: {
  route: string;
  idempotencyKey: string;
  responseStatus: number;
  responseBody: string;
}): Promise<void> {
  const r = getRedis();
  const key = idempotencyRedisKey(receipt.route, receipt.idempotencyKey);
  const value = JSON.stringify({
    ...receipt,
    createdAt: new Date().toISOString(),
  });
  await r.set(key, value, { nx: true, ex: IDEMPOTENCY_TTL_SECONDS });
}

// ── Rate Limiting (Redis-native, survives across Lambda invocations) ──────────

export async function redisConsumeRateLimit(
  key: string,
  max: number,
  windowMs: number,
): Promise<{ allowed: boolean; remaining: number; resetMs: number }> {
  const r = getRedis();
  const now = Date.now();
  const windowId = Math.floor(now / windowMs);
  const windowKey = `${RATE_LIMIT_PREFIX}${key}:${windowId}`;

  const count = await r.incr(windowKey);
  if (count === 1) {
    await r.pexpire(windowKey, windowMs);
  }

  const remaining = Math.max(0, max - count);
  return {
    allowed: count <= max,
    remaining,
    resetMs: Math.max(0, (windowId + 1) * windowMs - now),
  };
}
