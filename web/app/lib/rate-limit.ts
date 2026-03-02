export function computeRateLimitResetMs(now: number, windowMs: number): number {
  const windowId = Math.floor(now / windowMs);
  return Math.max(0, ((windowId + 1) * windowMs) - now);
}
