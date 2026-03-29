import type { Proposal } from "@/lib/protocol/schemas";
import { quoteProposalAnalysis } from "./formatting";
import type { BaseMainnetQuote } from "@/lib/quotes/base-mainnet-uniswap";
import { OPPORTUNITY_CHAIN, SLIPPAGE_BPS } from "@/lib/protocol/constants";

type Analysis = {
  analysisSummary: string;
  riskScore: number;
  confidence: number;
  sourceRefs: string[];
};

export function buildOpportunityProposal(input: {
  proposalId: string;
  wallet: string;
  vault: string;
  paymentNetwork: "base-sepolia" | "world";
  execution: {
    adapter: `0x${string}`;
    tokenIn: `0x${string}`;
    tokenOut: `0x${string}`;
    targetRouter: `0x${string}`;
    encodedCall: `0x${string}`;
  };
  quote: BaseMainnetQuote;
  analysis: Analysis;
  createdAt: number;
  expiresAt: number;
}): Proposal {
  return {
    version: 1,
    proposalId: input.proposalId,
    vault: input.vault,
    chainId: 84532,
    proposalType: "swap",
    opportunity: {
      chainId: OPPORTUNITY_CHAIN.id,
      network: OPPORTUNITY_CHAIN.name,
      source: input.quote.source,
      targetRouter: input.quote.targetRouter,
      tokenIn: input.quote.tokenIn,
      tokenOut: input.quote.tokenOut,
      amountIn: input.quote.amountIn,
      quotedAmountOut: input.quote.quotedAmountOut,
      minAmountOut: input.quote.minAmountOut,
      feeTier: input.quote.feeTier,
      quoteTimestamp: input.quote.quoteTimestamp,
      quoteHash: input.quote.quoteHash,
    },
    paymentRequirement: {
      required: true,
      paymentNetwork: input.paymentNetwork,
      paymentAsset: input.execution.tokenIn,
      paymentAmount: "10000",
    },
    action: {
      adapter: input.execution.adapter,
      tokenIn: input.execution.tokenIn,
      tokenOut: input.execution.tokenOut,
      amountIn: input.quote.amountIn,
      minAmountOut: input.quote.minAmountOut,
      targetRouter: input.execution.targetRouter,
      encodedCall: input.execution.encodedCall,
    },
    risk: {
      score: input.analysis.riskScore,
      confidence: input.analysis.confidence,
      analysisSummary: input.analysis.analysisSummary,
    },
    timing: {
      createdAt: input.createdAt,
      expiresAt: input.expiresAt,
    },
    metadata: {
      sourceRefs: [...new Set([...input.analysis.sourceRefs, input.quote.summary, quoteProposalAnalysis(input.quote)])].slice(0, 10),
      policyVersion: "v1",
      opportunityChain: OPPORTUNITY_CHAIN.name,
      executionChain: "base-sepolia",
      quoteSource: `${input.quote.source}:${input.quote.feeTier}`,
      slippageBps: SLIPPAGE_BPS,
    },
  };
}
