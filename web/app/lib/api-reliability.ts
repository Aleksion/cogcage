function readEnv(name: string): string {
  const fromImportMeta = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env?.[name];
  const fromProcess = process.env[name];
  return (fromImportMeta ?? fromProcess ?? '').trim();
}

/**
 * Persist idempotency receipts only for stable outcomes.
 * Avoid replay-locking transient responses (429/5xx) after infra recovers.
 */
export function shouldPersistIdempotencyReceipt(status: number): boolean {
  if (!Number.isFinite(status)) return false;
  if (status >= 200 && status < 300) return true;
  if (status >= 400 && status < 500 && status !== 408 && status !== 425 && status !== 429) return true;
  return false;
}

/**
 * Runtime-safe founder checkout URL resolution for server handlers.
 * Accepts only valid HTTPS URLs.
 */
export function resolveFounderCheckoutUrl(): string | undefined {
  const candidate = readEnv('PUBLIC_STRIPE_FOUNDER_URL');
  if (!candidate) return undefined;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}
