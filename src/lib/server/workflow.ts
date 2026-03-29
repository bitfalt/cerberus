import "server-only";

import type { Proposal, PaymentIntent } from "@/lib/protocol/schemas";
import { TTL_MS } from "@/lib/protocol/constants";
import { deleteKeys, getJson, setIfNotExists, setJson } from "./redis";
import { getRedis } from "./redis";

export type ProposalStatus =
  | "proposed"
  | "approved"
  | "rejected"
  | "worldid_verified"
  | "payment_pending"
  | "payment_settled"
  | "authorized"
  | "executed"
  | "failed"
  | "withdrawal_pending"
  | "recovery_pending";

export type ProposalRecord = {
  proposal: Proposal;
  proposalHash: string;
  wallet: string;
  vault: string;
  conversationId?: string;
  xmtpMessageId?: string;
  approvalMessageId?: string;
  status: ProposalStatus;
  createdAt: number;
  updatedAt: number;
  rejectionReason?: string;
  executionTxHash?: string;
  paymentId?: string;
};

function proposalKey(proposalId: string) {
  return `proposal:${proposalId}`;
}

function proposalHashKey(proposalHash: string) {
  return `proposalHash:${proposalHash.toLowerCase()}`;
}

function walletProposalIndex(wallet: string) {
  return `proposalIndex:wallet:${wallet.toLowerCase()}`;
}

const GLOBAL_PROPOSAL_INDEX = "proposalIndex:all";

function paymentKey(paymentId: string) {
  return `payment:${paymentId}`;
}

function paymentByProposalKey(proposalId: string) {
  return `paymentByProposal:${proposalId}`;
}

export async function createProposalRecord(record: ProposalRecord) {
  const ttlSeconds = Math.floor(TTL_MS.proposal / 1000);
  await setJson(proposalKey(record.proposal.proposalId), record, ttlSeconds);
  await setJson(proposalHashKey(record.proposalHash), record.proposal.proposalId, ttlSeconds);
  await getRedis().sadd(walletProposalIndex(record.wallet), record.proposal.proposalId);
  await getRedis().expire(walletProposalIndex(record.wallet), ttlSeconds);
  await getRedis().sadd(GLOBAL_PROPOSAL_INDEX, record.proposal.proposalId);
  await getRedis().expire(GLOBAL_PROPOSAL_INDEX, ttlSeconds);
  return record;
}

export async function listAllProposalRecords() {
  const proposalIds = await getRedis().smembers(GLOBAL_PROPOSAL_INDEX);
  const proposals = await Promise.all(proposalIds.map((proposalId) => getProposalRecord(proposalId)));
  return proposals.filter((proposal): proposal is ProposalRecord => proposal !== null).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function listProposalRecordsByWallet(wallet: string) {
  const proposalIds = await getRedis().smembers(walletProposalIndex(wallet));
  const proposals = await Promise.all(proposalIds.map((proposalId) => getProposalRecord(proposalId)));
  return proposals.filter((proposal): proposal is ProposalRecord => proposal !== null).sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getProposalRecord(proposalId: string) {
  return await getJson<ProposalRecord>(proposalKey(proposalId));
}

export async function getProposalRecordByHash(proposalHash: string) {
  const proposalId = await getJson<string>(proposalHashKey(proposalHash));
  if (!proposalId) {
    return null;
  }
  return getProposalRecord(proposalId);
}

export async function updateProposalRecord(
  proposalId: string,
  updates: Partial<Omit<ProposalRecord, "proposal" | "proposalHash" | "wallet" | "vault" | "createdAt">>
) {
  const existing = await getProposalRecord(proposalId);
  if (!existing) {
    throw new Error(`Proposal ${proposalId} not found`);
  }

  const updated: ProposalRecord = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  await createProposalRecord(updated);
  return updated;
}

export async function storePaymentIntent(intent: PaymentIntent) {
  const ttlSeconds = Math.floor(Math.max(1, (intent.expiresAt - Date.now()) / 1000));
  await setJson(paymentKey(intent.paymentId), intent, ttlSeconds);
  await setJson(paymentByProposalKey(intent.proposalId), intent.paymentId, ttlSeconds);
  return intent;
}

export async function getPaymentIntent(paymentId: string) {
  return await getJson<PaymentIntent>(paymentKey(paymentId));
}

export async function getPaymentIntentByProposal(proposalId: string) {
  const paymentId = await getJson<string>(paymentByProposalKey(proposalId));
  if (!paymentId) {
    return null;
  }
  return getPaymentIntent(paymentId);
}

export async function updatePaymentIntent(paymentId: string, updates: Partial<PaymentIntent>) {
  const existing = await getPaymentIntent(paymentId);
  if (!existing) {
    throw new Error(`Payment ${paymentId} not found`);
  }

  const next: PaymentIntent = {
    ...existing,
    ...updates,
  };

  await storePaymentIntent(next);
  return next;
}

export async function reserveNonce(vault: string, nonce: string) {
  const ok = await setIfNotExists(`nonce:reservation:${vault.toLowerCase()}:${nonce}`, { reservedAt: Date.now() }, Math.floor(TTL_MS.authSession / 1000));
  if (!ok) {
    throw new Error("Nonce already reserved");
  }
}

export async function clearProposalArtifacts(proposalId: string, proposalHash: string) {
  const proposal = await getProposalRecord(proposalId);
  if (proposal) {
    await getRedis().srem(walletProposalIndex(proposal.wallet), proposalId);
    await getRedis().srem(GLOBAL_PROPOSAL_INDEX, proposalId);
  }
  await deleteKeys([proposalKey(proposalId), proposalHashKey(proposalHash), paymentByProposalKey(proposalId)]);
}
