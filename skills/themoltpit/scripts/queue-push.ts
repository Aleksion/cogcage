/**
 * queue-push.ts — POST an action to the engine queue.
 *
 * Fire-and-forget by design: the caller does not need to await the result
 * during the hot tick loop. Engine handles missing actions as NO_OP.
 */

import type { Action } from "./decide";

export async function queuePush(
  moltId: string,
  crawlerId: string,
  action: Action,
  tick: number,
  token: string,
  engineUrl: string,
): Promise<void> {
  try {
    await fetch(`${engineUrl}/molt/${moltId}/queue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ crawlerId, action, tick }),
    });
  } catch (err) {
    console.warn("[MoltPit] queue push failed:", err);
    // Non-fatal — engine handles missing actions as NO_OP
  }
}
