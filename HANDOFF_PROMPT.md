# CERBERUS AGENTKIT HACKATHON - PRODUCTION IMPLEMENTATION PROMPT
## Handoff Document for New Session

---

## PROJECT LOCATION & CONTEXT

**Project Path:** `/home/ubuntu/.hermes/projects/agentkit-hackathon-2025/my-app`  
**Purpose:** Cerberus (AgentAuth) - Autonomous AI trading agent with human-in-the-loop governance  
**Current State:** Frontend demo with 100% mocked integrations (hackathon submission)  
**Goal:** Full production-ready implementation with real integrations

---

## CURRENT STATE (100% MOCKED - READ THIS CAREFULLY)

### File Structure (Only 5 source files!)
```
src/app/
├── page.tsx       (494 lines - main UI, ALL MOCKS HERE)
├── layout.tsx     (22 lines - clean, minimal)
├── providers.tsx  (30 lines - wagmi/rainbow config)
├── globals.css    (26 lines - tailwind)
└── favicon.ico
```

### Current Mocked Components (in src/app/page.tsx)

| Line Range | Component | Current (FAKE) Implementation | Production Need |
|------------|-----------|------------------------------|-----------------|
| 9-43 | `AGENT_OPPORTUNITIES` | Hardcoded static array with 3 items: NFT flip, arbitrage, suspicious pre-sale. Just picked randomly by `setInterval` every 20 seconds | Real AgentKit LLM agent with live market scanning |
| 45-78 | XMTP Messages | Local React `useState` array. No encryption. No persistence. Messages lost on refresh. | Real XMTP V3 client with encrypted messaging, wallet-signed identity |
| 100-116, 439-482 | World ID | `completeWorldIDVerification()` just calls `setWorldIdVerified(true)`. Button labeled "Verify (Demo)" | Real IDKit widget with server-side proof verification |
| 128-134 | x402 Payments | Regular `useSendTransaction` to `0x0000...0000` with comment "In production, this would use actual x402 protocol" | Real x402 streaming payment protocol with CDP settlement |
| 81-98 | Agent Logic | `setInterval(() => random(AGENT_OPPORTUNITIES), 20000)` | Real AI agent with LangChain, tools, reasoning |

### Current Dependencies (package.json)
```json
{
  "@coinbase/onchainkit": "^1.1.2",      // Present but not used for x402
  "@rainbow-me/rainbowkit": "^2.2.10",     // Wallet connection
  "@tanstack/react-query": "^5.95.2",      // State management
  "@worldcoin/idkit": "^4.0.11",          // Present but IDKit widget NOT IMPLEMENTED
  "@xmtp/xmtp-js": "^13.0.4",             // Present but XMTP client NOT INITIALIZED
  "next": "16.2.1",
  "viem": "^2.47.6",                      // Ethereum interactions
  "wagmi": "^2.19.5"                      // React hooks for Ethereum
}
```

**CRITICAL MISSING DEPENDENCIES:**
- `@coinbase/agentkit` - Core AI agent framework
- `@coinbase/x402` - Payment protocol
- `ioredis` - For production payment store
- `@supabase/supabase-js` - Database
- `idb` - IndexedDB for XMTP message cache

### Environment Variables (.env.local.example)
```bash
# CURRENT (incomplete):
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_YOUR_APP_ID_HERE
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
# NEXT_PUBLIC_XMTP_ENV=production  # Commented out!

# MISSING FOR PRODUCTION:
# - CDP_API_KEY_ID / CDP_API_KEY_SECRET
# - COINGECKO_API_KEY
# - ZEROX_API_KEY
# - OPENAI_API_KEY
# - DATABASE_URL
# - REDIS_URL
# - XMTP_ENCRYPTION_KEY
# - WORLDID_API_KEY
```

---

## PRODUCTION IMPLEMENTATION PLAN (7 PHASES)

