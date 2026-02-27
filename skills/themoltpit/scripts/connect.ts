#!/usr/bin/env ts-node
/**
 * connect.ts — WebSocket client to the MatchEngine Durable Object.
 *
 * Usage:
 *   npx ts-node scripts/connect.ts --match <matchId> --bot <botId>
 *
 * Reads config from ~/.openclaw/skills/themoltpit/config.yaml
 */

import { readFileSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import WebSocket from "ws";
import { parse as parseYaml } from "yaml";
import { decide, type DecideConfig, type GameState } from "./decide";
import { queuePush, type Action } from "./queue-push";
import { runSkillsAsync } from "./skills-runner";
import OpenAI from "openai";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

interface MoltPitConfig {
  playerToken: string;
  matchId: string;
  botId: string;
  model: string;
  maxTokens: number;
  systemPrompt: string;
  skills?: string[];
  openaiApiKey?: string;
}

function loadConfig(overrides: Partial<MoltPitConfig>): MoltPitConfig {
  const cfgPath = join(homedir(), ".openclaw", "skills", "themoltpit", "config.yaml");
  let fileConfig: Record<string, unknown> = {};
  try {
    const raw = readFileSync(cfgPath, "utf-8");
    const parsed = parseYaml(raw) as Record<string, unknown>;
    fileConfig = (parsed?.themoltpit as Record<string, unknown>) ?? {};
  } catch {
    console.warn(`[connect] No config at ${cfgPath} — using defaults + CLI args`);
  }

  return {
    playerToken: (overrides.playerToken ?? fileConfig.playerToken ?? "") as string,
    matchId: (overrides.matchId ?? fileConfig.matchId ?? "") as string,
    botId: (overrides.botId ?? fileConfig.botId ?? "") as string,
    model: (overrides.model ?? fileConfig.model ?? "gpt-4o-mini") as string,
    maxTokens: Number(overrides.maxTokens ?? fileConfig.maxTokens ?? 30),
    systemPrompt: (overrides.systemPrompt ?? fileConfig.systemPrompt ?? defaultSystemPrompt) as string,
    skills: (fileConfig.skills as string[] | undefined) ?? [],
    openaiApiKey: (overrides.openaiApiKey ?? fileConfig.openaiApiKey ?? process.env.OPENAI_API_KEY ?? "") as string,
  };
}

const defaultSystemPrompt = `You are a tactical combat agent. Respond with JSON only.
{"action":"ACTION_ID"} — valid actions: MOVE, MELEE_STRIKE, RANGED_SHOT, GUARD, DASH, NO_OP
For MOVE: {"action":"MOVE","direction":"north|south|east|west"}
For attacks: {"action":"RANGED_SHOT","targetId":"botB"}`;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(): Partial<MoltPitConfig> {
  const args = process.argv.slice(2);
  const get = (flag: string): string | undefined => {
    const idx = args.indexOf(flag);
    return idx !== -1 ? args[idx + 1] : undefined;
  };
  return {
    matchId: get("--match"),
    botId: get("--bot"),
    playerToken: get("--token"),
    model: get("--model"),
  };
}

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

interface Stats {
  ticksReceived: number;
  ticksAnswered: number;
  totalDecideMs: number;
  ticksMissed: number;
}

function printStats(stats: Stats): void {
  const avgLatency = stats.ticksAnswered > 0
    ? (stats.totalDecideMs / stats.ticksAnswered).toFixed(1)
    : "N/A";

  console.log("\n--- Match Stats ---");
  console.log(`Ticks received:    ${stats.ticksReceived}`);
  console.log(`Ticks answered:    ${stats.ticksAnswered}`);
  console.log(`Ticks missed:      ${stats.ticksMissed}`);
  console.log(`Avg decision ms:   ${avgLatency}`);
  console.log(`Hit rate:          ${stats.ticksReceived > 0 ? ((stats.ticksAnswered / stats.ticksReceived) * 100).toFixed(1) : 0}%`);
  console.log("-------------------\n");
}

// ---------------------------------------------------------------------------
// WebSocket connection
// ---------------------------------------------------------------------------

const ENGINE_WS =
  process.env.ENGINE_WS_URL ?? "wss://themoltpit-engine.aleks-precurion.workers.dev";

const MAX_RETRIES = 5;

function connectWs(config: MoltPitConfig): void {
  const stats: Stats = { ticksReceived: 0, ticksAnswered: 0, totalDecideMs: 0, ticksMissed: 0 };
  let retries = 0;
  let skillsContext = "";
  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const decideConfig: DecideConfig = {
    model: config.model,
    maxTokens: config.maxTokens,
    systemPrompt: config.systemPrompt,
    openaiApiKey: config.openaiApiKey,
  };

  function open(): void {
    const url = `${ENGINE_WS}/match/${config.matchId}?botId=${config.botId}&token=${config.playerToken}`;
    console.log(`[connect] Connecting to ${url}`);
    const ws = new WebSocket(url);

    ws.on("open", () => {
      console.log("[connect] Connected. Waiting for ticks...");
      retries = 0;
    });

    ws.on("message", (data: WebSocket.Data) => {
      let event: { type: string; state?: GameState; tick?: number; result?: unknown };
      try {
        event = JSON.parse(data.toString());
      } catch {
        console.error("[connect] Bad JSON from engine");
        return;
      }

      if (event.type === "tick" && event.state !== undefined && event.tick !== undefined) {
        stats.ticksReceived++;
        const t0 = performance.now();

        // Fire-and-forget — don't block the next tick
        decide(event.state, event.tick, decideConfig, skillsContext)
          .then((action: Action) => {
            const ms = performance.now() - t0;
            stats.totalDecideMs += ms;
            stats.ticksAnswered++;
            return queuePush(config.matchId, config.botId, { ...action, tick: event.tick }, config.playerToken);
          })
          .catch((err: unknown) => {
            stats.ticksMissed++;
            console.error(`[connect] Tick ${event.tick} decision error:`, err);
          });

        // Async skills for NEXT tick — fire-and-forget
        if (config.skills && config.skills.length > 0) {
          runSkillsAsync(event.state, config.skills, openai)
            .then((ctx) => { skillsContext = ctx; })
            .catch(() => { /* non-critical */ });
        }
      }

      if (event.type === "match_complete") {
        console.log("\n[connect] Match complete!");
        console.log(JSON.stringify(event.result, null, 2));
        printStats(stats);
        ws.close();
        process.exit(0);
      }
    });

    ws.on("close", () => {
      if (retries < MAX_RETRIES) {
        const delay = Math.min(1000 * 2 ** retries, 16000);
        retries++;
        console.log(`[connect] Disconnected. Retry ${retries}/${MAX_RETRIES} in ${delay}ms...`);
        setTimeout(open, delay);
      } else {
        console.error("[connect] Max retries reached. Exiting.");
        printStats(stats);
        process.exit(1);
      }
    });

    ws.on("error", (err: Error) => {
      console.error("[connect] WebSocket error:", err.message);
    });
  }

  open();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main(): void {
  const cliArgs = parseArgs();
  const config = loadConfig(cliArgs);

  if (!config.matchId || !config.botId) {
    console.error("Usage: npx ts-node scripts/connect.ts --match <matchId> --bot <botId> [--token <token>]");
    process.exit(1);
  }

  if (!config.playerToken) {
    console.warn("[connect] Warning: no playerToken set. Auth may fail.");
  }

  console.log(`[connect] Match: ${config.matchId} | Bot: ${config.botId} | Model: ${config.model} | MaxTokens: ${config.maxTokens}`);
  connectWs(config);
}

main();
