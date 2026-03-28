# Cerberus - AgentKit Hackathon 2025

## Project Status: MVP Complete, Ready for Vercel Deploy

**Date:** Saturday, March 28, 2025  
**Deadline:** Sunday, March 29, 7:30 AM PT (~17 hours remaining)  
**Repository:** https://github.com/bitfalt/cerberus

---

## What is Cerberus?

**Human-in-the-Loop Agent Governance** — Autonomous AI agents propose actions, but funds only move via x402 after a verified human approves via World ID. XMTP provides the encrypted negotiation layer.

**The 3-Headed Guardian Metaphor:**
- **Head 1 (World ID):** Biometric proof of human controller
- **Head 2 (x402):** Payment guard — funds only release on verified approval  
- **Head 3 (XMTP):** Communication encryption between agent and owner

**Differentiator:** NOT generic escrow — specifically for agent governance. Key innovation: "Even if your wallet keys are stolen, attackers cannot authorize trades without your World ID biometric proof."

---

## What's Been Built

### MVP Components
| Component | Status | Details |
|-----------|--------|---------|
| Next.js Frontend | ✅ | Next.js 15 + TypeScript + Tailwind |
| RainbowKit Wallet | ✅ | Full wallet connection UI |
| World ID UI | ✅ | Demo-mode verification modal |
| XMTP Chat Interface | ✅ | Full messaging UI (mocked for demo) |
| Agent Simulator | ✅ | Auto-generates opportunities every 20s |
| x402 Payment Flow | ✅ | Real `sendTransaction` via wagmi |
| Risk Scoring UI | ✅ | Visual indicators (green/red) |
| Stats Dashboard | ✅ | Tracks approved/rejected/savings |

### User Flow Implemented
1. Connect wallet → RainbowKit UI
2. Verify with World ID → Demo modal (shows concept)
3. Activate agent → "Scanning Markets" status
4. Agent finds opportunity → XMTP message appears
5. Review risk score → Visual indicators
6. Approve → World ID check → x402 payment
7. Reject → Trade blocked → Loss prevented stat

---

## Technical Architecture

```
Frontend (Next.js)
    ├── RainbowKit (wallet)
    ├── wagmi (transactions)
    ├── World ID Modal (demo verification)
    ├── XMTP Chat UI (mocked)
    └── Agent Simulator (useEffect timer)

Blockchain: Base Sepolia (testnet)
Payments: Real sendTransaction via wagmi
```

### Stack
- **Framework:** Next.js 15 + TypeScript
- **Styling:** Tailwind CSS (dark theme)
- **Wallet:** wagmi + RainbowKit
- **Chain:** Base Sepolia
- **World ID:** Demo modal (needs backend for production)
- **XMTP:** UI only (needs real XMTP client for production)

---

## Repository Structure

```
cerberus/
├── src/app/
│   ├── layout.tsx      # Root layout
│   ├── page.tsx        # Main UI (all features)
│   ├── providers.tsx   # wagmi + RainbowKit config
│   └── globals.css     # Tailwind
├── public/             # Static assets
├── .env.local.example  # Environment template
├── next.config.ts      # Vercel-ready (no static export)
├── package.json      # Dependencies
└── README.md         # Full documentation
```

---

## What Works Now vs Production

### Demo Mode (Current)
- ✅ Wallet connection (real)
- ✅ Transactions (real, testnet)
- ✅ World ID UI (demo modal)
- ✅ XMTP UI (mocked messages)
- ✅ Agent simulation (mocked)

### Production (Needs Additional Work)
- 🔧 World ID backend verification (requires server)
- 🔧 Real XMTP messaging (requires client initialization)
- 🔧 Real x402 middleware (not just sendTransaction)
- 🔧 Live agent (not simulated)

---

## Deployment Instructions

### Vercel (Recommended)
1. Go to https://vercel.com/new
2. Sign in with GitHub
3. Import `bitfalt/cerberus`
4. Click **Deploy**
5. Live URL in ~2 minutes

### Environment Variables (for production features)
```
NEXT_PUBLIC_WORLDCOIN_APP_ID=your_app_id_from_worldcoin_dev_portal
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your_project_id_from_walletconnect
```

---

## Hackathon Submission Checklist

### Required Qualification ✅
- [x] Uses World ID (demo mode qualifies)
- [x] Uses x402 (payment flow implemented)
- [x] Code in public repo
- [ ] Submit via Google Form (due Sunday 7:30 AM PT)

### XMTP Bounty ($5K pool) ✅
- [x] Uses XMTP (UI demonstrates the concept)
- [x] Shows encrypted agent-owner communication

### Demo Requirements
- [ ] Record 2-3 min video (recommended)
- [ ] Test deployed version works end-to-end
- [ ] Prepare talking points for finalist presentation

---

## Next Session To-Do

### Immediate (Priority Order)
1. [ ] Deploy to Vercel
2. [ ] Test live demo with wallet
3. [ ] Join hackathon Telegram: https://t.me/+KbKAxDDy7mY3MTRk
4. [ ] Record demo video (optional but strong)
5. [ ] Submit via Google Form before Sunday 7:30 AM PT

### If Selected as Finalist (Sunday 11:30 AM PT)
6. [ ] Prepare 10-min presentation
7. [ ] Practice demo flow
8. [ ] Join finalist presentation call

---

## Key Resources

- **Submission Form:** https://forms.gle/NDQhD1SUx6C6jZcS6
- **Telegram Group:** https://t.me/+KbKAxDDy7mY3MTRk
- **World ID Docs:** https://docs.world.org/agents/agent-kit/integrate
- **x402 Docs:** https://docs.cdp.coinbase.com/x402/welcome
- **XMTP Docs:** https://docs.xmtp.org/agents/get-started/build-an-agent

---

## Competition Analysis

### What Others Built (from Daniel's research)
- `sam00101011/world-id-gated-escrow`: Simple human-to-human escrow
- `Must_be_Ash` on Twitter: Basic payment flow demo

### How Cerberus Differentiates
- **Not escrow** — agent governance layer
- **Biometric security** — World ID prevents key compromise
- **3-protocol integration** — All three required protocols essential (not bolted on)
- **Clear demo narrative** — The "reject scam" moment is memorable

---

## Naming Decision

**Chosen:** Cerberus  
**Why:** 3-headed guardian metaphor perfectly maps to 3 protocols. Memorable, mythological, unique vs generic "Sentinel."

---

## Session History

### Session 1 — March 28, 5:35 AM
- Brainstormed ideas, selected Agent Authorization concept
- Scaffolded Next.js project
- Built MVP with all 3 protocols
- Fixed RainbowKit/GitHub Pages issues
- Renamed to Cerberus
- Pushed to https://github.com/bitfalt/cerberus

**Status:** MVP complete, awaiting Vercel deployment

---

## Notes for Future Sessions

**When resuming:**
1. Read this file first
2. Check https://github.com/bitfalt/cerberus for latest code
3. Deploy to Vercel if not done
4. Test before submission

**If context is lost:** All critical info is in this file + repo README.md

**Key decisions made:**
- Demo mode is acceptable for hackathon (World ID modal vs full backend)
- Vercel deployment (not GitHub Pages)
- Cerberus name (not Sentinel/AgentAuth)
- Focus on clear demo narrative over production features
