# Cerberus

Cerberus is a governed-vault demo for the World x Coinbase x XMTP AgentKit hackathon.

It is designed so that funds deposited into a Cerberus vault on Base Sepolia cannot move with a stolen wallet key alone.

The live architecture is:

- `Base`: live opportunity discovery and quote sourcing
- `Base Sepolia`: final authority for governed funds, withdrawals, recovery, and executions
- `XMTP`: proposal and approval transport layer
- `World ID v4`: fresh human verification for governed outflows
- `x402`: paid authorization issuance, designed to stay chain-agnostic
- `Redis`: active workflow coordination, TTLs, locks, and payment sessions
- `Convex`: World ID verification registry and nullifier protection
- `Vercel web`: dashboard + API routes
- `Persistent worker`: XMTP agent inbox + AgentKit proposal publishing

## What is implemented

- Guarded `CerberusVault` and `CerberusVaultFactory` contracts
- EIP-712 execution, withdrawal, and recovery authorization shapes
- World ID v4 request + verify flow using official RP signing helpers
- Convex-backed World ID verification registry
- Redis-backed proposal and payment workflow state
- x402 payment intent, verification, and settlement flow
- Real Base Mainnet quote-backed proposal generation with worker-owned opportunity discovery
- XMTP browser inbox for the owner and a persistent Node worker for the agent
- Vault-first dashboard for creation, bootstrap, funding, proposal review, payment, execution, withdrawal, and recovery
- Contract deployment script and Hardhat node tests for the vault lifecycle

## Why the worker exists

The worker is not decorative.

It is required because XMTP agent identities need:

- a long-lived process to stream messages continuously
- a persistent local XMTP database so the installation identity survives restarts
- a single authority that can publish proposals and process approvals/rejections

Vercel is excellent for the web app and short-lived API routes, but it is the wrong runtime for an always-on XMTP agent.

## Important limitations

This repo is now a real production-demo architecture, but it still needs deployment values for:

- Base Sepolia contract addresses
- Cerberus signer private key
- XMTP worker private key and DB encryption key
- WalletConnect project id if you do not want to use the documented default

If those values are missing, the app builds and the dashboard loads, but the protected actions will refuse to proceed until configured.

## Environment variables

Use `.env.local.example` as the template.

Required groups:

- Public web config
- World ID server config
- Redis
- Base Sepolia RPC
- Base Mainnet RPC for live quote discovery
- Cerberus signer key
- Agent worker secrets

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
```

## Deployments

- `Web`: Vercel
- `Worker`: Railway (recommended), Fly.io, or Render
- `Contracts`: Base Sepolia
- `Redis`: Upstash or equivalent
- `Convex`: hosted deployment

### Worker hosting recommendation

If you want the easiest setup, use `Railway` for the worker.

Why:

- easiest environment variable management
- simple persistent volume setup for the XMTP local DB
- easy logs and restarts
- less operational friction than Fly for this use case

Free hosting is the hard part: truly persistent background workers with disk are rarely free in a reliable way.

If you need the most realistic cheap path:

- `Vercel` for web
- `Railway` for worker
- `Upstash` for Redis
- `Convex` hosted

That is the highest signal-to-effort deployment setup for this repo.

## Suggested rollout order

1. Deploy contracts to Base Sepolia
2. Copy the printed factory and adapter addresses into your public env vars
3. Set the Cerberus signer private key and Base Sepolia RPC URL
4. Set World ID and Redis env vars
5. Set Base Mainnet RPC for quote discovery
6. Start the XMTP worker with persistent storage
7. Confirm the worker can fetch live Base Mainnet quotes and publish proposals
8. Deploy the web app to Vercel
9. Confirm the worker inbox address matches `NEXT_PUBLIC_XMTP_AGENT_ADDRESS`

## Verification checklist

- `npm run contracts:compile`
- `npm run typecheck`
- `npm run lint`
- `npm run build`
- Start the worker and confirm it logs a valid XMTP inbox
- Create a vault from the dashboard
- Bootstrap the vault
- Fund the vault
- Run a scan and confirm proposals land in Redis and XMTP
- Confirm the proposal carries Base Mainnet quote metadata and Base Sepolia execution metadata
- Complete World ID verification
- Complete x402 payment
- Execute through the vault

## x402 payment networks

`base-sepolia` is fully implemented now.

`world` is supported by the architecture and the EVM gateway abstraction, but it only becomes active when you provide a World-compatible facilitator.

That means:

- the app no longer hardcodes a fake `world` path
- the app will use `world` when the proper facilitator env vars are configured
- otherwise it safely operates with `base-sepolia` only
