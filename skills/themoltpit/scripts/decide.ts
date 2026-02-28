/**
 * decide.ts — LLM decision loop.
 *
 * Streams the LLM response via raw fetch + SSE parsing and returns the
 * FIRST complete JSON object from the token stream. Cancels the stream
 * immediately after — every millisecond counts at 200ms tick cadence.
 */

import type { PluginConfig } from "./connect";

export interface GameState {
  crawlerId: string;
  hp: number;
  position: { x: number; y: number };
  energy: number;
  facing: string;
  opponents: Array<{
    id: string;
    hp: number;
    position: { x: number; y: number };
    facing: string;
  }>;
  availableClaws: string[];
  tick: number;
  maxTicks: number;
}

export interface Action {
  action: string;
  targetId?: string;
}

/**
 * Build the LLM prompt, stream the response, parse the first JSON action.
 * Cancels the stream as soon as a valid action is extracted.
 */
export async function decide(
  state: GameState,
  config: PluginConfig,
): Promise<Action | null> {
  const context = `${config.directive}\n\nCurrent state:\n${JSON.stringify(state)}\n\nRespond with ONLY JSON: {"action":"ACTION_ID","targetId":"optional"}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: config.model,
        messages: [{ role: "user", content: context }],
        max_tokens: config.maxTokens,
        stream: true,
      }),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    return null;
  }

  if (!res.ok || !res.body) {
    clearTimeout(timeout);
    return null;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let sseBuffer = "";
  let content = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    sseBuffer += decoder.decode(value, { stream: true });

    // Parse SSE lines
    const lines = sseBuffer.split("\n");
    sseBuffer = lines.pop() ?? ""; // keep incomplete line in buffer

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") continue;
      try {
        const parsed = JSON.parse(data);
        const delta = parsed.choices?.[0]?.delta?.content;
        if (delta) {
          content += delta;
          // Try to parse first complete JSON object
          const jsonMatch = content.match(/\{[^{}]*\}/);
          if (jsonMatch) {
            const action = JSON.parse(jsonMatch[0]) as Action;
            if (action.action) {
              clearTimeout(timeout);
              reader.cancel(); // stop streaming — we got what we need
              return action;
            }
          }
        }
      } catch {
        // skip unparseable chunks
      }
    }
  }

  clearTimeout(timeout);

  // Fallback: try to parse whatever we accumulated
  const jsonMatch = content.match(/\{[^{}]*\}/);
  if (jsonMatch) {
    try {
      return JSON.parse(jsonMatch[0]) as Action;
    } catch {
      // fall through
    }
  }

  return { action: "NO_OP" }; // safe fallback
}
