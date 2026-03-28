# CERBERUS AGENTKIT HACKATHON - PRODUCTION IMPLEMENTATION PROMPT
## Handoff Document for New Session
**Using Convex (not Supabase) + Minimal Complexity Architecture**

---

## DATABASE VS ON-CHAIN ANALYSIS

### Do You Actually Need a Database?

**Honest Answer:** For Cerberus, you need **minimal persistence**, but not necessarily a full database. Here's what's actually required:

| Data Type | On-Chain/XMTP Option | Needs Database? | Recommendation |
|-----------|---------------------|-----------------|----------------|
| **XMTP Messages** | ✅ Stored on XMTP network, encrypted | No | Just local cache (IndexedDB) |
| **x402 Payments** | ✅ Settlement is on-chain, but need payment state | Maybe | Redis/Convex for ephemeral state |
| **Agent Opportunities** | ❌ Computed on-demand by AI | No | Compute live, don't store |
| **World ID Verifications** | ⚠️ Need nullifier hash tracking | Yes | Convex simple table |
| **Chat History** | ✅ XMTP provides history | No | Load from XMTP |
| **Agent Config** | ❌ Private prompts, API keys | No | Environment variables |

### The Minimal Architecture (RECOMMENDED)

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  RainbowKit │  │  XMTP V3    │  │  World ID IDKit     │  │
│  │  (Wallet)   │  │  (Messages) │  │  (Biometric Proof)  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │  x402 Client│  │  AgentKit   │  │  IndexedDB Cache    │  │
│  │  (Payments) │  │  (AI Agent) │  │  (XMTP messages)    │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              MINIMAL BACKEND (Convex + Redis)                │
│                                                              │
│  Convex (Serverless):                                        │
│  - worldIdVerifications table (nullifier_hash → wallet)      │
│  - agentLogs table (optional, for debugging)                 │
│                                                              │
│  Redis/Upstash:                                              │
│  - x402 payment state (pending → verified → settled)         │
│  - Rate limiting (optional)                                  │
└─────────────────────────────────────────────────────────────┘
```

**Why This Is Better:**
- ✅ XMTP already stores messages (don't duplicate)
- ✅ On-chain stores payments (don't duplicate)
- ✅ AI agent computes opportunities live (don't cache stale data)
- ⚠️ Only need DB for: World ID nullifier tracking (sybil resistance)

---

## CONVEX SETUP (Instead of Supabase)

### Why Convex?
- Serverless functions built-in (no separate API routes needed!)
- Real-time sync (perfect for agent messages)
- TypeScript-first
- Simpler than Supabase for this use case

### Convex Schema (Minimal)

```typescript
// convex/schema.ts
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
```

### Convex Functions (Replace API Routes)

```typescript
// convex/worldid.ts
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { verifyCloudProof } from "@worldcoin/idkit";

// Check if wallet is verified
export const isVerified = query({
  args: { walletAddress: v.string() },
  handler: async (ctx, { walletAddress }) => {
    const verification = await ctx.db
      .query("worldIdVerifications")
      .withIndex("by_wallet", (q) => q.eq("walletAddress", walletAddress))
      .first();
    return !!verification;
  },
});

// Verify and store World ID proof
export const verify = mutation({
  args: {
    proof: v.object({
      nullifier_hash: v.string(),
      merkle_root: v.string(),
      proof: v.string(),
      verification_level: v.string(),
    }),
    signal: v.string(), // wallet address
  },
  handler: async (ctx, { proof, signal }) => {
    // 1. Check if nullifier already used (prevents sybil attacks)
    const existing = await ctx.db
      .query("worldIdVerifications")
      .withIndex("by_nullifier", (q) => q.eq("nullifierHash", proof.nullifier_hash))
      .first();
    
    if (existing) {
      throw new Error("Nullifier already used");
    }

    // 2. Verify with World ID API
    const result = await verifyCloudProof(
      proof,
      process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID!,
      "cerberus_trade_approval",
      process.env.WORLDID_API_KEY!
    );

    if (!result.success) {
      throw new Error("Proof verification failed");
    }

    // 3. Store verification
    await ctx.db.insert("worldIdVerifications", {
      nullifierHash: proof.nullifier_hash,
      walletAddress: signal,
      verifiedAt: Date.now(),
    });

    return { verified: true };
  },
});
```

```typescript
// convex/agent.ts
import { v } from "convex/values";
import { action } from "./_generated/server";
import { AgentKit } from "@coinbase/agentkit";

