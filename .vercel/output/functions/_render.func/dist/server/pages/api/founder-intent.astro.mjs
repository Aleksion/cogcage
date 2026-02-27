import { c as consumeRateLimit, a as insertFounderIntent, i as insertConversionEvent } from '../../chunks/waitlist-db_D5cP36a2.mjs';
import { a as appendOpsLog, c as appendFounderIntentFallback, b as appendEventsFallback } from '../../chunks/observability_DaMM-mJS.mjs';
export { renderers } from '../../renderers.mjs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HONEYPOT_FIELDS = ["company", "website", "nickname"];
const RATE_LIMIT_MAX = 8;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1e3;
function getClientIp(request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = request.headers.get("x-real-ip")?.trim();
  const cfIp = request.headers.get("cf-connecting-ip")?.trim();
  const flyIp = request.headers.get("fly-client-ip")?.trim();
  return forwarded || realIp || cfIp || flyIp || void 0;
}
function getRateLimitKey(request) {
  const ip = getClientIp(request);
  if (ip) return ip;
  const ua = request.headers.get("user-agent") ?? "unknown-ua";
  const lang = request.headers.get("accept-language") ?? "unknown-lang";
  return `anon:${ua.slice(0, 80)}:${lang.slice(0, 40)}`;
}
function normalize(value) {
  return typeof value === "string" ? value.trim() : "";
}
function normalizeString(value, maxLen = 300) {
  if (typeof value !== "string") return "";
  const normalized = value.trim();
  return normalized.slice(0, maxLen);
}
function jsonResponse(body, status, requestId, extraHeaders = {}) {
  return new Response(JSON.stringify({ ...body, requestId }), {
    status,
    headers: {
      "content-type": "application/json",
      "x-request-id": requestId,
      ...extraHeaders
    }
  });
}
function safeTrackConversion(route, requestId, event) {
  try {
    insertConversionEvent(event);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown-error";
    appendOpsLog({ route, level: "error", event: "conversion_event_write_failed", requestId, conversionEventName: event.eventName, error: errorMessage });
    try {
      appendEventsFallback({ route, requestId, ...event, reason: errorMessage });
    } catch {
    }
  }
}
const prerender = false;
const POST = async ({ request }) => {
  const startedAt = Date.now();
  const requestId = crypto.randomUUID();
  const contentType = request.headers.get("content-type") ?? "";
  let email = "";
  let source = "";
  let intentId = "";
  let honeypot = "";
  try {
    if (contentType.includes("application/json")) {
      const json = await request.json().catch(() => ({}));
      email = normalizeString(json.email ?? null, 180);
      source = normalizeString(json.source ?? null, 120);
      intentId = normalizeString(json.intentId ?? json.intent_id ?? null, 180);
      honeypot = normalizeString(
        HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== void 0) ?? "",
        120
      );
    } else if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      email = normalize(formData.get("email"));
      source = normalize(formData.get("source"));
      intentId = normalize(formData.get("intentId")) || normalize(formData.get("intent_id"));
      for (const field of HONEYPOT_FIELDS) {
        const value = normalize(formData.get(field));
        if (value) {
          honeypot = value;
          break;
        }
      }
    } else {
      const rawBody = await request.text();
      if (rawBody.trim().startsWith("{")) {
        const json = JSON.parse(rawBody);
        email = normalizeString(json.email ?? null, 180);
        source = normalizeString(json.source ?? null, 120);
        intentId = normalizeString(json.intentId ?? json.intent_id ?? null, 180);
        honeypot = normalizeString(
          HONEYPOT_FIELDS.map((field) => json[field]).find((value) => value !== void 0) ?? "",
          120
        );
      } else {
        const params = new URLSearchParams(rawBody);
        email = normalizeString(params.get("email"), 180);
        source = normalizeString(params.get("source"), 120);
        intentId = normalizeString(params.get("intentId") || params.get("intent_id"), 180);
        for (const field of HONEYPOT_FIELDS) {
          const value = normalizeString(params.get(field), 120);
          if (value) {
            honeypot = value;
            break;
          }
        }
      }
    }
  } catch (error) {
    appendOpsLog({
      route: "/api/founder-intent",
      level: "warn",
      event: "founder_intent_payload_parse_failed",
      requestId,
      contentType,
      error: error instanceof Error ? error.message : "unknown",
      durationMs: Date.now() - startedAt
    });
    safeTrackConversion("/api/founder-intent", requestId, {
      eventName: "founder_intent_payload_parse_failed",
      source: "founder-checkout",
      userAgent: request.headers.get("user-agent") ?? void 0,
      ipAddress: getClientIp(request),
      metaJson: JSON.stringify({ contentType })
    });
    return jsonResponse({ ok: false, error: "Invalid request payload." }, 400, requestId);
  }
  const ipAddress = getClientIp(request);
  const rateLimitKey = getRateLimitKey(request);
  const normalizedEmail = email.toLowerCase();
  const eventSource = source || "founder-checkout";
  let rateLimit = { allowed: true, remaining: RATE_LIMIT_MAX, resetMs: 0 };
  try {
    rateLimit = consumeRateLimit(rateLimitKey, "founder-intent", RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
  } catch (error) {
    appendOpsLog({
      route: "/api/founder-intent",
      level: "warn",
      event: "founder_intent_rate_limit_failed",
      requestId,
      error: error instanceof Error ? error.message : "unknown"
    });
  }
  if (!rateLimit.allowed) {
    appendOpsLog({ route: "/api/founder-intent", level: "warn", event: "founder_intent_rate_limited", requestId, ipAddress, durationMs: Date.now() - startedAt });
    safeTrackConversion("/api/founder-intent", requestId, {
      eventName: "founder_intent_rate_limited",
      source: eventSource,
      email: normalizedEmail || void 0,
      metaJson: JSON.stringify({ resetMs: rateLimit.resetMs }),
      userAgent: request.headers.get("user-agent") ?? void 0,
      ipAddress
    });
    return jsonResponse({ ok: false, error: "Too many attempts. Try again in a few minutes." }, 429, requestId, {
      "retry-after": String(Math.ceil(rateLimit.resetMs / 1e3))
    });
  }
  if (honeypot) {
    appendOpsLog({ route: "/api/founder-intent", level: "warn", event: "founder_intent_honeypot_blocked", requestId, ipAddress, durationMs: Date.now() - startedAt });
    safeTrackConversion("/api/founder-intent", requestId, {
      eventName: "founder_intent_honeypot_blocked",
      source: eventSource,
      email: normalizedEmail || void 0,
      metaJson: JSON.stringify({ honeypot }),
      userAgent: request.headers.get("user-agent") ?? void 0,
      ipAddress
    });
    return jsonResponse({ ok: false, error: "Submission blocked." }, 400, requestId);
  }
  if (!EMAIL_RE.test(email)) {
    appendOpsLog({ route: "/api/founder-intent", level: "warn", event: "founder_intent_invalid_email", requestId, ipAddress, durationMs: Date.now() - startedAt });
    safeTrackConversion("/api/founder-intent", requestId, {
      eventName: "founder_intent_invalid_email",
      source: eventSource,
      email: normalizedEmail || void 0,
      userAgent: request.headers.get("user-agent") ?? void 0,
      ipAddress
    });
    return jsonResponse({ ok: false, error: "Valid email is required." }, 400, requestId);
  }
  const payload = {
    email: normalizedEmail,
    source: eventSource,
    intentId: intentId || void 0,
    userAgent: request.headers.get("user-agent") ?? void 0,
    ipAddress
  };
  try {
    insertFounderIntent(payload);
    appendOpsLog({ route: "/api/founder-intent", level: "info", event: "founder_intent_saved", requestId, source: payload.source, emailHash: payload.email.slice(0, 3), durationMs: Date.now() - startedAt });
    safeTrackConversion("/api/founder-intent", requestId, {
      eventName: "founder_intent_submitted",
      source: payload.source,
      email: payload.email,
      metaJson: payload.intentId ? JSON.stringify({ intentId: payload.intentId }) : void 0,
      userAgent: request.headers.get("user-agent") ?? void 0,
      ipAddress
    });
    return jsonResponse({ ok: true }, 200, requestId);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "unknown-error";
    appendOpsLog({ route: "/api/founder-intent", level: "error", event: "founder_intent_db_write_failed", requestId, error: errorMessage, durationMs: Date.now() - startedAt });
    try {
      appendFounderIntentFallback({ route: "/api/founder-intent", requestId, ...payload, reason: errorMessage });
      safeTrackConversion("/api/founder-intent", requestId, {
        eventName: "founder_intent_queued_fallback",
        source: payload.source,
        email: payload.email,
        metaJson: JSON.stringify({ error: errorMessage }),
        userAgent: request.headers.get("user-agent") ?? void 0,
        ipAddress
      });
      appendOpsLog({ route: "/api/founder-intent", level: "warn", event: "founder_intent_saved_to_fallback", requestId, durationMs: Date.now() - startedAt });
      return jsonResponse({ ok: true, queued: true }, 202, requestId);
    } catch (fallbackError) {
      appendOpsLog({ route: "/api/founder-intent", level: "error", event: "founder_intent_fallback_write_failed", requestId, error: fallbackError instanceof Error ? fallbackError.message : "unknown-fallback-error", durationMs: Date.now() - startedAt });
      safeTrackConversion("/api/founder-intent", requestId, {
        eventName: "founder_intent_insert_failed",
        source: payload.source,
        email: payload.email,
        metaJson: JSON.stringify({ error: errorMessage }),
        userAgent: request.headers.get("user-agent") ?? void 0,
        ipAddress
      });
      return jsonResponse({ ok: false, error: "Temporary storage issue. Please retry." }, 503, requestId);
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
