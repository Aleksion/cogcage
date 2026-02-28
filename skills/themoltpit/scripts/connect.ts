/**
 * connect.ts — WebSocket client to the MoltEngine Durable Object.
 *
 * Connects to the engine, receives tick events, calls decide() + queuePush()
 * in a fire-and-forget pipeline. Auto-reconnects with exponential backoff
 * (500ms → 1s → 2s → 4s → 8s cap).
 */

import { decide, type GameState } from "./decide";
import { queuePush } from "./queue-push";

export interface PluginConfig {
  playerToken: string;
  engineUrl: string;
  model: string;
  maxTokens: number;
  directive: string; // from the player's shell config
  crawlerId: string;
}

interface Stats {
  ticksReceived: number;
  ticksAnswered: number;
  totalDecideMs: number;
  ticksMissed: number;
}

function printStats(stats: Stats): void {
  const avg =
    stats.ticksAnswered > 0
      ? (stats.totalDecideMs / stats.ticksAnswered).toFixed(1)
      : "N/A";
  const hitRate =
    stats.ticksReceived > 0
      ? ((stats.ticksAnswered / stats.ticksReceived) * 100).toFixed(1)
      : "0";

  console.log("\n--- Molt Stats ---");
  console.log(`Ticks received:    ${stats.ticksReceived}`);
  console.log(`Ticks answered:    ${stats.ticksAnswered}`);
  console.log(`Ticks missed:      ${stats.ticksMissed}`);
  console.log(`Avg decision ms:   ${avg}`);
  console.log(`Hit rate:          ${hitRate}%`);
  console.log("------------------\n");
}

export async function connect(
  moltId: string,
  config: PluginConfig,
): Promise<void> {
  const wsBase = config.engineUrl.replace(/^https?:\/\//, "wss://");
  const url = `${wsBase}/molt/${moltId}/ws?crawlerId=${config.crawlerId}&token=${config.playerToken}`;

  const stats: Stats = {
    ticksReceived: 0,
    ticksAnswered: 0,
    totalDecideMs: 0,
    ticksMissed: 0,
  };
  let attempt = 0;
  let intentionalClose = false;

  const open = () => {
    console.log(`[MoltPit] connecting`);
    const ws = new WebSocket(url);

    ws.onopen = () => {
      attempt = 0;
      console.log(`[MoltPit] connected to molt ${moltId}`);
    };

    ws.onmessage = async (event) => {
      let msg: {
        type: string;
        state?: GameState;
        tick?: number;
        result?: unknown;
      };
      try {
        msg = JSON.parse(
          typeof event.data === "string"
            ? event.data
            : new TextDecoder().decode(event.data as ArrayBuffer),
        );
      } catch {
        return;
      }

      if (msg.type === "tick" && msg.state && msg.tick !== undefined) {
        stats.ticksReceived++;
        console.log(`[MoltPit] tick_received ${msg.tick}`);
        const t0 = performance.now();

        // Fire-and-forget: don't block tick loop
        decide(msg.state, config)
          .then((action) => {
            if (action) {
              const ms = performance.now() - t0;
              stats.totalDecideMs += ms;
              stats.ticksAnswered++;
              console.log(
                `[MoltPit] action_queued ${action.action} (${ms.toFixed(0)}ms)`,
              );
              queuePush(
                moltId,
                config.crawlerId,
                action,
                msg.tick!,
                config.playerToken,
                config.engineUrl,
              );
            }
          })
          .catch((err) => {
            stats.ticksMissed++;
            console.warn("[MoltPit] decide error:", err);
          });
      }

      if (msg.type === "molt_complete") {
        console.log("\n[MoltPit] Molt complete!");
        if (msg.result) console.log(JSON.stringify(msg.result, null, 2));
        printStats(stats);
        intentionalClose = true;
        ws.close();
      }
    };

    ws.onclose = () => {
      if (intentionalClose) {
        console.log("[MoltPit] connection closed.");
        return;
      }
      const delay = Math.min(500 * Math.pow(2, attempt), 8000);
      attempt++;
      console.log(
        `[MoltPit] disconnected. Reconnecting in ${delay}ms...`,
      );
      setTimeout(open, delay);
    };

    ws.onerror = (err) => console.warn("[MoltPit] WebSocket error:", err);
  };

  open();
}
