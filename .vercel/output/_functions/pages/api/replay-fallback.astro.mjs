import fs from 'node:fs';
import path from 'node:path';
import { a as appendOpsLog } from '../../chunks/observability_DaMM-mJS.mjs';
import { g as getRuntimeDir, e as insertWaitlistLead, a as insertFounderIntent, i as insertConversionEvent } from '../../chunks/waitlist-db_D5cP36a2.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split("\n").filter((line) => line.trim().length > 0);
}
function authorize(request) {
  const key = process.env.COGCAGE_OPS_KEY?.trim();
  if (!key) return true;
  const provided = request.headers.get("x-ops-key") ?? new URL(request.url).searchParams.get("key") ?? "";
  return provided === key;
}
function replayFile(filePath, replayLine) {
  const lines = readLines(filePath);
  if (lines.length === 0) return { replayed: 0, failed: 0 };
  let replayed = 0;
  const failedLines = [];
  for (const line of lines) {
    try {
      replayLine(line);
      replayed += 1;
    } catch {
      failedLines.push(line);
    }
  }
  let archivedFile;
  if (replayed > 0) {
    archivedFile = `${filePath}.replayed-${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
    fs.renameSync(filePath, archivedFile);
    if (failedLines.length > 0) {
      fs.writeFileSync(filePath, `${failedLines.join("\n")}
`, "utf8");
    }
  }
  return {
    replayed,
    failed: failedLines.length,
    archivedFile
  };
}
const POST = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  if (!authorize(request)) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized", requestId }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  const runtimeDir = process.env.COGCAGE_LOG_DIR ?? getRuntimeDir();
  const waitlistFile = path.join(runtimeDir, "waitlist-fallback.ndjson");
  const founderFile = path.join(runtimeDir, "founder-intent-fallback.ndjson");
  const eventsFile = path.join(runtimeDir, "events-fallback.ndjson");
  try {
    const waitlist = replayFile(waitlistFile, (line) => {
      const row = JSON.parse(line);
      const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
      if (!email) throw new Error("missing_email");
      insertWaitlistLead({
        email,
        game: typeof row.game === "string" && row.game.trim() ? row.game.trim() : "Unspecified",
        source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : "fallback-replay",
        userAgent: typeof row.userAgent === "string" ? row.userAgent : void 0,
        ipAddress: typeof row.ipAddress === "string" ? row.ipAddress : void 0
      });
    });
    const founderIntent = replayFile(founderFile, (line) => {
      const row = JSON.parse(line);
      const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
      if (!email) throw new Error("missing_email");
      const intentId = typeof row.intentId === "string" && row.intentId.trim() ? row.intentId.trim() : typeof row.requestId === "string" && row.requestId.trim() ? `legacy:${row.requestId.trim()}` : void 0;
      insertFounderIntent({
        email,
        source: typeof row.source === "string" && row.source.trim() ? row.source.trim() : "founder-checkout",
        intentId,
        userAgent: typeof row.userAgent === "string" ? row.userAgent : void 0,
        ipAddress: typeof row.ipAddress === "string" ? row.ipAddress : void 0
      });
    });
    const events = replayFile(eventsFile, (line) => {
      const row = JSON.parse(line);
      const eventName = typeof row.eventName === "string" ? row.eventName.trim() : "";
      if (!eventName) throw new Error("missing_event_name");
      insertConversionEvent({
        eventName,
        eventId: typeof row.eventId === "string" ? row.eventId : void 0,
        page: typeof row.page === "string" ? row.page : void 0,
        href: typeof row.href === "string" ? row.href : void 0,
        tier: typeof row.tier === "string" ? row.tier : void 0,
        source: typeof row.source === "string" ? row.source : void 0,
        email: typeof row.email === "string" ? row.email.trim().toLowerCase() : void 0,
        metaJson: typeof row.metaJson === "string" ? row.metaJson : void 0,
        userAgent: typeof row.userAgent === "string" ? row.userAgent : void 0,
        ipAddress: typeof row.ipAddress === "string" ? row.ipAddress : void 0
      });
    });
    const durationMs = Date.now() - startedAt;
    const body = {
      ok: true,
      requestId,
      durationMs,
      replayed: {
        waitlist: waitlist.replayed,
        founderIntent: founderIntent.replayed,
        events: events.replayed
      },
      failed: {
        waitlist: waitlist.failed,
        founderIntent: founderIntent.failed,
        events: events.failed
      },
      archivedFiles: [waitlist.archivedFile, founderIntent.archivedFile, events.archivedFile].filter(Boolean)
    };
    appendOpsLog({
      route: "/api/replay-fallback",
      level: "info",
      event: "fallback_replayed",
      requestId,
      durationMs,
      replayed: body.replayed,
      failed: body.failed
    });
    return new Response(JSON.stringify(body), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    appendOpsLog({
      route: "/api/replay-fallback",
      level: "error",
      event: "fallback_replay_failed",
      requestId,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : "unknown-error"
    });
    return new Response(JSON.stringify({ ok: false, error: "Replay failed", requestId }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
