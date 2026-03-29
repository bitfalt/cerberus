import "server-only";

import { privateKeyToAccount } from "viem/accounts";
import { createWalletClient, createPublicClient, http } from "viem";
import { baseSepolia } from "viem/chains";
import { baseSepoliaRpcUrl, requireCerberusSignerPrivateKey } from "@/lib/env";

export function getCerberusAccount() {
  return privateKeyToAccount(requireCerberusSignerPrivateKey() as `0x${string}`);
}

export function getCerberusWalletClient() {
  return createWalletClient({
    account: getCerberusAccount(),
    chain: baseSepolia,
    transport: http(baseSepoliaRpcUrl),
  });
}

export function getBaseSepoliaPublicClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http(baseSepoliaRpcUrl),
  });
}