### PHASE 1: BACKEND INFRASTRUCTURE (Week 1-2)

**Create API Routes:**
```
src/app/api/
├── agent/route.ts              # AgentKit LLM integration
├── xmtp/route.ts               # Server-side XMTP operations  
├── x402/route.ts               # Payment settlement verification
├── worldid/verify/route.ts     # IDKit proof verification
├── market/route.ts             # Price feeds, DEX quotes
└── db/opportunities/route.ts   # CRUD for opportunities
```

**Database Schema (Supabase PostgreSQL):**
```sql
CREATE TABLE opportunities (
    id UUID PRIMARY KEY,
    agent_id TEXT NOT NULL,
    type TEXT CHECK (type IN ('NFT', 'Trade', 'Arbitrage')),
    title TEXT NOT NULL,
    description TEXT,
    price_eth DECIMAL(20, 18),
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    urgency TEXT CHECK (urgency IN ('low', 'medium', 'high')),
    legitimacy TEXT CHECK (legitimacy IN ('verified', 'unverified')),
    status TEXT DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE xmtp_messages (
    id UUID PRIMARY KEY,
    conversation_id TEXT NOT NULL,
    sender_address TEXT NOT NULL,
    content TEXT NOT NULL,
    encrypted_payload BYTEA,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    read BOOLEAN DEFAULT FALSE
);

CREATE TABLE agent_decisions (
    id UUID PRIMARY KEY,
    opportunity_id UUID REFERENCES opportunities(id),
    decision TEXT CHECK (decision IN ('propose', 'reject', 'hold')),
    reasoning TEXT,
    ai_confidence DECIMAL(3,2),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE worldid_verifications (
    nullifier_hash TEXT PRIMARY KEY,
    wallet_address TEXT NOT NULL,
    verified_at TIMESTAMPTZ DEFAULT NOW(),
    proof_payload JSONB
);

CREATE TABLE x402_payments (
    id UUID PRIMARY KEY,
    opportunity_id UUID REFERENCES opportunities(id),
    payer_address TEXT NOT NULL,
    recipient_address TEXT NOT NULL,
    amount_eth DECIMAL(20, 18),
    tx_hash TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    settled_at TIMESTAMPTZ
);
```

**Redis Setup for x402:**
```typescript
// lib/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
});

interface PaymentState {
  id: string;
  status: 'pending' | 'verified' | 'settled' | 'failed';
  opportunityId: string;
  payerAddress: string;
  amount: string;
  createdAt: number;
  expiresAt: number;
}
```

---

### PHASE 2: REAL AI AGENT (Week 2-3)

**Install:**
```bash
npm install @coinbase/agentkit @coinbase/agentkit-langchain
```

**Implementation:**
```typescript
// src/app/api/agent/route.ts
import { AgentKit, CdpWalletProvider } from '@coinbase/agentkit';
import { createReactAgent } from '@coinbase/agentkit-langchain';
import { ChatOpenAI } from '@langchain/openai';

const walletProvider = await CdpWalletProvider.configureWithWallet({
  apiKeyName: process.env.CDP_API_KEY_ID!,
  apiKeyPrivateKey: process.env.CDP_API_KEY_SECRET!,
  networkId: 'base-sepolia', // or 'base-mainnet'
});

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    new DexScreenerActionProvider(),
    new CoingeckoActionProvider(),
    new XMTPActionProvider(),
    new X402ActionProvider(),
  ],
});

const agent = createReactAgent({
  llm: new ChatOpenAI({ model: 'gpt-4o' }),
  tools: agentKit.getTools(),
  messageModifier: `You are Cerberus, an autonomous trading agent with human-in-the-loop approval.
  
  Your job:
  1. Monitor markets for opportunities (arbitrage, NFT deals, MEV)
  2. Calculate risk scores 0-100
  3. Propose trades to human via XMTP
  4. NEVER execute without human approval + World ID verification
  
  Risk scoring criteria:
  - Liquidity depth
  - Historical volatility
  - Smart contract audit status
  - Time sensitivity (MEV decay)`,
});
```

