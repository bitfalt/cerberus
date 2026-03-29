import type { PaymentPayload, PaymentRequirements } from "@x402/core/types";
import type { PaymentIntent } from "@/lib/protocol/schemas";

export type PaymentVerificationResult = {
  isValid: boolean;
  payer?: string;
  invalidReason?: string;
};

export type PaymentSettlementResult = {
  success: boolean;
  transaction?: string;
  payer?: string;
  errorReason?: string;
};

export interface PaymentGateway {
  createRequirements(intent: PaymentIntent): Promise<PaymentRequirements>;
  verify(payload: PaymentPayload, requirements: PaymentRequirements): Promise<PaymentVerificationResult>;
  settle(payload: PaymentPayload, requirements: PaymentRequirements): Promise<PaymentSettlementResult>;
}
