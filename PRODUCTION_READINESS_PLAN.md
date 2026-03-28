# CERBERUS PRODUCTION READINESS PLAN
## AgentKit Hackathon 2025 → Full Production Implementation

**Date:** March 28, 2026  
**Project:** Cerberus (AgentAuth)  
**Path:** `/home/ubuntu/.hermes/projects/agentkit-hackathon-2025/my-app`  

---

## EXECUTIVE SUMMARY

The current Cerberus implementation is a frontend demo with 100% mocked integrations:
- ❌ **AI Agent:** `setInterval` picking from hardcoded array
- ❌ **XMTP:** Local React state (lost on refresh)
- ❌ **x402:** Regular `sendTransaction` to zero address
- ❌ **World ID:** Button that sets `state = true`
- ❌ **Market Data:** 3 hardcoded opportunities

**This plan details exactly what needs to be built for production.**

---

## PHASE 1: BACKEND INFRASTRUCTURE (Week 1-2)

### 1.1 Create API Layer (REQUIRED)

Current: No `/api` routes exist  
Need: Full Next.js API routes structure

```
src/app/api/
├── agent/
│   └── route.ts          # AgentKit LLM integration
├── xmtp/
│   └── route.ts          # Server-side XMTP operations
├── x402/
│   └── route.ts          # Payment settlement verification
├── worldid/
│   └── verify/route.ts   # IDKit proof verification
├── market/
│   └── route.ts          # Price feeds, DEX quotes
└── db/
    └── opportunities/route.ts  # CRUD for opportunities
```

### 1.2 Database Setup (REQUIRED)

**Recommended: Supabase (PostgreSQL)**

```sql
-- Core tables needed
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
    encrypted_payload BYTEA,  -- Actual XMTP encryption
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

### 1.3 Redis for x402 Payment Store (REQUIRED)

Current: In-memory Map  
Need: Redis for multi-instance production

```typescript
// lib/redis.ts
import { Redis } from 'ioredis';

export const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  tls: process.env.NODE_ENV === 'production' ? {} : undefined,
});

// x402 payment store schema
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

## PHASE 2: REAL AI AGENT (Week 2-3)

### 2.1 Install AgentKit (CRITICAL MISSING DEPENDENCY)

```bash
npm install @coinbase/agentkit @coinbase/agentkit-langchain
```

### 2.2 AgentKit Integration

**Current:** `setInterval` picking from `AGENT_OPPORTUNITIES`  
**Need:** Real LLM-powered agent with tools

```typescript
// src/app/api/agent/route.ts
import { AgentKit, CdpWalletProvider } from '@coinbase/agentkit';
import { createReactAgent } from '@coinbase/agentkit-langchain';

// Agent configuration
const walletProvider = await CdpWalletProvider.configureWithWallet({
  apiKeyName: process.env.CDP_API_KEY_ID!,
  apiKeyPrivateKey: process.env.CDP_API_KEY_SECRET!,
  networkId: 'base-sepolia', // or 'base-mainnet'
});

const agentKit = await AgentKit.from({
  walletProvider,
  actionProviders: [
    // Trading tools
    new DexScreenerActionProvider(),
    new CoingeckoActionProvider(),
    // Messaging
    new XMTPActionProvider(),
    // Payments
    new X402ActionProvider(),
  ],
});

// LangChain agent
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

### 2.3 Agent Tools Implementation

```typescript
// lib/agent-tools/market-scan.ts
interface MarketOpportunity {
  type: 'arbitrage' | 'nft' | 'mev';
  tokenIn: string;
  tokenOut: string;
  expectedProfit: string; // ETH
  riskScore: number;
  dex: string;
  path: string[];
}