**Market Scanning Tools:**
```typescript
// lib/agent-tools/market-scan.ts
interface MarketOpportunity {
  type: 'arbitrage' | 'nft' | 'mev';
  tokenIn: string;
  tokenOut: string;
  expectedProfit: string;
  riskScore: number;
  dex: string;
  path: string[];
}

export async function scanForOpportunities(): Promise<MarketOpportunity[]> {
  // 1. Coingecko Pro API
  const prices = await fetch('https://pro-api.coingecko.com/api/v3/simple/price', {
    headers: { 'X-Cg-Pro-Api-Key': process.env.COINGECKO_API_KEY! },
  });
  
  // 2. 0x API for quotes
  const quotes = await fetch(
    `https://api.0x.org/swap/v1/quote?${new URLSearchParams({
      sellToken: 'ETH',
      buyToken: 'USDC',
      sellAmount: '1000000000000000000',
    })}`,
    { headers: { '0x-api-key': process.env.ZEROX_API_KEY! } }
  );
  
  // 3. NFT market data (Reservoir API)
  const nftDeals = await fetch(
    `https://api.reservoir.tools/collections/trends/v1`,
    { headers: { 'x-api-key': process.env.RESERVOIR_API_KEY! } }
  );
  
  return detectArbitrage(prices, quotes, nftDeals);
}
```

---

### PHASE 3: XMTP V3 MESSAGING (Week 3)

**Current (Mocked):**
```typescript
// Lines 45-78 in page.tsx
interface XMTPMessage {
  id: string;
  from: "agent" | "owner";
  content: string;
  timestamp: number;
}
// Just local React state - no encryption!
```

**Production:**
```typescript
// lib/xmtp/client.ts
import { Client, type Signer } from '@xmtp/xmtp-js';

export async function initializeXMTP(walletSigner: Signer) {
  const client = await Client.create(walletSigner, {
    env: 'production',
  });
  
  const agentAddress = process.env.NEXT_PUBLIC_AGENT_XMTP_ADDRESS!;
  const conversation = await client.conversations.newConversation(agentAddress);
  
  return { client, conversation };
}

// React hook
export function useXMTP() {
  const { address } = useAccount();
  const signer = useEthersSigner();
  
  const [client, setClient] = useState<Client | null>(null);
  const [messages, setMessages] = useState<DecodedMessage[]>([]);
  
  useEffect(() => {
    if (!signer) return;
    
    initializeXMTP(signer).then(({ client }) => {
      setClient(client);
      
      // Stream messages in real-time
      const stream = client.conversations.streamMessages();
      (async () => {
        for await (const message of stream) {
          setMessages(prev => [...prev, message]);
          cacheMessage(message); // IndexedDB persistence
        }
      })();
    });
  }, [signer]);
  
  const sendMessage = async (content: string) => {
    if (!client) throw new Error('XMTP not initialized');
    const conversation = await client.conversations.newConversation(
      process.env.NEXT_PUBLIC_AGENT_XMTP_ADDRESS!
    );
    await conversation.send(content);
  };
  
  return { client, messages, sendMessage };
}

// Message persistence with IndexedDB
// lib/xmtp/persistence.ts
import { openDB } from 'idb';

const db = await openDB('xmtp-cache', 1, {
  upgrade(db) {
    db.createObjectStore('messages', { keyPath: 'id' });
    db.createObjectStore('conversations', { keyPath: 'topic' });
  },
});
```

---

### PHASE 4: x402 PAYMENT PROTOCOL (Week 3-4)

**Current (Mocked):**
```typescript
// Lines 128-134 in page.tsx
// COMMENT: "In production, this would use actual x402 protocol"
sendTransaction({
  to: "0x0000000000000000000000000000000000000000",
  value: parseEther(proposal.price),
});
```

**Production:**
```bash
npm install @coinbase/x402
```

```typescript
// lib/x402/client.ts
import { createPaymentHeader, verifyPayment, type PaymentDetails } from '@coinbase/x402/client';
import { WalletClient } from 'viem';

