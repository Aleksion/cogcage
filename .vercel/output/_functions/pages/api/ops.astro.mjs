import fs from 'node:fs';
import path from 'node:path';
import { g as getRuntimeDir, b as getFunnelCounts, d as getReliabilitySnapshot } from '../../chunks/waitlist-db_D5cP36a2.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const LOG_DIR = process.env.COGCAGE_LOG_DIR ?? getRuntimeDir();
function readTail(filePath, tailLines = 20) {
  if (!fs.existsSync(filePath)) {
    return {
      file: path.basename(filePath),
      exists: false,
      lines: 0,
      bytes: 0,
      tail: []
    };
  }
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n").filter(Boolean);
  return {
    file: path.basename(filePath),
    exists: true,
    lines: lines.length,
    bytes: Buffer.byteLength(content),
    tail: lines.slice(-tailLines)
  };
}
const GET = async ({ request }) => {
  const key = process.env.COGCAGE_OPS_KEY;
  const provided = request.headers.get("x-ops-key") ?? new URL(request.url).searchParams.get("key");
  if (key && provided !== key) {
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  const files = [
    readTail(path.join(LOG_DIR, "api-events.ndjson")),
    readTail(path.join(LOG_DIR, "waitlist-fallback.ndjson")),
    readTail(path.join(LOG_DIR, "founder-intent-fallback.ndjson")),
    readTail(path.join(LOG_DIR, "events-fallback.ndjson"))
  ];
  let counts;
  let reliability;
  try {
    counts = getFunnelCounts();
    reliability = getReliabilitySnapshot(24);
  } catch (error) {
    return new Response(JSON.stringify({
      ok: false,
      error: "Could not read ops metrics",
      detail: error instanceof Error ? error.message : "unknown-error",
      files
    }), {
      status: 500,
      headers: { "content-type": "application/json" }
    });
  }
  const queueBacklog = {
    waitlistFallbackLines: files.find((file) => file.file === "waitlist-fallback.ndjson")?.lines ?? 0,
    founderIntentFallbackLines: files.find((file) => file.file === "founder-intent-fallback.ndjson")?.lines ?? 0,
    eventsFallbackLines: files.find((file) => file.file === "events-fallback.ndjson")?.lines ?? 0
  };
  return new Response(JSON.stringify({
    ok: true,
    ts: (/* @__PURE__ */ new Date()).toISOString(),
    counts,
    reliability,
    queueBacklog,
    files
  }), {
    status: 200,
    headers: { "content-type": "application/json" }
  });
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  GET,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
