import { v, ConvexError } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

async function getCallerPlayerId(ctx: any) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");

  const player = await ctx.db
    .query("players")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .unique();
  if (!player) throw new ConvexError("Player profile not found — try refreshing");
  return player._id;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const player = await ctx.db
      .query("players")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();
    if (!player) return [];

    return await ctx.db
      .query("shells")
      .withIndex("by_playerId", (q) => q.eq("playerId", player._id))
      .collect();
  },
});

export const get = query({
  args: { shellId: v.id("shells") },
  handler: async (ctx, { shellId }) => {
    return await ctx.db.get(shellId);
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    cards: v.array(v.string()),
    directive: v.string(),
    skills: v.array(v.string()),
    stats: v.object({
      totalWeight: v.number(),
      totalOverhead: v.number(),
      armorValue: v.number(),
    }),
  },
  handler: async (ctx, { name, cards, directive, skills, stats }) => {
    const playerId = await getCallerPlayerId(ctx);

    const existing = await ctx.db
      .query("shells")
      .withIndex("by_playerId", (q) => q.eq("playerId", playerId))
      .collect();

    if (existing.length >= 10) {
      throw new ConvexError("Max 10 saved shells");
    }

    const now = Date.now();
    return await ctx.db.insert("shells", {
      playerId,
      name: name.trim() || "Unnamed Shell",
      cards,
      directive,
      skills: skills.slice(0, 3),
      stats,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const update = mutation({
  args: {
    shellId: v.id("shells"),
    name: v.optional(v.string()),
    cards: v.optional(v.array(v.string())),
    directive: v.optional(v.string()),
    skills: v.optional(v.array(v.string())),
    stats: v.optional(
      v.object({
        totalWeight: v.number(),
        totalOverhead: v.number(),
        armorValue: v.number(),
      }),
    ),
  },
  handler: async (ctx, { shellId, ...updates }) => {
    const playerId = await getCallerPlayerId(ctx);
    const shell = await ctx.db.get(shellId);
    if (!shell) throw new ConvexError("Shell not found");
    if (shell.playerId !== playerId) throw new ConvexError("Unauthorized");

    const patch: Record<string, any> = { updatedAt: Date.now() };
    if (updates.name !== undefined) patch.name = updates.name.trim() || "Unnamed Shell";
    if (updates.cards !== undefined) patch.cards = updates.cards;
    if (updates.directive !== undefined) patch.directive = updates.directive;
    if (updates.skills !== undefined) patch.skills = updates.skills.slice(0, 3);
    if (updates.stats !== undefined) patch.stats = updates.stats;

    await ctx.db.patch(shellId, patch);
    return shellId;
  },
});

export const remove = mutation({
  args: { shellId: v.id("shells") },
  handler: async (ctx, { shellId }) => {
    const playerId = await getCallerPlayerId(ctx);
    const shell = await ctx.db.get(shellId);
    if (!shell) throw new ConvexError("Shell not found");
    if (shell.playerId !== playerId) throw new ConvexError("Unauthorized");

    await ctx.db.delete(shellId);
    return shellId;
  },
});
