/**
 * queue-push.ts — POST an action to the engine queue.
 *
 * Fire-and-forget by design: the caller does not need to await the result
 * during the hot tick loop.
 */

const ENGINE_BASE =
  process.env.ENGINE_URL ?? "https://themoltpit-engine.aleks-precurion.workers.dev";

export interface Action {
  action: string;
  tick?: number;
  direction?: string;
  targetId?: string;
  [key: string]: unknown;
}

export async function queuePush(
  matchId: string,
  botId: string,
  action: Action,
  token: string,
): Promise<void> {
  const url = `${ENGINE_BASE}/match/${matchId}/queue`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ botId, action, tick: action.tick }),
  });

  if (!res.ok) {
    console.error(`[queue-push] ${res.status} ${res.statusText} — ${url}`);
  }
}
