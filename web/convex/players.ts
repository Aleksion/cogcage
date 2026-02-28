import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Alias used by AuthButton component
export const getCurrent = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getPlayer = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    return await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
  },
});

export const getPlayerById = query({
  args: { playerId: v.id("players") },
  handler: async (ctx, { playerId }) => {
    return await ctx.db.get(playerId);
  },
});

export const upsertPlayer = mutation({
  args: { username: v.optional(v.string()) },
  handler: async (ctx, { username }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) {
      if (username && username !== existing.username) {
        await ctx.db.patch(existing._id, { username });
      }
      return existing._id;
    }

    const user = await ctx.db.get(userId);
    const displayName =
      username || (user as any)?.name || (user as any)?.email || "Player";

    return await ctx.db.insert("players", {
      userId,
      username: displayName,
      hardness: 1000,
      moltsPlayed: 0,
      moltsWon: 0,
      createdAt: Date.now(),
    });
  },
});
