# AgentAuth

Human-in-the-Loop Agent Governance powered by World ID, Coinbase x402, and XMTP.

## Overview

AgentAuth enables autonomous AI agents to propose actions, but funds only move via x402 after a verified human approves via World ID. XMTP provides the encrypted negotiation layer between agents and their owners.

## Key Features

- **World ID Integration**: Biometric proof that the human controller (not a compromised key) is authorizing actions
- **x402 Payments**: Conditional payment release — funds only move after verified approval
- **XMTP Messaging**: Encrypted agent-owner communication channel
- **Risk Scoring**: Agents evaluate and present risk scores for each opportunity
- **Demo Flow**: Clear "approve vs reject" narrative showing protection from scams

## Tech Stack

- Next.js 15 + TypeScript
- Tailwind CSS
- wagmi + RainbowKit (wallet connection)
- World ID (IDKit)
- XMTP (messaging layer)
- Base Sepolia (testnet)

## Getting Started

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Edit .env.local with your actual API keys

# Run dev server
npm run dev

# Build for production
npm run build
```

## Demo Script

1. Connect wallet
2. Verify with World ID (simulated in demo)
3. Activate the agent
4. Agent finds opportunities and messages via XMTP
5. Approve a good trade (shows x402 payment flow)
6. Reject a suspicious trade (shows protection from scam)
7. View stats on losses prevented

## Hackathon

Built for AgentKit Hackathon 2025 hosted by World, Coinbase, and XMTP.

Qualifies for:
- Main Prize ($15K pool): Uses World ID + x402
- XMTP Bounty ($5K pool): Uses XMTP messaging

## License

MIT
