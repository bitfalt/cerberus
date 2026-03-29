import { setTimeout as sleep } from "node:timers/promises";
import { randomUUID } from "node:crypto";
import { Client, type DecodedMessage, type Identifier, type Signer } from "@xmtp/node-sdk";
import { createAgentBookVerifier } from "@worldcoin/agentkit";
import { hexToBytes, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { getWorkerEnv } from "../../src/lib/server-env";
import { log } from "../../src/lib/server/logger";
import { createProposalRecord, dequeueScanRequest, listAllProposalRecords, setWorkerHeartbeat, updateProposalRecord, updateScanRequest } from "../../src/lib/server/workflow";
import { serializeXMTPMessage } from "../../src/lib/protocol/messages";
import { generateProposalAnalysis } from "../../src/lib/agentkit/agent";
import { hashProposal } from "../../src/lib/protocol/hash";
import { proposalSchema } from "../../src/lib/protocol/schemas";
import { encodeExecutionCalldata } from "../../src/lib/quotes/base-mainnet-uniswap";
import type { BaseMainnetQuote } from "../../src/lib/quotes/base-mainnet-uniswap";
import { buildOpportunityProposal } from "../../src/lib/proposals/build-opportunity-proposal";
import { buildAgentkitSignMessage, buildSignedAgentkitHeader } from "../../src/lib/agentkit-signing";

const agentBook = createAgentBookVerifier();

function serializeThrowable(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (error && typeof error === "object") {
    const maybeMessage = Reflect.get(error, "message");
    if (typeof maybeMessage === "string") {
      return maybeMessage;
    }
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
}

function createSigner(): Signer {
  const workerEnv = getWorkerEnv();
  const account = privateKeyToAccount(workerEnv.XMTP_WALLET_KEY as `0x${string}`);
  const identifier: Identifier = {
    identifier: account.address.toLowerCase(),
    identifierKind: 0,
  };

  return {
    type: "EOA",
    getIdentifier: () => identifier,
    signMessage: async (message: string) => {
      const signature = await account.signMessage({ message });
      return toBytes(signature);
    },
  };
}

function getWorkerWalletAddress() {
  const workerEnv = getWorkerEnv();
  return privateKeyToAccount(workerEnv.XMTP_WALLET_KEY as `0x${string}`).address.toLowerCase();
}

function getAppBaseUrl() {
  const workerEnv = getWorkerEnv();
  const url = workerEnv.CERBERUS_APP_URL ?? process.env.NEXT_PUBLIC_CONVEX_SITE_URL;
  if (!url) {
    throw new Error("CERBERUS_APP_URL is required for the worker to access the AgentKit-protected quote endpoint.");
  }
  return url.replace(/\/$/, "");
}

async function lookupWorkerHumanId() {
  return await agentBook.lookupHuman(getWorkerWalletAddress(), "eip155:8453");
}

async function fetchProtectedQuote() {
  const signerAccount = privateKeyToAccount(getWorkerEnv().XMTP_WALLET_KEY as `0x${string}`);
  const resourceUrl = `${getAppBaseUrl()}/api/agent/premium-quote`;

  const humanId = await lookupWorkerHumanId();
  if (!humanId) {
    throw new Error(
      `Worker wallet ${signerAccount.address.toLowerCase()} is not registered in World AgentBook. Run: npx @worldcoin/agentkit-cli register ${signerAccount.address}`
    );
  }

  log("info", "worker.agentkit.preflight", {
    wallet: signerAccount.address.toLowerCase(),
    humanId,
    resourceUrl,
  });

  const initial = await fetch(resourceUrl, {
    headers: {
      accept: "application/json",
    },
  });

  if (initial.ok) {
    const payload = (await initial.json()) as { quote: BaseMainnetQuote };
    log("info", "worker.agentkit.quote_unprotected", { resourceUrl });
    return payload.quote;
  }

  if (initial.status !== 402) {
    const payload = await initial.json().catch(() => ({ error: `Unexpected quote response status ${initial.status}` }));
    throw new Error(payload.error ?? `Unexpected quote response status ${initial.status}`);
  }

  const challenge = (await initial.json()) as {
    extensions?: {
      agentkit?: {
        info: {
          domain: string;
          uri: string;
          version: string;
          nonce: string;
          issuedAt: string;
          expirationTime?: string;
          notBefore?: string;
          requestId?: string;
          resources?: string[];
          statement?: string;
        };
        supportedChains: Array<{ chainId: string; type: string }>;
      };
    };
  };

  const agentkitChallenge = challenge.extensions?.agentkit;
  if (!agentkitChallenge) {
    throw new Error("Premium quote endpoint did not return an AgentKit challenge.");
  }

  log("info", "worker.agentkit.challenge_received", {
    resourceUrl,
    supportedChains: agentkitChallenge.supportedChains,
    nonce: agentkitChallenge.info.nonce,
  });

  const signMessage = buildAgentkitSignMessage({
    challenge: agentkitChallenge,
    address: signerAccount.address,
  });
  const signature = await signerAccount.signMessage({ message: signMessage });
  const header = buildSignedAgentkitHeader({
    challenge: agentkitChallenge,
    address: signerAccount.address,
    signature,
  });

  const authenticated = await fetch(resourceUrl, {
    headers: {
      accept: "application/json",
      agentkit: header,
    },
  });

  if (!authenticated.ok) {
    const payload = await authenticated.json().catch(() => ({ error: `Authenticated quote request failed with status ${authenticated.status}` }));
    const hint =
      authenticated.status === 402
        ? "The worker wallet is registered, so a repeated 402 likely means the AgentKit signature payload does not match what the route expects."
        : "";
    throw new Error([payload.error ?? `Authenticated quote request failed with status ${authenticated.status}`, hint].filter(Boolean).join(" "));
  }

  const payload = (await authenticated.json()) as { quote: BaseMainnetQuote };
  log("info", "worker.agentkit.quote_authenticated", {
    resourceUrl,
    quoteHash: payload.quote.quoteHash,
  });
  return payload.quote;
}

async function createClient() {
  const workerEnv = getWorkerEnv();
  const signer = createSigner();
  const client = await Client.create(signer, {
    env: workerEnv.XMTP_ENV,
    appVersion: "cerberus/1.0.0",
    dbPath: workerEnv.XMTP_DB_PATH,
    dbEncryptionKey: hexToBytes(workerEnv.XMTP_DB_ENCRYPTION_KEY as `0x${string}`),
  } as unknown as Parameters<typeof Client.create>[1]);
  await client.conversations.syncAll();
  return client;
}

async function publishPendingProposals(client: Client<unknown>) {
  const proposals = await listAllProposalRecords();
  for (const record of proposals) {
    if (record.status !== "proposed" || record.xmtpMessageId) {
      continue;
    }

    const dm = await client.conversations.createDmWithIdentifier({
      identifier: record.wallet,
      identifierKind: 0,
    });

    const messageId = await dm.sendText(
      serializeXMTPMessage({
        type: "PROPOSAL",
        version: 1,
        proposalId: record.proposal.proposalId,
        proposalHash: record.proposalHash,
        vault: record.vault,
        wallet: record.wallet,
        timestamp: Date.now(),
        expiresAt: record.proposal.timing.expiresAt,
        proposal: record.proposal,
      })
    );

    await updateProposalRecord(record.proposal.proposalId, {
      conversationId: dm.id,
      xmtpMessageId: messageId,
    });

    log("info", "xmtp.proposal.sent", {
      proposalId: record.proposal.proposalId,
      proposalHash: record.proposalHash,
      wallet: record.wallet,
      conversationId: dm.id,
      messageId,
    });
  }
}

async function processQueuedScans() {
  const scanRequest = await dequeueScanRequest();
  if (!scanRequest) {
    return;
  }

  await updateScanRequest(scanRequest.scanRequestId, { status: "processing" });

  try {
    const quote = await fetchProtectedQuote();
    const analysis = await generateProposalAnalysis({
      wallet: scanRequest.wallet,
      vault: scanRequest.vault,
      quote,
    });

    const proposalIds: string[] = [];
    const proposalId = randomUUID();
    const createdAt = Date.now();
    const executionCalldata = encodeExecutionCalldata({
      marketQuoteHash: quote.quoteHash,
      amountIn: quote.amountIn,
      minAmountOut: quote.minAmountOut,
    });

    const normalized = proposalSchema.parse(
      buildOpportunityProposal({
        proposalId,
        wallet: scanRequest.wallet,
        vault: scanRequest.vault,
        paymentNetwork: scanRequest.paymentNetwork,
        execution: {
          adapter: scanRequest.adapter as `0x${string}`,
          tokenIn: scanRequest.tokenIn as `0x${string}`,
          tokenOut: scanRequest.tokenOut as `0x${string}`,
          targetRouter: scanRequest.router as `0x${string}`,
          encodedCall: executionCalldata,
        },
        quote,
        analysis,
        createdAt,
        expiresAt: createdAt + 30 * 60 * 1000,
      })
    );
    const proposalHash = hashProposal(normalized);
    await createProposalRecord({
      proposal: normalized,
      proposalHash,
      wallet: scanRequest.wallet,
      vault: scanRequest.vault,
      status: "proposed",
      createdAt,
      updatedAt: createdAt,
    });
    proposalIds.push(normalized.proposalId);

    await updateScanRequest(scanRequest.scanRequestId, {
      status: "completed",
      createdProposalIds: proposalIds,
    });

    log("info", "worker.scan.completed", {
      scanRequestId: scanRequest.scanRequestId,
      wallet: scanRequest.wallet,
      proposalCount: proposalIds.length,
    });
  } catch (error) {
    await updateScanRequest(scanRequest.scanRequestId, {
      status: "failed",
      error: serializeThrowable(error),
    });
    log("error", "worker.scan.failed", {
      scanRequestId: scanRequest.scanRequestId,
      wallet: scanRequest.wallet,
      error: serializeThrowable(error),
    });
  }
}

async function handleIncomingMessage(message: DecodedMessage) {
  if (typeof message.content !== "string") {
    return;
  }

  try {
    const payload = JSON.parse(message.content) as {
      type?: string;
      proposalId?: string;
      reason?: string;
    };

    if (!payload.proposalId) {
      return;
    }

    if (payload.type === "APPROVAL") {
      await updateProposalRecord(payload.proposalId, {
        status: "approved",
        approvalMessageId: message.id,
      });
      log("info", "xmtp.proposal.approved", { proposalId: payload.proposalId, messageId: message.id });
    }

    if (payload.type === "REJECTION") {
      await updateProposalRecord(payload.proposalId, {
        status: "rejected",
        rejectionReason: payload.reason ?? "Rejected in XMTP",
      });
      log("info", "xmtp.proposal.rejected", { proposalId: payload.proposalId, messageId: message.id });
    }
  } catch (error) {
    log("warn", "xmtp.message.parse_failed", {
      messageId: message.id,
      error: error instanceof Error ? error.message : "Unknown parse error",
    });
  }
}

async function streamMessages(client: Client<unknown>) {
  const stream = await client.conversations.streamAllMessages({
    consentStates: undefined,
  });

  for await (const message of stream) {
    await handleIncomingMessage(message);
  }
}

async function main() {
  const client = await createClient();
  const workerEnv = getWorkerEnv();
  log("info", "worker.started", {
    inboxId: client.inboxId,
  });

  await setWorkerHeartbeat({
    inboxId: client.inboxId,
    walletAddress: getWorkerWalletAddress(),
    env: workerEnv.XMTP_ENV,
    timestamp: Date.now(),
  });

  void streamMessages(client);

  while (true) {
    try {
      await setWorkerHeartbeat({
        inboxId: client.inboxId,
        walletAddress: getWorkerWalletAddress(),
        env: workerEnv.XMTP_ENV,
        timestamp: Date.now(),
      });
      await processQueuedScans();
      await publishPendingProposals(client);
    } catch (error) {
      log("error", "worker.publish_failed", {
        error: error instanceof Error ? error.message : "Unknown worker error",
      });
    }

    await sleep(15_000);
  }
}

main().catch((error) => {
  log("error", "worker.crashed", {
    error: error instanceof Error ? error.message : "Unknown worker crash",
  });
  process.exit(1);
});