// Agent scans markets and returns opportunities
export const scanMarkets = action({
  args: {},
  handler: async (ctx) => {
    // This runs as a serverless action with Node.js runtime
    const opportunities = await scanWithAgentKit();
    return opportunities;
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
  handler: async (ctx, args) => {
    await ctx.db.insert("agentLogs", {
      ...args,
      timestamp: Date.now(),
    });
  },
});
```

---

## UPDATED ARCHITECTURE (CONVEX-BASED)

```
src/
├── app/
│   ├── page.tsx              # Main UI (replace mocks)
│   ├── layout.tsx            # Root layout
│   ├── providers.tsx         # Wagmi + ConvexProvider
│   └── globals.css
│
├── components/
│   ├── WorldIDVerify.tsx     # Real IDKit widget
│   ├── XMTPChat.tsx          # Real XMTP client
│   ├── OpportunityCard.tsx   # Display agent finds
│   ├── ErrorBoundary.tsx     # Error handling
│   └── AgentStatus.tsx       # Show agent state
│
├── hooks/
│   ├── useXMTP.ts            # XMTP V3 React hook
│   ├── useWorldID.ts         # World ID verification
│   ├── useAgent.ts           # AgentKit integration
│   └── useX402.ts            # Payment flow
│
├── lib/
│   ├── xmtp/
│   │   ├── client.ts         # XMTP initialization
│   │   └── cache.ts          # IndexedDB persistence
│   │
│   ├── x402/
│   │   ├── client.ts         # Payment creation
│   │   └── verify.ts         # Settlement check
│   │
│   ├── agentkit/
│   │   └── agent.ts          # LLM agent setup
│   │
│   └── convex/
│       └── client.ts         # Convex client config
│
└── convex/                   # CONVEX BACKEND (replaces API routes)
    ├── schema.ts             # Database schema (minimal!)
    ├── worldid.ts            # World ID verification
    ├── agent.ts              # Agent actions
    └── _generated/           # Auto-generated by Convex
```

---

## XMTP: ON-CHAIN MESSAGING (NO DATABASE NEEDED!)

XMTP messages are **already stored on the XMTP network**. You just need local caching for performance:

```typescript
// lib/xmtp/cache.ts (IndexedDB, not Convex)
import { openDB } from 'idb';

const db = await openDB('xmtp-cache', 1, {
  upgrade(db) {
    db.createObjectStore('messages', { keyPath: 'id' });
  },
});

// Cache for performance, source of truth is XMTP network
export async function cacheMessage(message: DecodedMessage) {
  await db.put('messages', {
    id: message.id,
    content: message.content,
    senderAddress: message.senderAddress,
    sentAt: message.sentAt,
  });
}

export async function getCachedMessages(): Promise<DecodedMessage[]> {
  return await db.getAll('messages');
}
```

**Why not store in Convex?** 
- XMTP already encrypts and stores messages
- Duplicating encrypted data is wasteful
- Just need local cache for fast UI

---

## X402 PAYMENTS: REDIS ONLY (NOT CONVEX)

x402 needs **ephemeral state** (payment pending → verified → settled), not permanent storage:

```typescript
// lib/x402/state.ts
import { Redis } from 'ioredis';

const redis = new Redis(process.env.UPSTASH_REDIS_URL!);

interface PaymentState {
  id: string;
  status: 'pending' | 'verified' | 'settled' | 'failed';
  opportunityId: string;
  payerAddress: string;
  amount: string;
  expiresAt: number;
}

export async function createPaymentState(state: PaymentState) {
  await redis.setex(
    `payment:${state.id}`,
    3600, // 1 hour TTL
    JSON.stringify(state)
  );
}

export async function getPaymentState(id: string): Promise<PaymentState | null> {
  const data = await redis.get(`payment:${id}`);
  return data ? JSON.parse(data) : null;
}
```

**Why Redis not Convex?**
- Payment state expires (TTL)
- High write/read frequency
- Ephemeral by design

---

## COMPLETE ENVIRONMENT VARIABLES (CONVEX VERSION)

### Client-Side (NEXT_PUBLIC_)
```bash
# World ID
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_YOUR_APP_ID

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID

# XMTP
NEXT_PUBLIC_XMTP_ENV=production
NEXT_PUBLIC_AGENT_XMTP_ADDRESS=0x...  # Agent's XMTP identity

# Convex
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### Server-Side (Private)
```bash
# Convex (for server-side operations if needed)
CONVEX_DEPLOYMENT=your-deployment

# Redis (Upstash)
UPSTASH_REDIS_URL=rediss://default:password@host:6379

# Coinbase CDP
CDP_API_KEY_ID=your-key-id
CDP_API_KEY_SECRET=your-secret-key

# World ID
WORLDID_API_KEY=your-api-key

# LLM
OPENAI_API_KEY=your-key

# Market Data APIs (optional, can call from client)
COINGECKO_API_KEY=your-key
ZEROX_API_KEY=your-key

# RPC
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

---

## DEPENDENCIES (CONVEX VERSION)

```bash
# Core AI Agent
npm install @coinbase/agentkit @coinbase/agentkit-langchain

# x402 Payment Protocol
npm install @coinbase/x402

# Convex (replaces Supabase + API routes!)
npm install convex

# Redis for ephemeral state
npm install ioredis

# XMTP persistence (IndexedDB)
npm install idb

# LLM
npm install @langchain/openai

# Testing
npm install -D vitest @testing-library/react @testing-library/jest-dom
```

---

## API KEYS NEEDED (SIMPLIFIED LIST)

| Service | URL | Purpose | Cost |
|---------|-----|---------|------|
| **Convex** | https://convex.dev | Serverless functions + minimal DB | Free tier generous |
| **Upstash Redis** | https://upstash.com | x402 payment state | Free tier |
| **Coinbase CDP** | https://portal.cdp.coinbase.com | Agent wallet, x402 | Free tier |
| **World ID** | https://developer.worldcoin.org | Biometric verification | Free |
| **WalletConnect** | https://cloud.walletconnect.com | Wallet connection | Free tier |
| **OpenAI** | https://platform.openai.com | LLM for agent | Pay per use |
| **Alchemy** | https://alchemy.com | RPC node | Free tier |

**Note:** Coingecko and 0x are OPTIONAL - AgentKit has built-in providers!

---

## SUMMARY: WHAT YOU ACTUALLY NEED TO BUILD

### Frontend (Next.js)
1. ✅ XMTP V3 client initialization (with wallet signer)
2. ✅ Real x402 payment flow (using @coinbase/x402)
3. ✅ World ID IDKit widget (verify via Convex)
4. ✅ AgentKit integration (scan markets, propose trades)
5. ✅ IndexedDB cache for XMTP messages

### Backend (Convex + Redis)
1. ✅ Convex table: `worldIdVerifications` (just 1 table!)
2. ✅ Convex functions: `verify`, `isVerified`, `scanMarkets`
3. ✅ Redis: x402 payment state (ephemeral)

### That's it! No complex database schema.

---

## PHASE-BY-PHASE IMPLEMENTATION (CONVEX)

### Phase 1: Setup (1 day)
- [ ] Initialize Convex project (`npx convex init`)
- [ ] Set up Upstash Redis
- [ ] Create `convex/schema.ts` (minimal 1-2 tables)
- [ ] Install all dependencies

### Phase 2: XMTP + World ID (2-3 days)
- [ ] XMTP V3 client in browser
- [ ] World ID IDKit widget
- [ ] Convex `worldid.ts` functions

### Phase 3: x402 Payments (2 days)
- [ ] x402 client implementation
- [ ] Redis payment state
- [ ] Settlement verification

### Phase 4: AgentKit (3-4 days)
- [ ] Agent setup with CDP wallet
- [ ] Market scanning tools
- [ ] Opportunity proposal flow

### Phase 5: Polish (2 days)
- [ ] Error boundaries
- [ ] IndexedDB message cache
- [ ] Tests

**Total: ~2 weeks to production**

---

## WHY THIS IS BETTER THAN ORIGINAL PLAN

| Aspect | Original Plan (Supabase) | This Plan (Convex + Minimal) |
|--------|-------------------------|-------------------------------|
| **Database Tables** | 5 complex tables | 1-2 minimal tables |
| **API Routes** | 6+ Next.js API routes | 0 (Convex functions instead) |
| **Message Storage** | Duplicate in DB | Use XMTP network directly |
| **Payment State** | Complex DB rows | Simple Redis TTL keys |
| **Complexity** | High | **Low** |
| **Cost** | $25+/mo | **Free tier sufficient** |

---

## QUICK START FOR NEW SESSION

```bash
# 1. Go to project
cd /home/ubuntu/.hermes/projects/agentkit-hackathon-2025/my-app

# 2. Install Convex CLI and init
npx convex init

# 3. Install dependencies
npm install convex ioredis idb @coinbase/agentkit @coinbase/x402 @langchain/openai

# 4. Create convex/schema.ts (minimal version above)

# 5. Deploy Convex backend
npx convex dev

# 6. Start implementing Phase 2 (XMTP + World ID)
```

---

**END OF UPDATED HANDOFF DOCUMENT**

**Key Changes from Original:**
- ❌ Removed Supabase (complex SQL schema)
- ✅ Added Convex (serverless functions + minimal DB)
- ❌ Removed most database tables (not needed!)
- ✅ Added Redis for ephemeral x402 state
- ✅ Emphasized XMTP network storage (don't duplicate)
- ✅ Simplified architecture (lower complexity)

If you're reading this in a new session: **Start with Phase 1 (Convex setup), then Phase 2 (XMTP + World ID).**