export async function scanForOpportunities(): Promise<MarketOpportunity[]> {
  // Real implementations needed:
  
  // 1. DEX price feeds (Coingecko Pro API)
  const prices = await fetch('https://pro-api.coingecko.com/api/v3/simple/price', {
    headers: { 'X-Cg-Pro-Api-Key': process.env.COINGECKO_API_KEY! },
  });
  
  // 2. 0x API for quotes across DEXs
  const quotes = await fetch(
    `https://api.0x.org/swap/v1/quote?${new URLSearchParams({
      sellToken: 'ETH',
      buyToken: 'USDC',
      sellAmount: '1000000000000000000', // 1 ETH
    })}`,
    { headers: { '0x-api-key': process.env.ZEROX_API_KEY! } }
  );
  
  // 3. NFT market data (Reservoir API)
  const nftDeals = await fetch(
    `https://api.reservoir.tools/collections/trends/v1`,
    { headers: { 'x-api-key': process.env.RESERVOIR_API_KEY! } }
  );
  
  // 4. MEV opportunities (Flashbots relay or mev-share)
  
  // Calculate arbitrage opportunities
  return detectArbitrage(prices, quotes, nftDeals);
}
```

---

## PHASE 3: XMTP V3 PRODUCTION (Week 3)

### 3.1 Current State (MOCKED)

```typescript
// src/app/page.tsx - CURRENT (lines 45-78)
interface XMTPMessage {
  id: string;
  from: "agent" | "owner";
  content: string;
  timestamp: number;
}
// Just local React state - no encryption, no persistence
```

### 3.2 Production XMTP V3

**Package:** Already have `@xmtp/xmtp-js@^13.0.4`  
**Issue:** Need to use V3 API properly (not V2 with skipContactPublishing)

```typescript
// lib/xmtp/client.ts
import { Client, type Signer } from '@xmtp/xmtp-js';
import { ethers } from 'ethers';

export async function initializeXMTP(walletSigner: Signer) {
  // V3 initialization - no skipContactPublishing needed
  const client = await Client.create(walletSigner, {
    env: 'production', // NOT 'dev'
  });
  
  // Conversations (V3 API)
  const conversations = await client.conversations.list();
  
  // Start new conversation with agent
  const agentAddress = process.env.NEXT_PUBLIC_AGENT_XMTP_ADDRESS!;
  const conversation = await client.conversations.newConversation(agentAddress);
  
  return { client, conversation };
}

// React hook
export function useXMTP() {
  const { address } = useAccount();
  const signer = useEthersSigner(); // From wagmi
  
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
```

### 3.3 XMTP Message Persistence

Current: Messages lost on refresh  
Need: Local cache + XMTP network sync

```typescript
// lib/xmtp/persistence.ts
import { openDB } from 'idb';

const db = await openDB('xmtp-cache', 1, {
  upgrade(db) {
    db.createObjectStore('messages', { keyPath: 'id' });
    db.createObjectStore('conversations', { keyPath: 'topic' });
  },
});

export async function cacheMessage(message: DecodedMessage) {
  await db.put('messages', {
    id: message.id,
    topic: message.conversation.topic,
    senderAddress: message.senderAddress,
    content: message.content,
    sentAt: message.sentAt,
  });
}
```

---

## PHASE 4: x402 PAYMENT PROTOCOL (Week 3-4)

### 4.1 Current State (MOCKED)

```typescript
// src/app/page.tsx - CURRENT (lines 128-134)
// COMMENT: "In production, this would use actual x402 protocol"
sendTransaction({
  to: "0x0000000000000000000000000000000000000000",
  value: parseEther(proposal.price),
});
```

### 4.2 Real x402 Implementation

**Install:**
```bash
npm install @coinbase/x402
```

**Architecture:**
```
┌─────────────┐         402 Payment Required          ┌──────────────┐
│   Client    │ ─────────────────────────────────────▶ │   Resource   │
│  (Browser)  │ ◀───────────────────────────────────── │   Server     │
│             │    X-Payment-Response (signed)        │   (API)      │
└─────────────┘                                         └──────────────┘
       │                                                        │
       │         On-chain settlement verification               │
       └───────────────────────────────────────────────────────▶│
                           (Base Sepolia/Base Mainnet)
```

**Implementation:**

```typescript
// lib/x402/client.ts
import { 
  createPaymentHeader, 
  verifyPayment,
  type PaymentDetails 
} from '@coinbase/x402/client';
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
    deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour
  });
  
  // 4. Send payment to resource
  const paidResponse = await fetch(resourceUrl, {
    method: 'POST',
    headers: {
      'X-Payment-Response': JSON.stringify(payment),
    },
    body: JSON.stringify({ opportunityId: opportunity.id }),
  });
  
  // 5. Server verifies payment on-chain before executing trade
  const result = await paidResponse.json();
  return result;
}

// Resource server (API route)
// src/app/api/execute-trade/route.ts
import { settlePayment } from '@coinbase/x402/server';

