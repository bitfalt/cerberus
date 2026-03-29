import { EvmPaymentGateway, getSupportedPaymentNetworks, paymentGatewayConfigs } from "./evm-gateway";
import type { PaymentGateway } from "./gateway";

const cache = new Map<"base-sepolia" | "world", PaymentGateway>();

export { getSupportedPaymentNetworks } from "./evm-gateway";

export function resolveRequestedPaymentNetwork(requested: "base-sepolia" | "world") {
  if (getSupportedPaymentNetworks().includes(requested)) {
    return requested;
  }

  if (requested === "world") {
    throw new Error("World x402 payments are not configured on this deployment. Add a World facilitator URL to enable them.");
  }

  return "base-sepolia";
}

export function getPaymentGateway(paymentNetwork: "base-sepolia" | "world"): PaymentGateway {
  const resolved = resolveRequestedPaymentNetwork(paymentNetwork);
  if (cache.has(resolved)) {
    return cache.get(resolved)!;
  }

  const config = paymentGatewayConfigs[resolved];
  if (!config) {
    throw new Error(`Payment gateway ${resolved} is not configured.`);
  }

  const gateway = new EvmPaymentGateway(config);
  cache.set(resolved, gateway);
  return gateway;
}
