import { v } from "convex/values";
import { query } from "./_generated/server";

export const getTopPlayers = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, { limit }) => {
    const max = limit ?? 50;
    const players = await ctx.db
      .query("players")
      .withIndex("by_hardness")
      .order("desc")
      .take(max);
    return players;
  },
});