export async function POST(request: Request) {
  const paymentHeader = request.headers.get('X-Payment-Response');
  
  if (!paymentHeader) {
    // Return 402 with payment requirements
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

### 4.3 CDP API Keys Required

**Get from:** https://portal.cdp.coinbase.com  
**Required scopes:**
- `wallets:read`
- `wallets:transactions:write`
- `onchain:read`

**Environment variables:**
```bash
CDP_API_KEY_ID=your-key-id
CDP_API_KEY_SECRET=your-secret
```

---

## PHASE 5: WORLD ID VERIFICATION (Week 4)

### 5.1 Current State (MOCKED)

```typescript
// Lines 100-116, 439-482
const completeWorldIDVerification = () => {
  setWorldIdVerified(true); // Just sets state!
  setShowWorldIDModal(false);
};
// Button labeled "Verify (Demo)"
```

### 5.2 Real World ID Integration

Package already installed: `@worldcoin/idkit@^4.0.11`

```typescript
// components/WorldIDVerify.tsx
import { IDKitWidget, VerificationLevel } from '@worldcoin/idkit';
import type { ISuccessResult } from '@worldcoin/idkit';

export function WorldIDVerifyButton() {
  const verifyOnServer = async (proof: ISuccessResult) => {
    // Send to server for verification
    const res = await fetch('/api/worldid/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(proof),
    });
    
    if (!res.ok) throw new Error('Verification failed');
    
    const { verified, nullifierHash } = await res.json();
    return { verified, nullifierHash };
  };

  return (
    <IDKitWidget
      app_id={process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID!}
      action="cerberus_trade_approval"
      verification_level={VerificationLevel.Device} // or Orb
      handleVerify={verifyOnServer}
      onSuccess={(result) => {
        console.log('World ID verified:', result.nullifier_hash);
        // Store verification in state/database
      }}
    >
      {({ open }) => (
        <button onClick={open}>
          Verify with World ID
        </button>
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
    // Store nullifier hash to prevent reuse
    await supabase.from('worldid_verifications').insert({
      nullifier_hash: proof.nullifier_hash,
      wallet_address: proof.signal,
    });
    
    return Response.json({ 
      verified: true, 
      nullifierHash: proof.nullifier_hash 
    });
  }
  
  return Response.json({ verified: false }, { status: 400 });
}
```

---

## PHASE 6: ERROR BOUNDARIES & TESTING (Week 5)

### 6.1 React Error Boundaries

```typescript
// components/ErrorBoundary.tsx
'use client';

import { Component, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Send to Sentry/LogRocket
    console.error('Cerberus Error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold text-red-500">Something went wrong</h2>
          <p className="mt-2 text-zinc-400">
            The agent encountered an error. Please refresh and try again.
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

### 6.2 Test Coverage

```bash
# Install testing dependencies
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

```typescript
// tests/xmtp.test.ts
import { describe, it, expect, vi } from 'vitest';
import { useXMTP } from '@/lib/xmtp/client';

describe('XMTP Integration', () => {
  it('should initialize client with wallet signer', async () => {
    const mockSigner = vi.fn();
    const { client } = await initializeXMTP(mockSigner);
    
    expect(client).toBeDefined();
    expect(client.address).toBeDefined();
  });
  
  it('should send encrypted message', async () => {
    const conversation = { send: vi.fn() };
    await sendTestMessage(conversation, 'Test message');
    
    expect(conversation.send).toHaveBeenCalledWith('Test message');
  });
});

// tests/x402.test.ts
describe('x402 Payment Flow', () => {
  it('should create valid payment header', async () => {
    const payment = await createPaymentHeader({
      wallet: mockWallet,
      amount: parseEther('0.1'),
      receiver: '0x...',
    });
    
    expect(payment).toHaveProperty('signature');
    expect(payment).toHaveProperty('deadline');
  });
  
  it('should verify payment on-chain', async () => {
    const settlement = await settlePayment({ payment: mockPayment });
    expect(settlement.verified).toBe(true);
  });
});
```

---

## PHASE 7: ENVIRONMENT VARIABLES

### 7.1 Client-Side (NEXT_PUBLIC_)

```bash
# .env.local

# World ID
NEXT_PUBLIC_WORLDCOIN_APP_ID=app_YOUR_APP_ID

# WalletConnect
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=YOUR_PROJECT_ID

# XMTP
NEXT_PUBLIC_XMTP_ENV=production

# Agent
NEXT_PUBLIC_AGENT_XMTP_ADDRESS=0x...  # Agent's XMTP identity
```

### 7.2 Server-Side (Private)

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/cerberus
REDIS_URL=redis://user:pass@host:6379

# Coinbase CDP
CDP_API_KEY_ID=your-key-id
CDP_API_KEY_SECRET=your-secret-key

# World ID
WORLDID_API_KEY=your-api-key

# API Keys for Market Data
COINGECKO_API_KEY=your-key
ZEROX_API_KEY=your-key
RESERVOIR_API_KEY=your-key

# AgentKit
AGENTKIT_API_KEY=your-key
OPENAI_API_KEY=your-key  # Or other LLM provider

# XMTP
XMTP_ENCRYPTION_KEY=your-private-key  # Server-side XMTP operations

# RPC
BASE_RPC_URL=https://base-mainnet.g.alchemy.com/v2/YOUR_KEY
```

---

## API KEYS NEEDED FROM DANIEL

| Service | URL | What You Need | Priority |
|---------|-----|---------------|----------|
| **Coinbase CDP** | https://portal.cdp.coinbase.com | CDP_API_KEY_ID, CDP_API_KEY_SECRET | CRITICAL |
| **World ID** | https://developer.worldcoin.org | App ID, API Key | CRITICAL |
| **WalletConnect** | https://cloud.walletconnect.com | Project ID | CRITICAL |
| **Coingecko** | https://www.coingecko.com/en/api/pricing | API Key (Pro) | HIGH |
| **0x** | https://0x.org/docs/introduction | API Key | HIGH |
| **Reservoir** | https://reservoir.tools | API Key | MEDIUM |
| **OpenAI** | https://platform.openai.com | API Key | HIGH |
| **Alchemy/Infura** | https://www.alchemy.com | Base RPC URL | HIGH |
| **Supabase** | https://supabase.com | Database URL | CRITICAL |
| **Upstash Redis** | https://upstash.com | Redis URL | HIGH |

---

## IMPLEMENTATION TIMELINE

| Week | Focus | Deliverables |
|------|-------|--------------|
| **Week 1** | Backend setup | Database schema, Redis, API routes skeleton |
| **Week 2** | AgentKit integration | Real LLM agent with tools, market scanning |
| **Week 3** | XMTP + x402 | Encrypted messaging, payment protocol |
| **Week 4** | World ID + polish | Real verification, UI improvements |
| **Week 5** | Testing + deployment | Error boundaries, tests, Vercel deploy |

---

## FILES TO MODIFY/CREATE

### New Files (Backend)
```
src/app/api/agent/route.ts
src/app/api/x402/route.ts
src/app/api/worldid/verify/route.ts
src/app/api/market/route.ts
src/lib/db/supabase.ts
src/lib/redis/client.ts
src/lib/xmtp/client.ts
src/lib/x402/client.ts
src/lib/agentkit/agent.ts
src/lib/agent-tools/market-scan.ts
```

### Modified Files
```
src/app/page.tsx (replace mocks with real integrations)
src/app/providers.tsx (add env validation)
.env.local.example (add all required vars)
```

### New Dependencies
```json
{
  "@coinbase/agentkit": "^0.x",
  "@coinbase/x402": "^0.x",
  "@worldcoin/idkit": "^4.x",
  "ioredis": "^5.x",
  "@supabase/supabase-js": "^2.x",
  "idb": "^8.x"
}
```

---

## NEXT STEPS

1. **Daniel to obtain API keys** (see table above)
2. **I will implement Phase 1** (backend infrastructure) - pending your approval
3. **I will implement Phase 2** (AgentKit) - pending your approval
4. **I will implement Phase 3** (XMTP V3) - pending your approval
5. **I will implement Phase 4** (x402) - pending your approval
6. **I will implement Phase 5** (World ID) - pending your approval
7. **I will implement Phase 6** (Testing) - pending your approval

**APPROVAL REQUIRED BEFORE I MAKE ANY CHANGES.**

This plan addresses EVERY item from your original list:
- ✅ XMTP V3 full migration
- ✅ x402 with real CDP settlement
- ✅ Real price feeds (Coingecko, 0x)
- ✅ Redis for payment store
- ✅ DEX integration
- ✅ Real World ID
- ✅ Error boundaries
- ✅ Test coverage

---

END OF PRODUCTION READINESS PLAN
