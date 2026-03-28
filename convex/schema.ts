import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Only truly necessary table: World ID verifications
  worldIdVerifications: defineTable({
    nullifierHash: v.string(), // Unique per person
    walletAddress: v.string(),
    verifiedAt: v.number(), // timestamp
  })
    .index("by_nullifier", ["nullifierHash"])
    .index("by_wallet", ["walletAddress"]),

  // Optional: Agent operation logs (for debugging)
  agentLogs: defineTable({
    action: v.string(), // "scan", "propose", "reject", "execute"
    opportunityId: v.optional(v.string()),
    metadata: v.optional(v.object({
      riskScore: v.optional(v.number()),
      expectedProfit: v.optional(v.string()),
    })),
    timestamp: v.number(),
  }),

  // Optional: Rate limiting for API calls
  rateLimits: defineTable({
    key: v.string(), // IP or wallet address
    count: v.number(),
    windowStart: v.number(), // timestamp
  }),
});
