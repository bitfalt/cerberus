import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Check if wallet is verified
export const isVerified = query({
  args: { walletAddress: v.string() },
  handler: async (ctx: any, { walletAddress }: { walletAddress: string }) => {
    const verification = await ctx.db
      .query("worldIdVerifications")
      .withIndex("by_wallet", (q: any) => q.eq("walletAddress", walletAddress.toLowerCase()))
      .first();
    return !!verification;
  },
});

// Verify and store World ID proof
export const verify = mutation({
  args: {
    nullifierHash: v.string(),
    walletAddress: v.string(),
  },
  handler: async (ctx: any, { nullifierHash, walletAddress }: { nullifierHash: string; walletAddress: string }) => {
    // 1. Check if nullifier already used (prevents sybil attacks)
    const existing = await ctx.db
      .query("worldIdVerifications")
      .withIndex("by_nullifier", (q: any) => q.eq("nullifierHash", nullifierHash))
      .first();
    
    if (existing) {
      throw new Error("Nullifier already used - World ID can only verify one wallet per person");
    }

    // 2. Check if wallet already verified
    const existingWallet = await ctx.db
      .query("worldIdVerifications")
      .withIndex("by_wallet", (q: any) => q.eq("walletAddress", walletAddress.toLowerCase()))
      .first();

    if (existingWallet) {
      return { verified: true, alreadyVerified: true };
    }

    // 3. Store verification
    await ctx.db.insert("worldIdVerifications", {
      nullifierHash,
      walletAddress: walletAddress.toLowerCase(),
      verifiedAt: Date.now(),
    });

    return { verified: true, alreadyVerified: false };
  },
});
