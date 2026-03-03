import { appendOpsLog } from './observability';
import { upsertCheckoutState } from './waitlist-db';
import { redisUpsertCheckoutState } from './waitlist-redis';

function safeMetaJson(meta: Record<string, unknown> | undefined) {
  if (!meta) return undefined;
  try {
    const serialized = JSON.stringify(meta);
    return serialized.length > 4000
      ? JSON.stringify({ truncated: true, preview: serialized.slice(0, 3800) })
      : serialized;
  } catch {
    return JSON.stringify({ invalidMeta: true });
  }
}

export async function recordCheckoutState(input: {
  route: string;
  requestId: string;
  transactionId: string;
  state: string;
  source?: string;
  email?: string;
  providerEventId?: string;
  meta?: Record<string, unknown>;
}) {
  const payload = {
    transactionId: input.transactionId,
    state: input.state,
    source: input.source,
    email: input.email,
    providerEventId: input.providerEventId,
    metaJson: safeMetaJson(input.meta),
    requestId: input.requestId,
  };

  let persisted = false;

  try {
    await redisUpsertCheckoutState(payload);
    persisted = true;
  } catch (error) {
    appendOpsLog({
      route: input.route,
      level: 'warn',
      event: 'checkout_state_redis_write_failed',
      requestId: input.requestId,
      transactionId: input.transactionId,
      state: input.state,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  try {
    upsertCheckoutState(payload);
    persisted = true;
  } catch (error) {
    appendOpsLog({
      route: input.route,
      level: 'warn',
      event: 'checkout_state_sqlite_write_failed',
      requestId: input.requestId,
      transactionId: input.transactionId,
      state: input.state,
      error: error instanceof Error ? error.message : 'unknown',
    });
  }

  if (!persisted) {
    appendOpsLog({
      route: input.route,
      level: 'error',
      event: 'checkout_state_write_failed',
      requestId: input.requestId,
      transactionId: input.transactionId,
      state: input.state,
    });
    return;
  }

  appendOpsLog({
    route: input.route,
    level: 'info',
    event: 'checkout_state_recorded',
    requestId: input.requestId,
    transactionId: input.transactionId,
    state: input.state,
    source: input.source,
  });
}
