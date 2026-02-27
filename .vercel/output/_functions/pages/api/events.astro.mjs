import { i as insertConversionEvent } from '../../chunks/waitlist-db_D5cP36a2.mjs';
import { a as appendOpsLog, b as appendEventsFallback } from '../../chunks/observability_DaMM-mJS.mjs';
export { renderers } from '../../renderers.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EVENT_RE = /^[a-z0-9_:-]{2,64}$/i;
function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  const flyIp = request.headers.get("fly-client-ip")?.trim();
  return forwarded || realIp || cfIp || flyIp || void 0;
}
function normalizeString(value, maxLen = 300) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.slice(0, maxLen);
}
function optionalString(value, maxLen = 300) {
  const normalized = normalizeString(value, maxLen);
  return normalized.length > 0 ? normalized : void 0;
}
const prerender = false;
const POST = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const contentType = request.headers.get("content-type") ?? "";
  let json = null;
  try {
    if (contentType.includes("application/json")) {
      const parsed = await request.json();
      json = parsed && typeof parsed === "object" ? parsed : null;
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const payload2 = {};
      formData.forEach((value, key) => {
        payload2[key] = typeof value === "string" ? value : value.name;
      });
      json = payload2;
    } else {
      const rawBody = await request.text();
      if (rawBody.trim().startsWith("{")) {
        const parsed = JSON.parse(rawBody);
        json = parsed && typeof parsed === "object" ? parsed : null;
      } else {
        const params = new URLSearchParams(rawBody);
        const payload2 = {};
        params.forEach((value, key) => {
          payload2[key] = value;
        });
        json = payload2;
      }
    }
  } catch {
    json = null;
  }
  if (!json || typeof json !== "object") {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request payload.", requestId }), {
      status: 400,
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId
      }
    });
  }
  const eventName = normalizeString(json.event, 64);
  if (!EVENT_RE.test(eventName)) {
    return new Response(JSON.stringify({ ok: false, error: "Valid event name is required.", requestId }), {
      status: 400,
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId
      }
    });
  }
  const emailRaw = optionalString(json.email)?.toLowerCase();
  if (emailRaw && !EMAIL_RE.test(emailRaw)) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid email format.", requestId }), {
      status: 400,
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId
      }
    });
  }
  const rawMeta = json.meta;
  const metaRecord = rawMeta && typeof rawMeta === "object" ? rawMeta : void 0;
  let metaJson;
  if (rawMeta !== void 0) {
    try {
      const serialized = JSON.stringify(rawMeta);
      metaJson = serialized.length > 4e3 ? JSON.stringify({ truncated: true, preview: serialized.slice(0, 3800) }) : serialized;
    } catch {
      metaJson = JSON.stringify({ invalidMeta: true });
    }
  }
  const payload = {
    eventName,
    eventId: optionalString(json.eventId, 160) ?? optionalString(metaRecord?.eventId, 160),
    page: optionalString(json.page, 120),
    href: optionalString(json.href, 600),
    tier: optionalString(json.tier, 60),
    source: optionalString(json.source, 120) ?? "landing",
    email: emailRaw,
    metaJson,
    userAgent: request.headers.get("user-agent") ?? void 0,
    ipAddress: getClientIp(request)
  };
  try {
    insertConversionEvent(payload);
    appendOpsLog({ route: "/api/events", level: "info", event: "conversion_event_saved", requestId, eventName, source: payload.source, durationMs: Date.now() - startedAt });
    return new Response(JSON.stringify({ ok: true, requestId }), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "x-request-id": requestId
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown-error";
    appendOpsLog({ route: "/api/events", level: "error", event: "conversion_event_db_write_failed", requestId, eventName, source: payload.source, error: errorMessage, durationMs: Date.now() - startedAt });
    try {
      appendEventsFallback({ route: "/api/events", requestId, ...payload, reason: errorMessage });
      appendOpsLog({ route: "/api/events", level: "warn", event: "conversion_event_saved_to_fallback", requestId, eventName, source: payload.source, durationMs: Date.now() - startedAt });
      return new Response(JSON.stringify({ ok: true, queued: true, requestId }), {
        status: 202,
        headers: {
          "content-type": "application/json",
          "x-request-id": requestId
        }
      });
    } catch (fallbackError) {
      appendOpsLog({ route: "/api/events", level: "error", event: "conversion_event_fallback_write_failed", requestId, eventName, source: payload.source, error: fallbackError instanceof Error ? fallbackError.message : "unknown-fallback-error", durationMs: Date.now() - startedAt });
      return new Response(JSON.stringify({ ok: false, error: "Event storage unavailable.", requestId }), {
        status: 503,
        headers: {
          "content-type": "application/json",
          "x-request-id": requestId
        }
      });
    }
  }
};

const _page = /*#__PURE__*/Object.freeze(/*#__PURE__*/Object.defineProperty({
  __proto__: null,
  POST,
  prerender
}, Symbol.toStringTag, { value: 'Module' }));

const page = () => _page;

export { page };