export async function executeX402Payment(
  wallet: WalletClient,
  opportunity: Opportunity,
  resourceUrl: string
) {
  // 1. Request resource (gets 402 response with payment requirements)
  const response = await fetch(resourceUrl, {
    method: 'POST',
    body: JSON.stringify({ opportunityId: opportunity.id }),
  });
  
  if (response.status !== 402) {
    throw new Error('Resource did not require payment');
  }
  
  // 2. Parse payment requirements from 402 response
  const paymentDetails: PaymentDetails = JSON.parse(
    response.headers.get('X-Payment-Required')!
  );
  
  // 3. Create signed payment
  const payment = await createPaymentHeader({
    wallet,
    amount: parseEther(opportunity.price),
    receiver: paymentDetails.receiver,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  });
  
  // 4. Send payment to resource
  const paidResponse = await fetch(resourceUrl, {
    method: 'POST',
    headers: { 'X-Payment-Response': JSON.stringify(payment) },
    body: JSON.stringify({ opportunityId: opportunity.id }),
  });
  
  return paidResponse.json();
}

// Server-side settlement
// src/app/api/execute-trade/route.ts
import { settlePayment } from '@coinbase/x402/server';

export async function POST(request: Request) {
  const paymentHeader = request.headers.get('X-Payment-Response');
  
  if (!paymentHeader) {
    return new Response('Payment Required', {
      status: 402,
      headers: {
        'X-Payment-Required': JSON.stringify({
          scheme: 'x402',
          network: 'base-sepolia',
          receiver: process.env.AGENT_WALLET_ADDRESS,
          amount: calculateRequiredAmount(opportunity),
        }),
      },
    });
  }
  
  // Verify payment on-chain
  const settlement = await settlePayment({
    payment: JSON.parse(paymentHeader),
    rpcUrl: process.env.BASE_RPC_URL!,
  });
  
  if (!settlement.verified) {
    return new Response('Payment verification failed', { status: 402 });
  }
  
  // Execute the actual trade
  const tradeResult = await executeTrade(opportunity);
  
  return Response.json({ 
    success: true, 
    txHash: settlement.txHash,
    trade: tradeResult 
  });
}
```

---

### PHASE 5: WORLD ID VERIFICATION (Week 4)

**Current (Mocked):**
```typescript
// Lines 100-116, 439-482
const completeWorldIDVerification = () => {
  setWorldIdVerified(true); // Just sets state!
  setShowWorldIDModal(false);
};
// Button labeled "Verify (Demo)"
```

**Production:**
```typescript
// components/WorldIDVerify.tsx
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
import type { ISuccessResult } from '@worldcoin/idkit';

export function WorldIDVerifyButton() {
  const verifyOnServer = async (proof: ISuccessResult) => {
    const res = await fetch('/api/worldid/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    });
    
    if (!res.ok) throw new Error('Verification failed');
    return res.json();
  };

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID!}
      action="cerberus_trade_approval"
      verification_level={VerificationLevel.Device}
      handleVerify={verifyOnServer}
      onSuccess={(result) => {
        console.log('World ID verified:', result.nullifier_hash);
      }}
    >
      {({ open }) => (
        <button onClick={open}>Verify with World ID</button>
      )}
    </IDKitWidget>
  );
}

// Server-side verification
// src/app/api/worldid/verify/route.ts
import { verifyCloudProof } from '@worldcoin/idkit';

