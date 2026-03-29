import type { PaymentGateway } from "./gateway";
import { BaseSepoliaPaymentGateway } from "./base-sepolia";

const baseGateway = new BaseSepoliaPaymentGateway();

export function getPaymentGateway(paymentNetwork: "base-sepolia" | "world"): PaymentGateway {
  if (paymentNetwork === "world") {
    throw new Error("World payment gateway is not configured yet. Use base-sepolia for the current production demo.");
  }

  return baseGateway;
}
