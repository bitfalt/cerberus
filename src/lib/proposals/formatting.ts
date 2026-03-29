import type { BaseMainnetQuote } from "@/lib/quotes/base-mainnet-uniswap";

export function quoteProposalAnalysis(quote: BaseMainnetQuote) {
  return `Opportunity sourced from ${quote.network} via ${quote.source}; quotedAmountOut=${quote.quotedAmountOut}; feeTier=${quote.feeTier}; quoteHash=${quote.quoteHash}`;
}