export async function POST(request: Request) {
  const proof = await request.json();
  
  const verifyResult = await verifyCloudProof(
    proof,
    process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID!,
    'cerberus_trade_approval',
    process.env.WORLDID_API_KEY!
  );
  
  if (verifyResult.success) {
    await supabase.from('worldid_verifications').insert({
      nullifier_hash: proof.nullifier_hash,
      wallet_address: proof.signal,
    });
    
    return Response.json({ verified: true });
  }
  
  return Response.json({ verified: false }, { status: 400 });
}
```

---

### PHASE 6: ERROR BOUNDARIES (Week 5)

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; fallback?: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Cerberus Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-500">Something went wrong</h2>
          <p className="mt-2 text-zinc-400">
            The agent encountered an error. Please refresh.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
          >
            Refresh
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

---

### PHASE 7: TESTING & DEPLOYMENT (Week 5)

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// tests/xmtp.test.ts
import { describe, it, expect, vi } from 'vitest';
import { initializeXMTP } from '@/lib/xmtp/client';

describe('XMTP Integration', () => {
  it('should initialize client with wallet signer', async () => {
    const mockSigner = vi.fn();
    const { client } = await initializeXMTP(mockSigner);
    expect(client).toBeDefined();
  });
});
```

---

## FILES TO CREATE/MODIFY

### New Backend Files
```
src/app/api/agent/route.ts
src/app/api/xmtp/route.ts
src/app/api/x402/route.ts
src/app/api/worldid/verify/route.ts
src/app/api/market/route.ts
src/app/api/db/opportunities/route.ts

src/lib/db/supabase.ts
src/lib/redis/client.ts
src/lib/xmtp/client.ts
src/lib/xmtp/persistence.ts
src/lib/x402/client.ts
src/lib/agentkit/agent.ts
src/lib/agent-tools/market-scan.ts

components/WorldIDVerify.tsx
components/ErrorBoundary.tsx
```

### Modified Files
```
src/app/page.tsx           # Replace all mocks with real integrations
src/app/providers.tsx       # Add env validation, multi-chain
.env.local.example         # Add all production env vars
package.json               # Add missing dependencies
```

---

## COMPLETE ENVIRONMENT VARIABLES

### Client-Side (NEXT_PUBLIC_)
```bash
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_YOUR_APP_ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID
NEXT_PUBLIC_XMTP_ENV=production
NEXT_PUBLIC_AGENT_XMTP_ADDRESS=0x...  # Agent's XMTP identity
NEXT_PUBLIC_AGENTKIT_API_KEY=your-key
NEXT_PUBLIC_COINGECKO_API_KEY=your-key  # If using client-side price display
```

### Server-Side (Private)
```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/cerberus
REDIS_URL=redis://user:pass@host:6379

# Coinbase CDP (from https://portal.cdp.coinbase.com)
CDP_API_KEY_ID=your-key-id
CDP_API_KEY_SECRET=your-secret-key

# World ID (from https://developer.worldcoin.org)
WORLDID_API_KEY=your-api-key

# Market Data APIs
COINGECKO_API_KEY=your-key
ZEROX_API_KEY=your-key
RESERVOIR_API_KEY=your-key

# LLM
OPENAI_API_KEY=your-key

# XMTP Server Operations
XMTP_ENCRYPTION_KEY=your-private-key

# RPC
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

---

## API KEYS DANIEL NEEDS TO OBTAIN

| Priority | Service | URL | Cost |
|----------|---------|-----|------|
| 🔴 CRITICAL | **Coinbase CDP** | https://portal.cdp.coinbase.com | Free tier available |
| 🔴 CRITICAL | **World ID** | https://developer.worldcoin.org | Free |
| 🔴 CRITICAL | **WalletConnect** | https://cloud.walletconnect.com | Free tier |
| 🟡 HIGH | **Supabase** | https://supabase.com | Free tier |
| 🟡 HIGH | **Upstash Redis** | https://upstash.com | Free tier |
| 🟡 HIGH | **Coingecko Pro** | https://www.coingecko.com/en/api/pricing | $129/mo for Pro |
| 🟡 HIGH | **0x API** | https://0x.org/docs/introduction | Free with limits |
| 🟡 HIGH | **OpenAI** | https://platform.openai.com | Pay per use |
| 🟡 HIGH | **Alchemy** | https://www.alchemy.com | Free tier |

---

## DEPENDENCIES TO INSTALL

```bash
# Core AI Agent
npm install @coinbase/agentkit @coinbase/agentkit-langchain

