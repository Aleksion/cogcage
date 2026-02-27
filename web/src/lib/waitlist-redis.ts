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

// ── Waitlist ─────────────────────────────────────────────────────────────────

export async function redisInsertWaitlistLead(lead: {
  email: string;
  game: string;
  source: string;
  userAgent?: string;
  ipAddress?: string;
}): Promise<void> {
  const r = getRedis();
  const entry = JSON.stringify({ ...lead, createdAt: new Date().toISOString() });
  await r.lpush(WAITLIST_KEY, entry);
  // Trim to cap storage
  void r.ltrim(WAITLIST_KEY, 0, MAX_WAITLIST - 1);
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
  const entry = JSON.stringify({ ...intent, createdAt: new Date().toISOString() });
  await r.lpush(FOUNDER_INTENT_KEY, entry);
  void r.ltrim(FOUNDER_INTENT_KEY, 0, MAX_WAITLIST - 1);
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
  const entry = JSON.stringify({ ...event, createdAt: new Date().toISOString() });
  await r.lpush(CONVERSIONS_KEY, entry);
  void r.ltrim(CONVERSIONS_KEY, 0, MAX_CONVERSIONS - 1);
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
    resetMs: (windowId + 1) * windowMs,
  };
}
