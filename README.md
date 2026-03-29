# Cerberus

Cerberus is a governed-vault demo for the World x Coinbase x XMTP AgentKit hackathon.

It is designed so that funds deposited into a Cerberus vault on Base Sepolia cannot move with a stolen wallet key alone.

The live architecture is:

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
- XMTP browser inbox for the owner and Node worker scaffolding for the agent
- Vault-first dashboard for creation, bootstrap, funding, proposal review, payment, execution, withdrawal, and recovery

## Important limitation

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
npm run worker:dev
```

## Deployments

- `Web`: Vercel
- `Worker`: Railway / Fly / Render
- `Contracts`: Base Sepolia
- `Redis`: Upstash or equivalent
- `Convex`: hosted deployment

## Suggested rollout order

1. Deploy contracts to Base Sepolia
2. Populate the public contract env vars
3. Set the Cerberus signer private key and RPC URL
4. Set World ID and Redis env vars
5. Start the XMTP worker with persistent storage
6. Deploy the web app

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
- Complete World ID verification
- Complete x402 payment
- Execute through the vault
