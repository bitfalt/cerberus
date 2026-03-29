# Cerberus

Cerberus is a governed execution system for agent-controlled funds built for the World x Coinbase x XMTP hackathon.

It combines:

- `World AgentKit` to verify that the worker agent is backed by a real human before it can access premium quote data
- `World ID` to verify the human controller before governed outflows
- `x402` to charge an authorization fee before execution is unlocked
- `XMTP` to carry proposals, approvals, rejections, and execution updates
- `Base Mainnet` for live quote discovery
- `Base Sepolia` for governed vault execution

The security claim is intentionally narrow and honest:

- funds deposited into the Cerberus vault cannot move with a stolen wallet key alone
- governed execution requires the approval flow Cerberus enforces

## What the app does

Cerberus lets a persistent worker discover a live market opportunity, propose it over XMTP, and then require a verified human to approve and pay before the vault can execute anything on-chain.

The product flow is:

1. The user deploys and funds a governed vault on `Base Sepolia`
2. The worker requests premium quote access through a `World AgentKit` protected route
3. The worker fetches a live `Base Mainnet` quote and creates a proposal
4. The proposal is delivered through `XMTP`
5. The user verifies with `World ID`
6. The user pays the `x402` authorization fee from the connected wallet
7. Cerberus issues the execution authorization
8. The vault executes on `Base Sepolia`

## Architecture

```text
Browser UI (Vercel)
  -> Vercel API routes
    -> Redis (workflow state)
    -> Convex (World ID verification records)
    -> World ID verify API
    -> Base Sepolia (vault state / execution)

Railway worker
  -> XMTP agent inbox
  -> World AgentKit protected quote endpoint
  -> Base Mainnet quote source
  -> Redis (scan queue / proposals / heartbeat)

Base Mainnet
  -> live quote discovery only

Base Sepolia
  -> governed vault deployment and execution
```

## Protocol roles

### World AgentKit
- Protects the worker-facing premium quote route
- Uses AgentBook verification so the worker must be a human-backed registered agent
- Prevents the quote source from being an unbounded unauthenticated bot endpoint

### World ID
- Verifies the human controller for governed outflows
- Bound to action, wallet, vault, proposal context, and nonce
- Stored in Convex for freshness/replay checks

### x402
- Collects the authorization fee before Cerberus signs execution
- Paid by the connected browser wallet, not the vault
- Currently implemented for `Base Sepolia`

### XMTP
- Carries the proposal and approval negotiation layer
- The worker has a persistent XMTP identity
- The browser owner inbox approves or rejects proposals through XMTP

### Base Mainnet
- Used for real quote discovery
- Current quote source is a protected premium quote route backed by live market access

### Base Sepolia
- Hosts the governed vault and execution flow
- Keeps the demo safe while preserving real on-chain enforcement

## What is implemented

- Governed `CerberusVault` and `CerberusVaultFactory` contracts
- EIP-712 authorization payloads for execution, withdrawal, and recovery
- `World ID v4` request and verification flow
- `World AgentKit` protected premium quote endpoint
- Redis-backed workflow state for proposals, scans, payments, and worker heartbeat
- Convex-backed World ID verification registry
- Persistent XMTP worker and browser-side XMTP inbox integration
- x402 payment intent creation, payload creation, verification, and settlement flow
- Base Mainnet quote-backed proposals
- Base Sepolia governed execution path

## Judge notes

- This project uses both `World AgentKit` and `World ID`.
- `World AgentKit` protects the worker agent path.
- `World ID` protects the human controller approval path.
- `x402` is not decorative; execution authorization is fee-gated.
- `XMTP` is not decorative; proposals and approvals move through XMTP.
- Quote discovery is live on `Base Mainnet`.
- Execution is demonstrated safely on `Base Sepolia`.

## Deployment model

- `Web`: Vercel
- `Worker`: Railway
- `Redis`: Upstash
- `Convex`: hosted deployment
- `Contracts`: Base Sepolia

The worker should not run on Vercel. It needs:

- a long-lived process
- a persistent XMTP database
- continuous access to Redis and the quote route

## Environment variables

Use [`.env.local.example`](/Users/bitfalt/Developer/cerberus/.env.local.example) as the template.

High-level groups:

- public web config
- Vercel server config
- Redis
- Base Sepolia RPC
- Base Mainnet RPC
- Cerberus signer key
- worker secrets
- optional World x402 config

Important runtime expectations:

- the connected wallet needs `Base Sepolia ETH` for gas
- the connected wallet needs `Base Sepolia USDC` for the x402 fee
- the worker wallet must be registered in AgentBook

## Setup order

1. Deploy contracts to `Base Sepolia`
2. Set Vercel env vars, including contract addresses and RPC URLs
3. Set Railway env vars, including worker wallet, XMTP DB values, Redis, and app URL
4. Register the worker wallet in World AgentBook:

```bash
npx @worldcoin/agentkit-cli register <agent-wallet-address>
```

5. Deploy the Railway worker
6. Deploy Vercel
7. Confirm `/api/health` shows Redis and worker heartbeat

## Verification checklist

- `npm run contracts:compile`
- `npm run contracts:test`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Confirm the worker heartbeat is visible in `/api/health`
- Confirm the worker can pass the AgentKit quote challenge
- Confirm a proposal is created and delivered over XMTP
- Confirm World ID verification succeeds
- Confirm x402 payment settles
- Confirm the vault can execute on-chain

## Current limitations

- Execution is demonstrated on `Base Sepolia`, not Base Mainnet
- The system is a production-grade demo architecture, not an audited mainnet custody system
- `world` x402 support is architecture-ready but `base-sepolia` is the currently implemented payment network

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run contracts:compile
npm run contracts:test
npm run contracts:deploy:base-sepolia
npm run worker:dev
npm run worker:start
```
