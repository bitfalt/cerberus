import { createFacilitatorConfig } from "@coinbase/x402";
import { HTTPFacilitatorClient } from "@x402/core/server";
import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import { serverEnv } from "@/lib/env";
import type { PaymentIntent } from "@/lib/protocol/schemas";
import type { PaymentGateway, PaymentSettlementResult, PaymentVerificationResult } from "./gateway";
import { getCerberusAccount } from "@/lib/server/wallet";

const facilitator =
  serverEnv.CDP_API_KEY_ID && serverEnv.CDP_API_KEY_SECRET
    ? new HTTPFacilitatorClient(createFacilitatorConfig(serverEnv.CDP_API_KEY_ID, serverEnv.CDP_API_KEY_SECRET))
    : null;

export class BaseSepoliaPaymentGateway implements PaymentGateway {
  async createRequirements(intent: PaymentIntent): Promise<PaymentRequirements> {
    return {
      scheme: "exact",
      network: "eip155:84532",
      maxTimeoutSeconds: Math.max(60, Math.floor((intent.expiresAt - intent.createdAt) / 1000)),
      asset: intent.asset,
      amount: intent.amount,
      payTo: getCerberusAccount().address,
      extra: {
        payment_id: intent.paymentId,
        proposal_id: intent.proposalId,
        proposal_hash: intent.proposalHash,
        wallet: intent.wallet,
        vault: intent.vault,
        payment_network: intent.paymentNetwork,
        execution_chain: intent.executionChain,
      },
    };
  }

  async verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<PaymentVerificationResult> {
    if (!facilitator) {
      throw new Error("CDP facilitator credentials are required for x402 verification");
    }
    return facilitator.verify(payload, requirements);
  }

  async settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<PaymentSettlementResult> {
    if (!facilitator) {
      throw new Error("CDP facilitator credentials are required for x402 settlement");
    }
    const result = await facilitator.settle(payload, requirements);
    return result as PaymentSettlementResult;
  }
}
