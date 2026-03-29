import { AgentKit, CdpEvmWalletProvider, walletActionProvider } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DEMO_LIMITS } from "@/lib/protocol/constants";
import { getWorkerEnv, hasAgentWorkerEnv } from "@/lib/server-env";
import type { BaseMainnetQuote } from "@/lib/quotes/base-mainnet-uniswap";

type ProposalAnalysis = {
  analysisSummary: string;
  riskScore: number;
  confidence: number;
  sourceRefs: string[];
};

let cachedAgent:
  | {
      agent: ReturnType<typeof createReactAgent>;
      walletAddress: string;
    }
  | null = null;

async function initializeAgent() {
  if (cachedAgent) {
    return cachedAgent;
  }

  if (!hasAgentWorkerEnv) {
    throw new Error("Agent worker environment is incomplete. Set OpenAI, CDP, and XMTP worker credentials.");
  }

  const workerEnv = getWorkerEnv();
  const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
    apiKeyId: workerEnv.CDP_API_KEY_ID,
    apiKeySecret: workerEnv.CDP_API_KEY_SECRET,
    networkId: workerEnv.NETWORK_ID,
  });

  const walletAddress = await walletProvider.getAddress();
  const agentKit = await AgentKit.from({
    walletProvider,
    actionProviders: [walletActionProvider()],
  });
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: workerEnv.OPENAI_API_KEY,
    temperature: 0.1,
  });
  const tools = await getLangChainTools(agentKit);

  cachedAgent = {
    walletAddress,
    agent: createReactAgent({
      llm,
      tools: tools as never,
    }),
  };

  return cachedAgent;
}

function normalizeAnalysis(raw: unknown): ProposalAnalysis {
  if (!raw || typeof raw !== "object") {
    throw new Error("Agent analysis response was not an object");
  }

  const candidate = raw as Record<string, unknown>;
  const analysisSummary = typeof candidate.analysisSummary === "string" ? candidate.analysisSummary : null;
  const riskScore = typeof candidate.riskScore === "number" ? candidate.riskScore : null;
  const confidence = typeof candidate.confidence === "number" ? candidate.confidence : null;
  const sourceRefs = Array.isArray(candidate.sourceRefs)
    ? candidate.sourceRefs.filter((entry): entry is string => typeof entry === "string")
    : [];

  if (!analysisSummary || riskScore === null || confidence === null) {
    throw new Error("Agent analysis response was missing required fields");
  }

  return {
    analysisSummary,
    riskScore: Math.max(0, Math.min(100, riskScore)),
    confidence: Math.max(0, Math.min(1, confidence)),
    sourceRefs: sourceRefs.slice(0, 10),
  };
}

export async function generateProposalAnalysis(input: {
  wallet: string;
  vault: string;
  quote: BaseMainnetQuote;
}): Promise<ProposalAnalysis> {
  const { agent } = await initializeAgent();

  const prompt = `You are Cerberus, a production-grade DeFi governance agent.

Analyze the following live opportunity sourced from Base Mainnet. Execution is governed separately on Base Sepolia.

Hard constraints:
- NEVER invent prices, chains, routes, or calldata.
- Use only the provided quote data.
- riskScore must be between 0 and 100.
- confidence must be between 0 and 1.
- Keep the analysis concise and operational.
- If the opportunity does not clear the thresholds, still return an honest explanation and lower confidence.

Thresholds:
- maxRiskScore: ${DEMO_LIMITS.maxRiskScore}
- minConfidence: ${DEMO_LIMITS.minConfidence}

Quote context:
- wallet: ${input.wallet}
- vault: ${input.vault}
- source: ${input.quote.source}
- opportunityChain: ${input.quote.network} (${input.quote.chainId})
- tokenIn: ${input.quote.tokenIn}
- tokenOut: ${input.quote.tokenOut}
- amountIn: ${input.quote.amountIn}
- quotedAmountOut: ${input.quote.quotedAmountOut}
- minAmountOut: ${input.quote.minAmountOut}
- feeTier: ${input.quote.feeTier}
- quoteTimestamp: ${input.quote.quoteTimestamp}
- quoteHash: ${input.quote.quoteHash}
- summary: ${input.quote.summary}

Return JSON only with this exact shape:
{
  "analysisSummary": string,
  "riskScore": number,
  "confidence": number,
  "sourceRefs": string[]
}`;

  const response = await agent.invoke({
    messages: [new HumanMessage(prompt)],
  });

  const lastMessage = response.messages.at(-1);
  const content = typeof lastMessage?.content === "string" ? lastMessage.content : JSON.stringify(lastMessage?.content ?? "{}");
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error("Agent analysis did not return JSON");
  }

  return normalizeAnalysis(JSON.parse(match[0]) as unknown);
}
