import type { Address } from "viem";
import type {
  ExecutionAuthorization,
  RecoveryAuthorization,
  WithdrawalAuthorization,
} from "./schemas";

const DOMAIN_NAME = "CerberusVault";
const DOMAIN_VERSION = "1";

export function cerberusDomain(chainId: number, verifyingContract: Address) {
  return {
    name: DOMAIN_NAME,
    version: DOMAIN_VERSION,
    chainId,
    verifyingContract,
  } as const;
}

export const executionAuthorizationTypes = {
  ExecutionAuthorization: [
    { name: "vault", type: "address" },
    { name: "proposalId", type: "string" },
    { name: "proposalHash", type: "bytes32" },
    { name: "adapter", type: "address" },
    { name: "tokenIn", type: "address" },
    { name: "tokenOut", type: "address" },
    { name: "amountIn", type: "uint256" },
    { name: "minAmountOut", type: "uint256" },
    { name: "callDataHash", type: "bytes32" },
    { name: "nonce", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validUntil", type: "uint256" },
    { name: "policyHash", type: "bytes32" },
  ],
} as const;

export const withdrawalAuthorizationTypes = {
  WithdrawalAuthorization: [
    { name: "vault", type: "address" },
    { name: "token", type: "address" },
    { name: "to", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validUntil", type: "uint256" },
    { name: "policyHash", type: "bytes32" },
  ],
} as const;

export const recoveryAuthorizationTypes = {
  RecoveryAuthorization: [
    { name: "vault", type: "address" },
    { name: "recoveryAddress", type: "address" },
    { name: "nonce", type: "uint256" },
    { name: "validAfter", type: "uint256" },
    { name: "validUntil", type: "uint256" },
    { name: "policyHash", type: "bytes32" },
  ],
} as const;

export function toExecutionTypedData(auth: ExecutionAuthorization) {
  return {
    types: executionAuthorizationTypes,
    primaryType: "ExecutionAuthorization" as const,
    message: {
      ...auth,
      amountIn: BigInt(auth.amountIn),
      minAmountOut: BigInt(auth.minAmountOut),
      nonce: BigInt(auth.nonce),
      validAfter: BigInt(auth.validAfter),
      validUntil: BigInt(auth.validUntil),
    },
  };
}

export function toWithdrawalTypedData(auth: WithdrawalAuthorization) {
  return {
    types: withdrawalAuthorizationTypes,
    primaryType: "WithdrawalAuthorization" as const,
    message: {
      ...auth,
      amount: BigInt(auth.amount),
      nonce: BigInt(auth.nonce),
      validAfter: BigInt(auth.validAfter),
      validUntil: BigInt(auth.validUntil),
    },
  };
}

export function toRecoveryTypedData(auth: RecoveryAuthorization) {
  return {
    types: recoveryAuthorizationTypes,
    primaryType: "RecoveryAuthorization" as const,
    message: {
      ...auth,
      nonce: BigInt(auth.nonce),
      validAfter: BigInt(auth.validAfter),
      validUntil: BigInt(auth.validUntil),
    },
  };
}
