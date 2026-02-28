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
  if (!player) throw new ConvexError("Player profile not found");
  return player._id;
}

export const listOpen = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tanks")
      .withIndex("by_status", (q) => q.eq("status", "waiting"))
      .collect();
  },
});

export const get = query({
  args: { tankId: v.id("tanks") },
  handler: async (ctx, { tankId }) => {
    return await ctx.db.get(tankId);
  },
});

export const create = mutation({
  args: { hostShellId: v.id("shells") },
  handler: async (ctx, { hostShellId }) => {
    const playerId = await getCallerPlayerId(ctx);

    // Verify the shell belongs to the caller
    const shell = await ctx.db.get(hostShellId);
    if (!shell) throw new ConvexError("Shell not found");
    if (shell.playerId !== playerId) throw new ConvexError("Unauthorized");

    return await ctx.db.insert("tanks", {
      hostPlayerId: playerId,
      hostShellId,
      status: "waiting",
      createdAt: Date.now(),
    });
  },
});

export const join = mutation({
  args: {
    tankId: v.id("tanks"),
    challengerShellId: v.id("shells"),
  },
  handler: async (ctx, { tankId, challengerShellId }) => {
    const playerId = await getCallerPlayerId(ctx);
    const tank = await ctx.db.get(tankId);
    if (!tank) throw new ConvexError("Tank not found");
    if (tank.status !== "waiting") throw new ConvexError("Tank not available");
    if (tank.hostPlayerId === playerId)
      throw new ConvexError("Cannot join your own tank");

    // Verify the shell belongs to the caller
    const shell = await ctx.db.get(challengerShellId);
    if (!shell) throw new ConvexError("Shell not found");
    if (shell.playerId !== playerId) throw new ConvexError("Unauthorized");

    await ctx.db.patch(tankId, {
      challengerPlayerId: playerId,
      challengerShellId,
      status: "ready",
    });
    return tankId;
  },
});

export const updateChallengerShell = mutation({
  args: {
    tankId: v.id("tanks"),
    shellId: v.id("shells"),
  },
  handler: async (ctx, { tankId, shellId }) => {
    const playerId = await getCallerPlayerId(ctx);
    const tank = await ctx.db.get(tankId);
    if (!tank) throw new ConvexError("Tank not found");
    if (tank.challengerPlayerId !== playerId)
      throw new ConvexError("Unauthorized");

    // Verify the shell belongs to the caller
    const shell = await ctx.db.get(shellId);
    if (!shell) throw new ConvexError("Shell not found");
    if (shell.playerId !== playerId) throw new ConvexError("Unauthorized");

    await ctx.db.patch(tankId, { challengerShellId: shellId });
    return tankId;
  },
});

export const startMolt = mutation({
  args: { tankId: v.id("tanks") },
  handler: async (ctx, { tankId }) => {
    const playerId = await getCallerPlayerId(ctx);
    const tank = await ctx.db.get(tankId);
    if (!tank) throw new ConvexError("Tank not found");
    if (tank.hostPlayerId !== playerId)
      throw new ConvexError("Only the host can start a molt");
    if (tank.status !== "ready")
      throw new ConvexError("Tank is not ready to start");

    await ctx.db.patch(tankId, { status: "active" });
    return tankId;
  },
});

export const closeTank = mutation({
  args: { tankId: v.id("tanks") },
  handler: async (ctx, { tankId }) => {
    const playerId = await getCallerPlayerId(ctx);
    const tank = await ctx.db.get(tankId);
    if (!tank) throw new ConvexError("Tank not found");

    if (tank.hostPlayerId === playerId) {
      // Host closes — mark complete
      await ctx.db.patch(tankId, { status: "complete" });
    } else if (tank.challengerPlayerId === playerId) {
      // Challenger leaves — revert to waiting
      await ctx.db.patch(tankId, {
        challengerPlayerId: undefined,
        challengerShellId: undefined,
        status: "waiting",
      });
    } else {
      throw new ConvexError("Unauthorized");
    }
    return tankId;
  },
});
