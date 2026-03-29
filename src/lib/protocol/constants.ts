export const CERBERUS_APP_NAME = "Cerberus";
export const CERBERUS_APP_VERSION = "1.0.0";

export const EXECUTION_CHAIN = {
  id: 84532,
  name: "base-sepolia",
  eip155: "eip155:84532",
} as const;

export const PAYMENT_NETWORKS = ["base-sepolia", "world"] as const;
export const WORLD_ID_ACTIONS = [
  "cerberus_vault_execute",
  "cerberus_vault_withdraw",
  "cerberus_vault_recover",
] as const;

export const XMTP_MESSAGE_TYPES = [
  "PROPOSAL",
  "APPROVAL",
  "REJECTION",
  "EXECUTION_SUBMITTED",
  "EXECUTION_CONFIRMED",
  "EXECUTION_FAILED",
  "RECOVERY_REQUESTED",
  "RECOVERY_EXECUTED",
] as const;

export const GOVERNED_ACTIONS = ["execute", "withdraw", "recover"] as const;

export const TTL_MS = {
  proposal: 24 * 60 * 60 * 1000,
  payment: 15 * 60 * 1000,
  authSession: 10 * 60 * 1000,
  verificationFreshness: 5 * 60 * 1000,
  recoveryDelay: 30 * 60 * 1000,
} as const;

export const DEMO_LIMITS = {
  maxRiskScore: 70,
  minConfidence: 0.65,
  maxNotionalUsd: 25_000,
} as const;
