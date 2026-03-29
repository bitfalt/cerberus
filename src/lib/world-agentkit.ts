import type { PaymentRequirements } from "@x402/core/types";
import {
  AGENTKIT,
  agentkitResourceServerExtension,
  createAgentBookVerifier,
  createAgentkitHooks,
  declareAgentkitExtension,
  type AgentKitStorage,
} from "@worldcoin/agentkit";
import { getRedis } from "@/lib/server/redis";
import { baseMainnetRpcUrl } from "@/lib/server-env";
import { BASE_MAINNET_UNISWAP } from "@/lib/quotes/base-mainnet-uniswap";
import { getCerberusAccount } from "@/lib/server/wallet";
import { log } from "@/lib/server/logger";

const AGENTKIT_USAGE_TTL_SECONDS = 24 * 60 * 60;
const AGENTKIT_NONCE_TTL_SECONDS = 10 * 60;
const AGENTKIT_RESOURCE_PATH = "/api/agent/premium-quote";

class RedisAgentKitStorage implements AgentKitStorage {
  private usageKey(endpoint: string, humanId: string) {
    return `agentkit:usage:${endpoint}:${humanId}`;
  }

  private nonceKey(nonce: string) {
    return `agentkit:nonce:${nonce}`;
  }

  async tryIncrementUsage(endpoint: string, humanId: string, limit: number): Promise<boolean> {
    const key = this.usageKey(endpoint, humanId);
    const result = await getRedis().eval(
      `
        local current = redis.call('GET', KEYS[1])
        if not current then
          redis.call('SET', KEYS[1], 1, 'EX', ARGV[2])
          return 1
        end
        if tonumber(current) < tonumber(ARGV[1]) then
          redis.call('INCR', KEYS[1])
          return 1
        end
        return 0
      `,
      1,
      key,
      String(limit),
      String(AGENTKIT_USAGE_TTL_SECONDS)
    );

    return result === 1;
  }

  async hasUsedNonce(nonce: string): Promise<boolean> {
    const exists = await getRedis().exists(this.nonceKey(nonce));
    return exists === 1;
  }

  async recordNonce(nonce: string): Promise<void> {
    await getRedis().set(this.nonceKey(nonce), "1", "EX", AGENTKIT_NONCE_TTL_SECONDS);
  }
}

const agentBook = createAgentBookVerifier();
const storage = new RedisAgentKitStorage();
const hooks = createAgentkitHooks({
  agentBook,
  storage,
  mode: { type: "free" },
  rpcUrl: baseMainnetRpcUrl,
  onEvent: (event) => {
    log("info", "world-agentkit.event", event as unknown as Record<string, unknown>);
  },
});

function buildPaymentRequirements(resourceUrl: string): PaymentRequirements[] {
  return [
    {
      scheme: "exact",
      network: "eip155:8453",
      asset: BASE_MAINNET_UNISWAP.usdc,
      amount: "10000",
      payTo: getCerberusAccount().address,
      maxTimeoutSeconds: 300,
      extra: {
        resource: resourceUrl,
        purpose: "premium_quote_access",
      },
    },
  ];
}

export async function verifyAgentkitAccess(request: Request) {
  const resourceUrl = new URL(request.url).toString();
  return await hooks.requestHook({
    adapter: {
      getHeader(name: string) {
        return request.headers.get(name) ?? undefined;
      },
      getUrl() {
        return resourceUrl;
      },
    },
    path: AGENTKIT_RESOURCE_PATH,
  });
}

export async function buildAgentkitChallenge(request: Request) {
  const resourceUrl = new URL(request.url).toString();
  const requirements = buildPaymentRequirements(resourceUrl);
  const paymentRequiredResponse = {
    x402Version: 2,
    error: "Payment Required",
    resource: {
      url: resourceUrl,
      description: "Protected premium Base Mainnet quote feed for human-backed agents",
      mimeType: "application/json",
    },
    accepts: requirements,
  };

  const declaration = declareAgentkitExtension({
    statement: "Verify your agent is backed by a real human to access Cerberus premium quote data",
    resourceUri: resourceUrl,
    network: "eip155:8453",
    expirationSeconds: 300,
    mode: { type: "free" },
  });

  const enriched = await agentkitResourceServerExtension.enrichPaymentRequiredResponse?.(declaration[AGENTKIT], {
    requirements,
    resourceInfo: paymentRequiredResponse.resource,
    paymentRequiredResponse,
    error: paymentRequiredResponse.error,
  });

  return {
    ...paymentRequiredResponse,
    extensions: {
      [AGENTKIT]: enriched,
    },
  };
}
