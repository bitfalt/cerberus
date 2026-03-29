import { createFacilitatorConfig } from "@coinbase/x402";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { FacilitatorConfig } from "@x402/core/server";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { publicEnv } from "@/lib/public-env";
import { serverEnv } from "@/lib/server-env";
import type { PaymentIntent } from "@/lib/protocol/schemas";
import type { PaymentGateway, PaymentSettlementResult, PaymentVerificationResult } from "./gateway";
import { getCerberusAccount } from "@/lib/server/wallet";

type EvmGatewayConfig = {
  network: `eip155:${number}`;
  facilitator: FacilitatorConfig;
};

function createWorldFacilitatorConfig(): FacilitatorConfig | null {
  if (!serverEnv.WORLD_X402_FACILITATOR_URL) {
    return null;
  }

  return {
    url: serverEnv.WORLD_X402_FACILITATOR_URL,
    createAuthHeaders: serverEnv.WORLD_X402_BEARER_TOKEN
      ? async () => {
          const headers = { Authorization: `Bearer ${serverEnv.WORLD_X402_BEARER_TOKEN}` };
          return { verify: headers, settle: headers, supported: headers };
        }
      : undefined,
  };
}

const baseFacilitatorConfig =
  serverEnv.CDP_API_KEY_ID && serverEnv.CDP_API_KEY_SECRET
    ? createFacilitatorConfig(serverEnv.CDP_API_KEY_ID, serverEnv.CDP_API_KEY_SECRET)
    : null;

export const paymentGatewayConfigs = {
  "base-sepolia": baseFacilitatorConfig
    ? ({
        network: "eip155:84532",
        facilitator: baseFacilitatorConfig,
      } satisfies EvmGatewayConfig)
    : null,
  world: createWorldFacilitatorConfig()
    ? ({
        network: `eip155:${Number(serverEnv.WORLD_X402_CHAIN_ID)}` as `eip155:${number}`,
        facilitator: createWorldFacilitatorConfig()!,
      } satisfies EvmGatewayConfig)
    : null,
} as const;

export class EvmPaymentGateway implements PaymentGateway {
  private readonly client: HTTPFacilitatorClient;

  constructor(private readonly config: EvmGatewayConfig) {
    this.client = new HTTPFacilitatorClient(config.facilitator);
  }

  async createRequirements(intent: PaymentIntent): Promise<PaymentRequirements> {
    const extra: Record<string, string> = {
      payment_id: intent.paymentId,
      proposal_id: intent.proposalId,
      proposal_hash: intent.proposalHash,
      wallet: intent.wallet,
      vault: intent.vault,
      payment_network: intent.paymentNetwork,
      execution_chain: intent.executionChain,
    };

    // Base Sepolia USDC uses EIP-3009, so x402 client-side payload creation
    // needs the token EIP-712 domain parameters to sign correctly.
    if (
      this.config.network === "eip155:84532" &&
      intent.asset.toLowerCase() === publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC?.toLowerCase()
    ) {
      extra.name = "USDC";
      extra.version = "2";
    }

    return {
      scheme: "exact",
      network: this.config.network,
      maxTimeoutSeconds: Math.max(60, Math.floor((intent.expiresAt - intent.createdAt) / 1000)),
      asset: intent.asset,
      amount: intent.amount,
      payTo: getCerberusAccount().address,
      extra,
    };
  }

  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<PaymentVerificationResult> {
    return this.client.verify(payload, requirements);
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<PaymentSettlementResult> {
    const result = await this.client.settle(payload, requirements);
    return result as PaymentSettlementResult;
  }
}

export function getSupportedPaymentNetworks() {
  const requested = publicEnv.NEXT_PUBLIC_SUPPORTED_PAYMENT_NETWORKS.split(",")
    .map((value) => value.trim())
    .filter((value): value is "base-sepolia" | "world" => value === "base-sepolia" || value === "world");

  const configured = requested.filter((network) => paymentGatewayConfigs[network] !== null);
  return configured.length > 0 ? configured : ["base-sepolia"];
}
