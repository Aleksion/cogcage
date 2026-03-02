import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logAuthEvent = mutation({
  args: {
    emailHash: v.optional(v.string()),
    method: v.union(v.literal("github"), v.literal("email-otp"), v.literal("guest")),
    success: v.boolean(),
    errorCode: v.optional(v.string()),
  },
  handler: async (ctx, { emailHash, method, success, errorCode }) => {
    await ctx.db.insert("authEvents", {
      emailHash,
      method,
      success,
      errorCode,
      timestamp: Date.now(),
    });
  },
});

export const recentEvents = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(limit ?? 50, 200);
    return await ctx.db
      .query("authEvents")
      .order("desc")
      .take(cap);
  },
});

export const stats = query({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const events = await ctx.db
      .query("authEvents")
      .order("desc")
      .take(500);

    const last24h = events.filter((e) => e.timestamp >= cutoff);
    const total = last24h.length;
    const successes = last24h.filter((e) => e.success).length;
    const failures = total - successes;

    const byMethod: Record<string, { ok: number; fail: number }> = {};
    for (const e of last24h) {
      if (!byMethod[e.method]) byMethod[e.method] = { ok: 0, fail: 0 };
      if (e.success) byMethod[e.method].ok++;
      else byMethod[e.method].fail++;
    }

    return { total, successes, failures, byMethod };
  },
});
