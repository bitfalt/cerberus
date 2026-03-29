import "server-only";

import { AgentKit, CdpEvmWalletProvider, walletActionProvider } from "@coinbase/agentkit";
import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { DEMO_LIMITS } from "@/lib/protocol/constants";
import { hashProposal } from "@/lib/protocol/hash";
import { proposalSchema, type Proposal } from "@/lib/protocol/schemas";
import { hasAgentWorkerEnv, serverEnv } from "@/lib/env";

type ScanInput = {
  wallet: string;
  vault: string;
  paymentNetwork?: "base-sepolia" | "world";
  adapter: `0x${string}`;
  tokenIn: `0x${string}`;
  tokenOut: `0x${string}`;
  router: `0x${string}`;
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

  const walletProvider = await CdpEvmWalletProvider.configureWithWallet({
    apiKeyId: serverEnv.CDP_API_KEY_ID!,
    apiKeySecret: serverEnv.CDP_API_KEY_SECRET!,
    networkId: serverEnv.NETWORK_ID,
  });

  const walletAddress = await walletProvider.getAddress();
  const agentKit = await AgentKit.from({
    walletProvider,
    actionProviders: [walletActionProvider()],
  });
  const llm = new ChatOpenAI({
    model: "gpt-4o-mini",
    apiKey: serverEnv.OPENAI_API_KEY!,
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

function normalizeProposal(raw: unknown): Proposal {
  return proposalSchema.parse(raw);
}

export async function scanWithAgentKit(input: ScanInput): Promise<Array<{ proposal: Proposal; proposalHash: `0x${string}` }>> {
  const { agent } = await initializeAgent();

  const prompt = `You are Cerberus, a production-grade DeFi governance agent.

Generate up to 2 actionable swap proposals for Base Sepolia demo execution.

Rules:
- NEVER fabricate market data. If you cannot justify a proposal, return an empty array.
- Only emit proposals that satisfy risk <= ${DEMO_LIMITS.maxRiskScore} and confidence >= ${DEMO_LIMITS.minConfidence}.
- All proposals must target chainId 84532 and proposalType "swap".
- Use the exact wallet ${input.wallet} and vault ${input.vault}.
- Use adapter ${input.adapter}, tokenIn ${input.tokenIn}, tokenOut ${input.tokenOut}, targetRouter ${input.router}.
- encodedCall must be a valid 0x-prefixed calldata blob. If you cannot produce valid calldata, return an empty array.
- paymentRequirement.required must be true and paymentRequirement.paymentNetwork must be ${input.paymentNetwork ?? "base-sepolia"}.
- timing.expiresAt must be within 30 minutes of timing.createdAt.
- metadata.policyVersion must be "v1".
- Return JSON only.

Return shape:
[{...Proposal}]
`;

  const response = await agent.invoke({
    messages: [new HumanMessage(prompt)],
  });

  const lastMessage = response.messages.at(-1);
  const content = typeof lastMessage?.content === "string" ? lastMessage.content : JSON.stringify(lastMessage?.content ?? "[]");
  const match = content.match(/\[[\s\S]*\]/);
  if (!match) {
    return [];
  }

  const parsed = JSON.parse(match[0]) as unknown[];
  const proposals = parsed.map((entry) => normalizeProposal(entry));
  return proposals.map((proposal) => ({
    proposal,
    proposalHash: hashProposal(proposal),
  }));
}
