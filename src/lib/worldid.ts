import type { IDKitResult } from "@worldcoin/idkit";
import { signRequest } from "@worldcoin/idkit/signing";
import { serverEnv } from "@/lib/server-env";
import { hashSignal } from "@/lib/protocol/hash";
import { TTL_MS } from "@/lib/protocol/constants";

export type WorldActionType = "execute" | "withdraw" | "recover";

export function toWorldAction(actionType: WorldActionType) {
  switch (actionType) {
    case "execute":
      return "cerberus_vault_execute";
    case "withdraw":
      return "cerberus_vault_withdraw";
    case "recover":
      return "cerberus_vault_recover";
  }
}

export function createWorldSignal(input: {
  actionType: WorldActionType;
  wallet: string;
  vault: string;
  proposalHash?: string;
  recoveryAddress?: string;
  nonce: string;
}) {
  const signal = [
    input.actionType,
    input.wallet.toLowerCase(),
    input.vault.toLowerCase(),
    input.proposalHash?.toLowerCase() ?? input.recoveryAddress?.toLowerCase() ?? "none",
    input.nonce,
  ].join(":");

  return {
    signal,
    signalHash: hashSignal([signal]),
  };
}

export function createRpContext(action: string) {
  const signature = signRequest(action, serverEnv.WORLD_ID_RP_SIGNING_KEY, Math.floor(TTL_MS.authSession / 1000));

  return {
    rp_id: serverEnv.WORLD_ID_RP_ID,
    nonce: signature.nonce,
    created_at: signature.createdAt,
    expires_at: signature.expiresAt,
    signature: signature.sig,
  };
}

export async function verifyWorldIdResult(idkitResponse: IDKitResult) {
  const response = await fetch(`https://developer.world.org/api/v4/verify/${serverEnv.WORLD_ID_RP_ID}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${serverEnv.WORLDID_API_KEY}`,
    },
    body: JSON.stringify(idkitResponse),
  });

  const payload = (await response.json()) as {
    success?: boolean;
    action?: string;
    nullifier?: string;
    results?: Array<{
      success?: boolean;
      nullifier?: string;
      identifier?: string;
    }>;
    detail?: string;
    code?: string;
    environment?: string;
  };

  if (!response.ok || payload.success !== true) {
    throw new Error(payload.detail ?? payload.code ?? "World ID verification failed");
  }

  const successfulResult = payload.results?.find((result) => result.success) ?? payload.results?.[0];
  const nullifier = payload.nullifier ?? successfulResult?.nullifier;
  if (!nullifier) {
    throw new Error("World ID response missing nullifier");
  }

  return {
    payload,
    nullifier,
  };
}
