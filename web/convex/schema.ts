import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Player profile — one per authenticated user
  players: defineTable({
    userId: v.id("users"), // FK to authTables.users
    username: v.string(),
    hardness: v.number(), // ELO rank (default 1000)
    moltsPlayed: v.number(),
    moltsWon: v.number(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_hardness", ["hardness"]),

  // Shells (saved crawler loadouts) — owned by a player
  shells: defineTable({
    playerId: v.id("players"),
    name: v.string(),
    cards: v.array(v.string()),
    directive: v.string(), // system prompt
    skills: v.array(v.string()), // selected claws
    stats: v.object({
      totalWeight: v.number(),
      totalOverhead: v.number(),
      armorValue: v.number(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_playerId", ["playerId"]),

  // Tanks — 1v1 match rooms, owned by host
  tanks: defineTable({
    hostPlayerId: v.id("players"),
    challengerPlayerId: v.optional(v.id("players")),
    hostShellId: v.id("shells"),
    challengerShellId: v.optional(v.id("shells")),
    status: v.union(
      v.literal("waiting"),
      v.literal("ready"),
      v.literal("active"),
      v.literal("complete"),
    ),
    moltId: v.optional(v.string()), // Cloudflare DO molt ID
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_hostPlayerId", ["hostPlayerId"]),

  // Molt history — record of every completed molt
  molts: defineTable({
    tankId: v.optional(v.id("tanks")),
    winnerId: v.optional(v.id("players")),
    loserId: v.optional(v.id("players")),
    winnerShellId: v.optional(v.id("shells")),
    loserShellId: v.optional(v.id("shells")),
    durationMs: v.number(),
    tickCount: v.number(),
    replayUrl: v.optional(v.string()),
    completedAt: v.number(),
  })
    .index("by_completedAt", ["completedAt"])
    .index("by_winnerId", ["winnerId"])
    .index("by_loserId", ["loserId"]),

  // Waitlist — email captures
  waitlist: defineTable({
    email: v.string(),
    source: v.optional(v.string()),
    signedUpAt: v.number(),
  }).index("by_email", ["email"]),

  // Auth event log — observability for sign-in reliability
  authEvents: defineTable({
    emailHash: v.optional(v.string()),
    method: v.union(v.literal("github"), v.literal("email-otp"), v.literal("guest")),
    success: v.boolean(),
    errorCode: v.optional(v.string()),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),

  // Purchases — founder pack and future monetization
  purchases: defineTable({
    userId: v.optional(v.string()),
    email: v.optional(v.string()),
    stripeSessionId: v.string(),
    amount: v.number(),
    status: v.union(v.literal("completed"), v.literal("pending"), v.literal("refunded")),
    createdAt: v.number(),
  })
    .index("by_stripeSessionId", ["stripeSessionId"])
    .index("by_email", ["email"]),
});