# x402 Payment Protocol
npm install @coinbase/x402

# Database & Cache
npm install @supabase/supabase-js ioredis

# XMTP Persistence
npm install idb

# LangChain LLM (or your preferred provider)
npm install @langchain/openai

# Testing (dev dependencies)
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

---

## VERIFICATION CHECKLIST

Before calling any phase "complete":

- [ ] All API calls use real credentials (no mocks)
- [ ] Database records are actually persisted (check Supabase dashboard)
- [ ] XMTP messages are encrypted (verify with XMTP network explorer)
- [ ] x402 payments settle on-chain (verify tx hash on basescan.org)
- [ ] World ID proofs are verified server-side (check nullifier hash uniqueness)
- [ ] Agent decisions come from LLM (not hardcoded logic)
- [ ] Error boundaries catch crashes without page reload
- [ ] Tests pass for all critical paths

---

## IMMEDIATE ACTION ITEMS

1. **Verify current codebase state:**
   - Check that `src/app/page.tsx` still has the mocked implementations
   - Confirm `AGENT_OPPORTUNITIES` array is still hardcoded
   - Verify no API routes exist yet

2. **Create Phase 1 infrastructure:**
   - Set up Supabase project
   - Run SQL schema migration
   - Create API route skeletons
   - Install missing dependencies

3. **Get API keys from Daniel:**
   - At minimum: CDP, World ID, WalletConnect, Supabase, Redis

---

## REFERENCE FILES (ALREADY CREATED)

- `/home/ubuntu/.hermes/projects/agentkit-hackathon-2025/my-app/CODEBASE_AUDIT_REPORT.txt` (12.8 KB)
  - Detailed file-by-file audit of all mocked components
  
- `/home/ubuntu/.hermes/projects/agentkit-hackathon-2025/my-app/PRODUCTION_READINESS_PLAN.md` (22 KB)
  - Extended version with more implementation details

---

## TROUBLESHOOTING

**XMTP V3 Issues:**
- If you get "V2 deprecation errors", you're using the wrong API
- XMTP V3 uses `Client.create()` not legacy patterns
- Check `@xmtp/xmtp-js` version is ^13.0.4 or higher

**x402 Settlement Failures:**
- CDP API keys must have `wallets:transactions:write` scope
- Verify on Base Sepolia testnet first before mainnet
- Redis must be accessible from serverless functions

**AgentKit Errors:**
- Requires Node.js 18+ 
- CDP keys must be configured before agent initialization
- WalletProvider needs valid private key for agent wallet

---

## SUCCESS CRITERIA

The implementation is complete when:

1. ✅ Agent finds REAL market opportunities (not hardcoded array)
2. ✅ User receives REAL XMTP encrypted messages from agent
3. ✅ x402 payment settles on-chain with real ETH
4. ✅ World ID verification requires actual biometric proof
5. ✅ All opportunities have risk scores calculated by LLM
6. ✅ No `setInterval`, `Math.random()`, or mock data anywhere
7. ✅ Chat history persists across page refreshes
8. ✅ Error boundaries prevent white-screen crashes
9. ✅ Tests verify all critical user flows

---

**END OF HANDOFF DOCUMENT**

If you're reading this in a new session, you have ALL the context needed to implement Cerberus production. Start with Phase 1 (backend infrastructure) and work through to Phase 7.

**Current project location:** `/home/ubuntu/.hermes/projects/agentkit-hackathon-2025/my-app`
