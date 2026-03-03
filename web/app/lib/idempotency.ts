function hashString(input: string) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

function normalizeLower(value: string | undefined | null, maxLen = 240) {
  if (typeof value !== 'string') return '';
  return value.trim().toLowerCase().slice(0, maxLen);
}

function isoDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

export function sanitizeIdempotencyKey(value: string | undefined | null, maxLen = 120) {
  const normalized = typeof value === 'string' ? value.trim().slice(0, maxLen) : '';
  return normalized || undefined;
}

export function deriveWaitlistIdempotencyKey(
  email: string,
  source: string,
  now = new Date(),
) {
  const day = isoDay(now);
  const normalizedEmail = normalizeLower(email, 180);
  const normalizedSource = normalizeLower(source, 120) || 'moltpit-landing';
  return `waitlist:${day}:${hashString(`${normalizedEmail}|${normalizedSource}|${day}`)}`.slice(0, 120);
}

export function deriveFounderIntentIdempotencyKey(
  {
    intentId,
    email,
    source,
  }: {
    intentId?: string;
    email: string;
    source: string;
  },
  now = new Date(),
) {
  const normalizedIntentId = normalizeLower(intentId, 180);
  if (normalizedIntentId) {
    return `founder_intent:${normalizedIntentId}`.slice(0, 120);
  }

  const day = isoDay(now);
  const normalizedEmail = normalizeLower(email, 180);
  const normalizedSource = normalizeLower(source, 120) || 'founder-checkout';
  return `founder_intent:${day}:${hashString(`${normalizedEmail}|${normalizedSource}|${day}`)}`.slice(0, 120);
}

export function deriveCheckoutSuccessIdempotencyKey(
  {
    eventId,
    source,
    email,
    page,
    href,
    tier,
  }: {
    eventId?: string;
    source?: string;
    email?: string;
    page?: string;
    href?: string;
    tier?: string;
  },
  now = new Date(),
) {
  const normalizedEventId = normalizeLower(eventId, 180);
  if (normalizedEventId) {
    return `checkout_success:${normalizedEventId}`.slice(0, 120);
  }

  const fingerprint = [
    normalizeLower(source, 120) || 'stripe-success',
    normalizeLower(email, 180) || 'anon',
    normalizeLower(page, 120),
    normalizeLower(href, 600),
    normalizeLower(tier, 60) || 'founder',
    'fallback-v1',
  ].join('|');
  return `checkout_success:fallback:${hashString(fingerprint)}`.slice(0, 120);
}
