# Cerberus 🐕‍🦺

**Human-in-the-Loop Agent Governance** powered by World ID, Coinbase x402, and XMTP.

Built for AgentKit Hackathon 2025 hosted by World, Coinbase, and XMTP.

> Named after the three-headed guardian of the underworld — Cerberus guards your agents with three protections: World ID (biometric proof), x402 (payment guard), and XMTP (communication encryption).

## 🚀 Live Demo

**Try it now:** [https://cerberus-demo.vercel.app](https://cerberus-demo.vercel.app)

**Repository:** https://github.com/bitfalt/cerberus

## 📺 Demo Video

[Link to demo video - 2 minutes showing the full flow]

## What is Cerberus?

As AI agents become autonomous (trading, purchasing, scheduling), users face a dilemma:
- **Full autonomy:** Risk of rogue agents making bad decisions
- **Manual approval:** Slow, friction-heavy, kills the agent advantage

**Cerberus** solves this with a lightweight authorization layer:

1. **Agent proposes** → Detects opportunity, messages owner via **XMTP**
2. **Human verifies** → Uses **World ID** to prove they're the real controller
3. **Payment releases** → **x402** micropayment executes only on verified signal
4. **Agent acts** → Executes the approved action

## 🎯 Key Innovation

**Not just escrow — it's agent governance with biometric verification:**

- Even if your wallet keys are compromised, attackers **cannot** authorize trades without your **World ID biometric proof**
- XMTP provides the encrypted channel for agent-owner negotiation
- x402 enables conditional payment flows

## 🛠 Tech Stack

- **Frontend:** Next.js 15 + TypeScript + Tailwind CSS + App Router
- **Wallet:** wagmi + RainbowKit
- **Chain:** Base Sepolia
- **Identity:** World ID v4 (IDKit with backend verification)
- **Payments:** Coinbase x402 protocol (real signature verification)
- **Messaging:** XMTP V3 with MLS encryption
- **Architecture:** API routes for verification and payment processing

## 🎮 How to Demo

### Setup
1. Visit the live demo
2. Connect your wallet (Base Sepolia)
3. Verify with World ID (demo mode for hackathon)

### Scenario 1: Approve a Good Trade
1. Click "Activate Agent"
2. Wait for agent to find an opportunity (15-20 seconds)
3. Review the proposal in the XMTP chat
4. Click "Approve (x402)" 
5. See the transaction confirmation

### Scenario 2: Block a Suspicious Trade (The "Aha!" Moment)
1. Wait for a "High Risk" / "Unverified" opportunity
2. Review the low risk score and warning labels
3. Click "Reject"
4. See the blocked message and potential loss prevented

### Key Features to Highlight
- ✅ World ID verification required for approvals (prevents key compromise)
- ✅ XMTP encrypted messaging between agent and owner
- ✅ x402 conditional payment flow
- ✅ Real-time stats on losses prevented

## ✅ Production Features

### World ID v4 Backend Verification
- Real backend verification via `/api/verify`
- Uses World ID Developer API v2
- Supports both v3 and v4 proof formats
- Biometric nullifier validation
- Server-side proof validation (not just client-side)

### x402 Payment Protocol
- **Two-step payment flow**: Create → Sign → Verify
- EIP-712 signed payment messages via wallet
- Backend payment verification using @coinbase/x402
- In-memory payment store with 30-min expiry
- Real signature validation before authorization

### XMTP V3 with MLS
- **MLS (Messaging Layer Security)** encryption
- Real-time bidirectional message streaming
- Conversation persistence via XMTP network
- Inbox ID-based sender identification
- Dynamic imports to avoid SSR WASM issues

### Realistic Agent Scanner
- Multi-factor risk calculation algorithm:
  - Contract audit status (+30 points)
  - Social sentiment score (0-30 points)
  - Contract age maturity (+25 points)
  - Liquidity depth (+20 points)
  - Trading volume (+15 points)
  - Address heuristics (+10 points)
  - Type-based adjustments
- 7-phase scanning progress visualization
- Weighted opportunity selection (suspicious trades prioritized for demo)
- Dynamic legitimacy classification (Verified/Caution/Unverified)

## 📦 Installation

```bash
# Clone the repo
git clone https://github.com/bitfalt/cerberus.git
cd cerberus

# Install dependencies
npm install

# Set up environment
cp .env.local.example .env.local
# Edit .env.local with your credentials

# Run dev server
npm run dev

# Build for production
npm run build
```

## 🏆 Hackathon Qualification

### Required (Main Prize $15K pool)
- ✅ Uses and demonstrates **World ID**
- ✅ Uses and demonstrates **Coinbase x402**
- ✅ Submit by Sunday, March 29, 7:30 AM PT

### Additional (XMTP Bounty $5K pool)
- ✅ Uses **XMTP** messaging in the application
- ✅ Demonstrates agent-owner encrypted communication

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx          # Root layout with providers
│   ├── page.tsx            # Main UI with all features
│   ├── providers.tsx       # wagmi + RainbowKit config
│   ├── globals.css         # Tailwind styles
│   └── api/
│       ├── verify/route.ts      # World ID verification endpoint
│       └── x402/pay/route.ts    # x402 payment processing
public/                     # Static assets
docs/
└── plans/                  # Implementation plans
```

## 🔐 Environment Variables

```env
# World ID - App ID for verification (get from https://developer.worldcoin.org)
NEXT_PUBLIC_WORLDCOIN_APP_ID=your_app_id
WORLDCOIN_APP_ID=your_app_id

# WalletConnect - Project ID for RainbowKit (get from https://cloud.walletconnect.com)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id

# XMTP - Environment (dev for testing, production for mainnet)
NEXT_PUBLIC_XMTP_ENV=dev
```

**Required Setup:**
1. Get World ID App ID from [World ID Developer Portal](https://developer.worldcoin.org)
2. Get WalletConnect Project ID from [WalletConnect Cloud](https://cloud.walletconnect.com)
3. Copy `.env.local.example` to `.env.local` and fill in values

## 📝 License

MIT License — feel free to fork and build on this!

## 🙏 Acknowledgments

Built for the **AgentKit Hackathon 2025** hosted by:
- **World** (World ID)
- **Coinbase** (x402)
- **XMTP** (messaging)

## 📧 Contact

Daniel Garbanzo — Cerberus project

---

**Built for the AgentKit Hackathon** 🐕‍🦺
