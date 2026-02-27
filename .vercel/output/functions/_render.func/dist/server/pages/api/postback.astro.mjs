import { a as appendOpsLog, b as appendEventsFallback } from '../../chunks/observability_DaMM-mJS.mjs';
import { i as insertConversionEvent, a as insertFounderIntent } from '../../chunks/waitlist-db_D5cP36a2.mjs';
export { renderers } from '../../renderers.mjs';

const prerender = false;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function normalizeString(value, maxLen = 500) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLen);
}
function normalizeEmail(value) {
  if (typeof value !== "string") return void 0;
  const email = value.trim().toLowerCase();
  if (!email || !EMAIL_RE.test(email)) return void 0;
  return email;
}
function authorize(request) {
  const key = process.env.COGCAGE_POSTBACK_KEY?.trim();
  if (!key) return true;
  const provided = request.headers.get("x-postback-key")?.trim() ?? "";
  return provided === key;
}
function hashString(input) {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}
function deriveFallbackEventId({ eventType, source, email, created, metadata }) {
  const day = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  const metadataPreview = JSON.stringify(metadata ?? {}).slice(0, 512);
  const fingerprint = `${eventType}|${source}|${email || "anon"}|${created || ""}|${metadataPreview}|${day}`;
  return `postback:${day}:${hashString(fingerprint)}`;
}
const POST = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  if (!authorize(request)) {
    appendOpsLog({ route: "/api/postback", level: "warn", event: "postback_unauthorized", requestId });
    return new Response(JSON.stringify({ ok: false, error: "Unauthorized", requestId }), {
      status: 401,
      headers: { "content-type": "application/json" }
    });
  }
  const contentType = request.headers.get("content-type") ?? "";
  let payload = null;
  try {
    if (contentType.includes("application/json")) {
      payload = await request.json().catch(() => null);
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      const eventType2 = normalizeString(formData.get("type"), 120);
      const eventId2 = normalizeString(formData.get("eventId") ?? formData.get("id"), 180);
      const source2 = normalizeString(formData.get("source"), 160);
      const email2 = normalizeString(formData.get("email"), 180);
      payload = {
        type: eventType2 || void 0,
        eventId: eventId2 || void 0,
        source: source2 || void 0,
        email: email2 || void 0
      };
    } else {
      const rawBody = await request.text();
      if (rawBody.trim().startsWith("{")) {
        payload = JSON.parse(rawBody);
      } else {
        const params = new URLSearchParams(rawBody);
        payload = {
          type: normalizeString(params.get("type"), 120) || void 0,
          eventId: normalizeString(params.get("eventId") ?? params.get("id"), 180) || void 0,
          source: normalizeString(params.get("source"), 160) || void 0,
          email: normalizeString(params.get("email"), 180) || void 0
        };
      }
    }
  } catch {
    payload = null;
  }
  if (!payload) {
    return new Response(JSON.stringify({ ok: false, error: "Invalid request payload", requestId }), {
      status: 400,
      headers: { "content-type": "application/json" }
    });
  }
  const rawType = payload.type ?? "";
  const eventType = typeof rawType === "string" ? rawType : "";
  const acceptedTypes = /* @__PURE__ */ new Set(["checkout.session.completed", "founder_pack.paid"]);
  if (!acceptedTypes.has(eventType)) {
    return new Response(JSON.stringify({ ok: false, error: "Unsupported postback type", requestId }), {
      status: 422,
      headers: { "content-type": "application/json" }
    });
  }
  const object = payload.data?.object;
  const email = normalizeEmail(payload.email) ?? normalizeEmail(object?.customer_email) ?? normalizeEmail(object?.customer_details?.email);
  const source = typeof payload.source === "string" && payload.source.trim() ? payload.source.trim() : "postback";
  const meta = {
    eventType,
    created: payload.created,
    metadata: payload.metadata ?? object?.metadata ?? {}
  };
  const eventId = (typeof payload.eventId === "string" && payload.eventId.trim() ? payload.eventId.trim() : void 0) ?? (typeof payload.id === "string" && payload.id.trim() ? payload.id.trim() : void 0) ?? (typeof object?.id === "string" && object.id.trim() ? object.id.trim() : void 0) ?? deriveFallbackEventId({ eventType, source, email, created: payload.created, metadata: meta.metadata });
  const conversionPayload = {
    eventName: "paid_conversion_confirmed",
    eventId,
    source,
    tier: "founder",
    email,
    metaJson: JSON.stringify(meta),
    userAgent: request.headers.get("user-agent") ?? void 0
  };
  try {
    insertConversionEvent(conversionPayload);
    if (email) {
      insertFounderIntent({
        email,
        source: `${source}-postback`,
        intentId: `paid:${eventId}`,
        userAgent: request.headers.get("user-agent") ?? void 0
      });
    }
    appendOpsLog({
      route: "/api/postback",
      level: "info",
      event: "postback_recorded",
      requestId,
      eventType,
      source,
      eventId,
      hasEmail: Boolean(email),
      durationMs: Date.now() - startedAt
    });
    return new Response(JSON.stringify({ ok: true, requestId, eventId }), {
      status: 200,
      headers: { "content-type": "application/json" }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown-error";
    appendOpsLog({
      route: "/api/postback",
      level: "error",
      event: "postback_record_failed",
      requestId,
      eventType,
      source,
      eventId,
      error: errorMessage,
      durationMs: Date.now() - startedAt
    });
    try {
      appendEventsFallback({ route: "/api/postback", requestId, ...conversionPayload, reason: errorMessage });
      appendOpsLog({
        route: "/api/postback",
        level: "warn",
        event: "postback_saved_to_fallback",
        requestId,
        eventType,
        source,
        eventId,
        durationMs: Date.now() - startedAt
      });
      return new Response(JSON.stringify({ ok: true, queued: true, requestId, eventId }), {
        status: 202,
        headers: { "content-type": "application/json" }
      });
    } catch (fallbackError) {
      appendOpsLog({
        route: "/api/postback",
        level: "error",
        event: "postback_fallback_write_failed",
        requestId,
        eventType,
        source,
        eventId,
        error: fallbackError instanceof Error ? fallbackError.message : "unknown-fallback-error",
        durationMs: Date.now() - startedAt
      });
      return new Response(JSON.stringify({ ok: false, error: "Postback processing failed", requestId }), {
        status: 500,
        headers: { "content-type": "application/json" }
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
