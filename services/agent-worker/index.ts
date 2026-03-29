import { setTimeout as sleep } from "node:timers/promises";
import { Client, createBackend, type DecodedMessage, type Identifier, type Signer } from "@xmtp/node-sdk";
import { hexToBytes, toBytes } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { serverEnv } from "../../src/lib/env";
import { log } from "../../src/lib/server/logger";
import { listAllProposalRecords, updateProposalRecord } from "../../src/lib/server/workflow";
import { serializeXMTPMessage } from "../../src/lib/protocol/messages";

function createSigner(): Signer {
const account = privateKeyToAccount(serverEnv.XMTP_WALLET_KEY as `0x${string}`);
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

async function createClient() {
  const signer = createSigner();
  const backend = await createBackend({ env: serverEnv.XMTP_ENV ?? serverEnv.NEXT_PUBLIC_XMTP_ENV });
  const client = await Client.create(signer, {
    backend,
    appVersion: "cerberus/1.0.0",
    dbPath: serverEnv.XMTP_DB_PATH,
    dbEncryptionKey: hexToBytes(serverEnv.XMTP_DB_ENCRYPTION_KEY as `0x${string}`),
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
  log("info", "worker.started", {
    inboxId: client.inboxId,
  });

  void streamMessages(client);

  while (true) {
    try {
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
