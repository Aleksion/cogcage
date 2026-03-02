import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const record = mutation({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeSessionId: v.string(),
    amount: v.number(),
    currency: v.optional(v.string()),
    source: v.optional(v.string()),
    eventType: v.optional(v.string()),
    status: v.union(
      v.literal("completed"),
      v.literal("pending"),
      v.literal("refunded"),
      v.literal("failed"),
    ),
  },
  handler: async (ctx, args) => {
    // Deduplicate by stripeSessionId
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        userId: args.userId ?? existing.userId,
        email: args.email ?? existing.email,
        amount: args.amount ?? existing.amount,
        currency: args.currency ?? existing.currency,
        source: args.source ?? existing.source,
        eventType: args.eventType ?? existing.eventType,
        status: args.status,
        updatedAt: now,
      });
      return existing._id;
    }

    return await ctx.db.insert("purchases", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const list = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const cap = Math.min(limit ?? 50, 200);
    return await ctx.db
      .query("purchases")
      .order("desc")
      .take(cap);
  },
});
