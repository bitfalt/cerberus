import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getWalletBinding = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("worldIdWalletBindings")
      .withIndex("by_wallet_address", (q) => q.eq("walletAddress", args.walletAddress.toLowerCase()))
      .unique();
  },
});

export const getFreshVerification = query({
  args: {
    walletAddress: v.string(),
    action: v.string(),
    signalHash: v.optional(v.string()),
    proposalHash: v.optional(v.string()),
    now: v.number(),
  },
  handler: async (ctx, args) => {
    const verifications = await ctx.db
      .query("worldIdActionVerifications")
      .withIndex("by_wallet_address_and_action", (q) =>
        q.eq("walletAddress", args.walletAddress.toLowerCase()).eq("action", args.action)
      )
      .order("desc")
      .take(10);

    return verifications.find((verification) => {
      if (verification.status !== "verified") {
        return false;
      }
      if (verification.expiresAt < args.now) {
        return false;
      }
      if (args.signalHash && verification.signalHash !== args.signalHash) {
        return false;
      }
      if (args.proposalHash && verification.proposalHash !== args.proposalHash) {
        return false;
      }
      return true;
    }) ?? null;
  },
});

export const recordVerification = mutation({
  args: {
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
    metadata: v.optional(
      v.object({
        appId: v.optional(v.string()),
        environment: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const walletAddress = args.walletAddress.toLowerCase();
    const existingNullifier = await ctx.db
      .query("worldIdNullifiers")
      .withIndex("by_nullifier", (q) => q.eq("nullifier", args.nullifier))
      .unique();

    if (existingNullifier && existingNullifier.walletAddress !== walletAddress) {
      throw new Error("World ID nullifier already linked to a different wallet");
    }

    const verificationId = await ctx.db.insert("worldIdActionVerifications", {
      walletAddress,
      vaultAddress: args.vaultAddress.toLowerCase(),
      action: args.action,
      signalHash: args.signalHash,
      proposalHash: args.proposalHash,
      recoveryAddress: args.recoveryAddress?.toLowerCase(),
      nullifier: args.nullifier,
      requestNonce: args.requestNonce,
      verificationLevel: args.verificationLevel,
      protocolVersion: args.protocolVersion,
      verifiedAt: args.verifiedAt,
      expiresAt: args.expiresAt,
      status: "verified",
      metadata: args.metadata,
    });

    if (!existingNullifier) {
      await ctx.db.insert("worldIdNullifiers", {
        nullifier: args.nullifier,
        walletAddress,
        verificationId,
        createdAt: args.verifiedAt,
      });
    }

    const existingBinding = await ctx.db
      .query("worldIdWalletBindings")
      .withIndex("by_wallet_address", (q) => q.eq("walletAddress", walletAddress))
      .unique();

    if (existingBinding) {
      await ctx.db.patch(existingBinding._id, {
        latestVerificationId: verificationId,
        latestNullifier: args.nullifier,
        updatedAt: args.verifiedAt,
      });
    } else {
      await ctx.db.insert("worldIdWalletBindings", {
        walletAddress,
        latestVerificationId: verificationId,
        latestNullifier: args.nullifier,
        updatedAt: args.verifiedAt,
        createdAt: args.verifiedAt,
      });
    }

    return { verificationId };
  },
});
