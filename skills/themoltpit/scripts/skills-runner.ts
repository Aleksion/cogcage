/**
 * skills-runner.ts — Parallel async intel skills track.
 *
 * Runs BETWEEN ticks. Results feed into the NEXT tick's LLM context.
 * Never blocks the action queue — if a skill is slow it simply misses
 * the window and its result is discarded.
 */

import OpenAI from "openai";
import type { GameState } from "./decide";

const SKILL_TIMEOUT_MS = 150; // Must finish before next 200ms tick

/**
 * Invoke a single intel skill via a lightweight LLM call.
 */
async function invokeSkill(
  skill: string,
  state: GameState,
  openai: OpenAI,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SKILL_TIMEOUT_MS);

  try {
    const res = await openai.chat.completions.create(
      {
        model: "gpt-4o-mini",
        max_tokens: 40,
        messages: [
          {
            role: "system",
            content: `You are a ${skill} analyst. Given the game state, produce a ONE-LINE tactical insight. No JSON, just a sentence.`,
          },
          {
            role: "user",
            content: JSON.stringify(state, null, 0),
          },
        ],
      },
      { signal: controller.signal },
    );

    return `[${skill}] ${res.choices[0]?.message?.content?.trim() ?? ""}`;
  } catch {
    return "";
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Run all configured skills in parallel. Returns a newline-joined string
 * of intel results to be injected into the next tick's LLM context.
 */
export async function runSkillsAsync(
  state: GameState,
  skills: string[],
  openai: OpenAI,
): Promise<string> {
  if (!skills.length) return "";

  const results = await Promise.all(
    skills.map((skill) => invokeSkill(skill, state, openai)),
  );
  return results.filter(Boolean).join("\n");
}
