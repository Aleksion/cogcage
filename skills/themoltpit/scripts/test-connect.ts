#!/usr/bin/env bun
/**
 * test-connect.ts — Smoke test for the decide() pipeline.
 *
 * Run: bun run skills/themoltpit/scripts/test-connect.ts
 *
 * 1. Mocks a WebSocket tick event with a sample GameState
 * 2. Calls decide() directly with the mock state
 * 3. Logs the action output
 * 4. Verifies it's valid JSON with an `action` field
 */

import { decide, type GameState, type Action } from "./decide";
import type { PluginConfig } from "./connect";

// ── Mock data ────────────────────────────────────────────────────────

const mockState: GameState = {
  crawlerId: "crawlerA",
  hp: 75,
  position: { x: 6, y: 10 },
  energy: 80,
  facing: "E",
  opponents: [
    {
      id: "crawlerB",
      hp: 90,
      position: { x: 11, y: 10 },
      facing: "W",
    },
  ],
  availableClaws: ["MOVE_E", "RANGED_SHOT", "GUARD", "DASH", "NO_OP"],
  tick: 42,
  maxTicks: 200,
};

const mockConfig: PluginConfig = {
  playerToken: "test-token",
  engineUrl: "https://engine.themoltpit.com",
  model: "gpt-4o-mini",
  maxTokens: 30,
  directive:
    'You are a tactical combat agent. Respond with JSON only: {"action":"ACTION_ID","targetId":"optional"}',
  crawlerId: "crawlerA",
};

// ── Validation ───────────────────────────────────────────────────────

function validate(action: Action | null): void {
  if (!action) {
    throw new Error("decide() returned null — expected an Action object");
  }

  if (typeof action !== "object") {
    throw new Error(`Expected object, got ${typeof action}`);
  }

  if (typeof action.action !== "string" || action.action.length === 0) {
    throw new Error(
      `Missing or invalid "action" field: ${JSON.stringify(action)}`,
    );
  }

  console.log(
    `[test] Valid action: ${action.action}${action.targetId ? ` -> ${action.targetId}` : ""}`,
  );
}

// ── Run ──────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("[test] Mock game state:");
  console.log(JSON.stringify(mockState, null, 2));
  console.log();

  if (!process.env.OPENAI_API_KEY) {
    console.log("[test] No OPENAI_API_KEY set — running offline validation.\n");

    // Offline: verify types compile and validate() works on a fake action
    const fakeAction: Action = { action: "RANGED_SHOT", targetId: "crawlerB" };
    validate(fakeAction);
    console.log("[test] Offline validation passed");
    return;
  }

  console.log("[test] Calling decide() with live LLM...\n");
  const t0 = performance.now();
  const action = await decide(mockState, mockConfig);
  const ms = performance.now() - t0;

  console.log(`[test] Raw output: ${JSON.stringify(action)}`);
  console.log(`[test] Latency: ${ms.toFixed(0)}ms\n`);

  validate(action);
  console.log("[test] All checks passed");
}

main().catch((err) => {
  console.error("[test] FAILED:", err);
  process.exit(1);
});
