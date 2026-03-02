import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const record = mutation({
  args: {
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeSessionId: v.string(),
    amount: v.number(),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("refunded")),
  },
  handler: async (ctx, args) => {
    // Deduplicate by stripeSessionId
    const existing = await ctx.db
      .query("purchases")
      .withIndex("by_stripeSessionId", (q) => q.eq("stripeSessionId", args.stripeSessionId))
      .unique();

    if (existing) {
      await ctx.db.patch(existing._id, { status: args.status });
      return existing._id;
    }

    return await ctx.db.insert("purchases", {
      ...args,
      createdAt: Date.now(),
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
