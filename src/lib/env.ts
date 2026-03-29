import { z } from "zod";

const addressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

const publicSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: z.string().min(1).default("2f0e6f71d79124511e745083f5dd3c0f"),
  NEXT_PUBLIC_WORLDCOIN_APP_ID: z.string().regex(/^app_[A-Za-z0-9_]+$/),
  NEXT_PUBLIC_XMTP_ENV: z.enum(["dev", "production"]).default("dev"),
  NEXT_PUBLIC_XMTP_AGENT_ADDRESS: addressSchema.optional(),
  NEXT_PUBLIC_EXECUTION_CHAIN: z.literal("base-sepolia").default("base-sepolia"),
  NEXT_PUBLIC_DEFAULT_PAYMENT_NETWORK: z.enum(["base-sepolia", "world"]).default("base-sepolia"),
  NEXT_PUBLIC_SUPPORTED_PAYMENT_NETWORKS: z.string().default("base-sepolia"),
  NEXT_PUBLIC_BASE_SEPOLIA_VAULT_FACTORY: addressSchema.optional(),
  NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER: addressSchema.optional(),
  NEXT_PUBLIC_BASE_SEPOLIA_USDC: addressSchema.optional(),
  NEXT_PUBLIC_CONVEX_URL: z.string().url(),
});

const serverSchema = publicSchema.extend({
  WORLDID_API_KEY: z.string().min(1),
  WORLD_ID_RP_ID: z.string().min(1),
  WORLD_ID_RP_SIGNING_KEY: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_URL: z.string().url().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
  BASE_RPC_URL: z.string().url().optional(),
  CERBERUS_SIGNER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  CDP_API_KEY_ID: z.string().min(1).optional(),
  CDP_API_KEY_SECRET: z.string().min(1).optional(),
  WORLD_X402_FACILITATOR_URL: z.string().url().optional(),
  WORLD_X402_BEARER_TOKEN: z.string().min(1).optional(),
  WORLD_X402_CHAIN_ID: z.string().default("480"),
  XMTP_ENV: z.enum(["dev", "production", "testnet", "mainnet", "local", "testnet-dev", "testnet-staging"]).optional(),
  XMTP_WALLET_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  XMTP_DB_ENCRYPTION_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  XMTP_DB_PATH: z.string().min(1).optional(),
  NETWORK_ID: z.string().default("base-sepolia"),
});

const workerSchema = z.object({
  XMTP_ENV: z.enum(["dev", "production", "testnet", "mainnet", "local", "testnet-dev", "testnet-staging"]).default("production"),
  XMTP_WALLET_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  XMTP_DB_ENCRYPTION_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  XMTP_DB_PATH: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  CDP_API_KEY_ID: z.string().min(1),
  CDP_API_KEY_SECRET: z.string().min(1),
  NETWORK_ID: z.string().default("base-sepolia"),
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_URL: z.string().url().optional(),
});

export const publicEnv = publicSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
  NEXT_PUBLIC_WORLDCOIN_APP_ID: process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID,
  NEXT_PUBLIC_XMTP_ENV: process.env.NEXT_PUBLIC_XMTP_ENV,
  NEXT_PUBLIC_XMTP_AGENT_ADDRESS: process.env.NEXT_PUBLIC_XMTP_AGENT_ADDRESS ?? process.env.NEXT_PUBLIC_AGENT_XMTP_ADDRESS,
  NEXT_PUBLIC_EXECUTION_CHAIN: process.env.NEXT_PUBLIC_EXECUTION_CHAIN,
  NEXT_PUBLIC_DEFAULT_PAYMENT_NETWORK: process.env.NEXT_PUBLIC_DEFAULT_PAYMENT_NETWORK,
  NEXT_PUBLIC_SUPPORTED_PAYMENT_NETWORKS: process.env.NEXT_PUBLIC_SUPPORTED_PAYMENT_NETWORKS,
  NEXT_PUBLIC_BASE_SEPOLIA_VAULT_FACTORY: process.env.NEXT_PUBLIC_BASE_SEPOLIA_VAULT_FACTORY,
  NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER: process.env.NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER,
  NEXT_PUBLIC_BASE_SEPOLIA_USDC: process.env.NEXT_PUBLIC_BASE_SEPOLIA_USDC,
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
});

export const serverEnv = serverSchema.parse(process.env);

export const hasRedis = Boolean(serverEnv.REDIS_URL || serverEnv.UPSTASH_REDIS_URL);
export const hasAgentWorkerEnv = workerSchema.safeParse(process.env).success;

export function getWorkerEnv() {
  return workerSchema.parse(process.env);
}

export const baseSepoliaRpcUrl = serverEnv.BASE_SEPOLIA_RPC_URL ?? serverEnv.BASE_RPC_URL ?? "https://sepolia.base.org";

export function requireCerberusSignerPrivateKey() {
  if (!serverEnv.CERBERUS_SIGNER_PRIVATE_KEY) {
    throw new Error("CERBERUS_SIGNER_PRIVATE_KEY is required for on-chain authorization signing.");
  }

  return serverEnv.CERBERUS_SIGNER_PRIVATE_KEY;
}
