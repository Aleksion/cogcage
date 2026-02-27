/**
 * decide.ts — LLM decision loop.
 *
 * Streams the LLM response and returns the FIRST complete JSON object
 * found in the token stream. Does NOT wait for the full response —
 * every millisecond counts at 200ms tick cadence.
 */

import OpenAI from "openai";
import type { Action } from "./queue-push";

export interface DecideConfig {
  model: string;
  maxTokens: number;
  systemPrompt: string;
  openaiApiKey?: string;
}

export interface GameState {
  [key: string]: unknown;
}

/**
 * Build the LLM prompt, stream the response, parse the first JSON action.
 */
export async function decide(
  state: GameState,
  tick: number,
  config: DecideConfig,
  skillsContext: string = "",
): Promise<Action> {
  const openai = new OpenAI({ apiKey: config.openaiApiKey });

  const userContent = [
    skillsContext ? `INTEL:\n${skillsContext}\n\n` : "",
    `GAME STATE (tick ${tick}):\n${JSON.stringify(state, null, 0)}`,
  ].join("");

  const stream = await openai.chat.completions.create({
    model: config.model,
    max_tokens: config.maxTokens,
    stream: true,
    messages: [
      { role: "system", content: config.systemPrompt },
      { role: "user", content: userContent },
    ],
  });

  // Stream-parse: fire on first complete JSON object
  let buffer = "";
  for await (const chunk of stream) {
    buffer += chunk.choices[0]?.delta?.content ?? "";
    const match = buffer.match(/\{[^{}]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]) as Action;
      } catch {
        continue;
      }
    }
  }

  // Fallback — no valid JSON extracted
  return { action: "NO_OP" };
}
