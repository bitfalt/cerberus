import { z } from "zod";

const serverSchema = z.object({
  WORLDID_API_KEY: z.string().min(1),
  WORLD_ID_RP_ID: z.string().min(1),
  WORLD_ID_RP_SIGNING_KEY: z.string().min(32),
  REDIS_URL: z.string().url().optional(),
  UPSTASH_REDIS_URL: z.string().url().optional(),
  BASE_SEPOLIA_RPC_URL: z.string().url().optional(),
  BASE_MAINNET_RPC_URL: z.string().url().optional(),
  BASE_RPC_URL: z.string().url().optional(),
  CERBERUS_SIGNER_PRIVATE_KEY: z.string().regex(/^0x[a-fA-F0-9]{64}$/).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  CDP_API_KEY_ID: z.string().min(1).optional(),
  CDP_API_KEY_SECRET: z.string().min(1).optional(),
  WORLD_X402_FACILITATOR_URL: z.string().url().optional(),
  WORLD_X402_BEARER_TOKEN: z.string().min(1).optional(),
  WORLD_X402_CHAIN_ID: z.string().default("480"),
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
  BASE_MAINNET_RPC_URL: z.string().url(),
});

export const serverEnv = serverSchema.parse(process.env);
export const hasRedis = Boolean(serverEnv.REDIS_URL || serverEnv.UPSTASH_REDIS_URL);
export const hasAgentWorkerEnv = workerSchema.safeParse(process.env).success;
export const baseSepoliaRpcUrl = serverEnv.BASE_SEPOLIA_RPC_URL ?? serverEnv.BASE_RPC_URL ?? "https://sepolia.base.org";
export const baseMainnetRpcUrl = serverEnv.BASE_MAINNET_RPC_URL;

export function getWorkerEnv() {
  return workerSchema.parse(process.env);
}

export function requireCerberusSignerPrivateKey() {
  if (!serverEnv.CERBERUS_SIGNER_PRIVATE_KEY) {
    throw new Error("CERBERUS_SIGNER_PRIVATE_KEY is required for on-chain authorization signing.");
  }

  return serverEnv.CERBERUS_SIGNER_PRIVATE_KEY;
}
