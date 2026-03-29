import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  worldIdWalletBindings: defineTable({
    walletAddress: v.string(),
    latestVerificationId: v.optional(v.id("worldIdActionVerifications")),
    latestNullifier: v.optional(v.string()),
    updatedAt: v.number(),
    createdAt: v.number(),
  }).index("by_wallet_address", ["walletAddress"]),

  worldIdActionVerifications: defineTable({
    walletAddress: v.string(),
    vaultAddress: v.string(),
    action: v.string(),
    signalHash: v.string(),
    proposalHash: v.optional(v.string()),
    recoveryAddress: v.optional(v.string()),
    nullifier: v.string(),
    requestNonce: v.string(),
    verificationLevel: v.string(),
    protocolVersion: v.string(),
    verifiedAt: v.number(),
    expiresAt: v.number(),
    status: v.union(v.literal("verified"), v.literal("revoked"), v.literal("expired")),
    metadata: v.optional(
      v.object({
        appId: v.optional(v.string()),
        environment: v.optional(v.string()),
      })
    ),
  })
    .index("by_wallet_address", ["walletAddress"])
    .index("by_wallet_address_and_action", ["walletAddress", "action"])
    .index("by_signal_hash", ["signalHash"])
    .index("by_proposal_hash", ["proposalHash"]),

  worldIdNullifiers: defineTable({
    nullifier: v.string(),
    walletAddress: v.string(),
    verificationId: v.id("worldIdActionVerifications"),
    createdAt: v.number(),
  })
    .index("by_nullifier", ["nullifier"])
    .index("by_wallet_address", ["walletAddress"]),

  agentLogs: defineTable({
    action: v.string(),
    opportunityId: v.optional(v.string()),
    metadata: v.optional(v.object({
      riskScore: v.optional(v.number()),
      expectedProfit: v.optional(v.string()),
      proposalHash: v.optional(v.string()),
    })),
    timestamp: v.number(),
  }).index("by_timestamp", ["timestamp"]),
});
