import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";

// Agent scans markets and returns opportunities
export const scanMarkets = action({
  args: {},
  handler: async (ctx: any) => {
    // This runs as a serverless action with Node.js runtime
    // Actual implementation calls AgentKit
    try {
      const { scanWithAgentKit } = await import("../src/lib/agentkit/agent");
      const opportunities = await scanWithAgentKit();
      
      // Log the scan action
      await ctx.db.insert("agentLogs", {
        action: "scan",
        timestamp: Date.now(),
      });
      
      return { success: true, opportunities };
    } catch (error) {
      console.error("Agent scan failed:", error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error",
        opportunities: []
      };
    }
  },
});

// Log agent decisions (optional debugging)
export const logAction = mutation({
  args: {
    action: v.string(),
    opportunityId: v.optional(v.string()),
    metadata: v.optional(v.object({
      riskScore: v.number(),
      expectedProfit: v.string(),
    })),
  },
  handler: async (ctx: any, args: any) => {
    await ctx.db.insert("agentLogs", {
      action: args.action,
      opportunityId: args.opportunityId,
      metadata: args.metadata,
      timestamp: Date.now(),
    });
  },
});

// Get recent agent logs
export const getLogs = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx: any, { limit = 50 }: { limit?: number }) => {
    return await ctx.db
      .query("agentLogs")
      .order("desc")
      .take(limit);
  },
});

// Check rate limit for a key
export const checkRateLimit = query({
  args: { 
    key: v.string(),
    windowMs: v.number(), // e.g., 60000 for 1 minute
    maxRequests: v.number(), // e.g., 10 requests per window
  },
  handler: async (ctx: any, { key, windowMs, maxRequests }: { key: string; windowMs: number; maxRequests: number }) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q: any) => q.eq("key", key))
      .first();
    
    if (!existing || existing.windowStart < windowStart) {
      // New window
      return { allowed: true, remaining: maxRequests - 1 };
    }
    
    if (existing.count >= maxRequests) {
      return { allowed: false, remaining: 0, resetAt: existing.windowStart + windowMs };
    }
    
    return { allowed: true, remaining: maxRequests - existing.count - 1 };
  },
});

// Increment rate limit counter
export const incrementRateLimit = mutation({
  args: { 
    key: v.string(),
    windowMs: v.number(),
  },
  handler: async (ctx: any, { key, windowMs }: { key: string; windowMs: number }) => {
    const now = Date.now();
    const windowStart = now - windowMs;
    
    const existing = await ctx.db
      .query("rateLimits")
      .withIndex("by_key", (q: any) => q.eq("key", key))
      .first();
    
    if (!existing || existing.windowStart < windowStart) {
      // New window
      await ctx.db.insert("rateLimits", {
        key,
        count: 1,
        windowStart: now,
      });
    } else {
      // Increment existing
      await ctx.db.patch(existing._id, {
        count: existing.count + 1,
      });
    }
    
    return { success: true };
  },
});
