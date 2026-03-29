import { encodeAbiParameters, keccak256, parseAbiParameters, stringToHex } from "viem";
import type { Address, Hex } from "viem";
import type {
  ExecutionAuthorization,
  PaymentIntent,
  Proposal,
  RecoveryAuthorization,
  WithdrawalAuthorization,
} from "./schemas";

export function hashProposal(proposal: Proposal): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "uint8 version,string proposalId,address vault,uint256 chainId,string proposalType,string paymentNetwork,string paymentAsset,string paymentAmount,address adapter,address tokenIn,address tokenOut,uint256 amountIn,uint256 minAmountOut,address targetRouter,bytes encodedCall,uint256 riskScore,uint256 confidenceBps,string analysisSummary,uint256 createdAt,uint256 expiresAt,string policyVersion"
      ),
      [
        proposal.version,
        proposal.proposalId,
        proposal.vault as Address,
        BigInt(proposal.chainId),
        proposal.proposalType,
        proposal.paymentRequirement.paymentNetwork,
        proposal.paymentRequirement.paymentAsset,
        proposal.paymentRequirement.paymentAmount,
        proposal.action.adapter as Address,
        proposal.action.tokenIn as Address,
        proposal.action.tokenOut as Address,
        BigInt(proposal.action.amountIn),
        BigInt(proposal.action.minAmountOut),
        proposal.action.targetRouter as Address,
        proposal.action.encodedCall as Hex,
        BigInt(Math.round(proposal.risk.score)),
        BigInt(Math.round(proposal.risk.confidence * 10_000)),
        proposal.risk.analysisSummary,
        BigInt(proposal.timing.createdAt),
        BigInt(proposal.timing.expiresAt),
        proposal.metadata.policyVersion,
      ]
    )
  );
}

export function hashPolicyContext(input: {
  proposalId?: string;
  proposalHash?: Hex;
  xmtpConversationId?: string;
  xmtpMessageId?: string;
  worldVerificationId?: string;
  signalHash: Hex;
  x402PaymentId?: string;
  policyVersion: string;
  action: string;
}): Hex {
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "string proposalId,bytes32 proposalHash,string xmtpConversationId,string xmtpMessageId,string worldVerificationId,bytes32 signalHash,string x402PaymentId,string policyVersion,string action"
      ),
      [
        input.proposalId ?? "",
        input.proposalHash ?? ("0x" + "0".repeat(64) as Hex),
        input.xmtpConversationId ?? "",
        input.xmtpMessageId ?? "",
        input.worldVerificationId ?? "",
        input.signalHash as Hex,
        input.x402PaymentId ?? "",
        input.policyVersion,
        input.action,
      ]
    )
  );
}

export function hashSignal(parts: readonly string[]): Hex {
  return keccak256(stringToHex(parts.join(":")));
}

export function hashExecutionAuthorization(auth: ExecutionAuthorization): Hex {
  return keccak256(stringToHex(JSON.stringify(auth)));
}

export function hashWithdrawalAuthorization(auth: WithdrawalAuthorization): Hex {
  return keccak256(stringToHex(JSON.stringify(auth)));
}

export function hashRecoveryAuthorization(auth: RecoveryAuthorization): Hex {
  return keccak256(stringToHex(JSON.stringify(auth)));
}

export function paymentIntentKey(intent: Pick<PaymentIntent, "proposalId" | "paymentId">): string {
  return `${intent.proposalId}:${intent.paymentId}`;
}
