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
