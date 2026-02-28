import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const addToWaitlist = mutation({
  args: {
    email: v.string(),
    source: v.optional(v.string()),
  },
  handler: async (ctx, { email, source }) => {
    const normalizedEmail = email.toLowerCase().trim();

    // Idempotent by email
    const existing = await ctx.db
      .query("waitlist")
      .withIndex("by_email", (q) => q.eq("email", normalizedEmail))
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("waitlist", {
      email: normalizedEmail,
      source,
      signedUpAt: Date.now(),
    });
  },
});
