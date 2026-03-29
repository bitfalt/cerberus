import { NextResponse } from "next/server";
import { keccak256 } from "viem";
import { z } from "zod";
import { api } from "../../../../../../convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex/server-client";
import { cerberusDomain, executionAuthorizationTypes, toExecutionTypedData } from "@/lib/protocol/eip712";
import { hashPolicyContext } from "@/lib/protocol/hash";
import { executionAuthorizationSchema } from "@/lib/protocol/schemas";
import { getCerberusAccount } from "@/lib/server/wallet";
import { getPaymentIntentByProposal, getProposalRecord, reserveNonce, updateProposalRecord } from "@/lib/server/workflow";
import { TTL_MS } from "@/lib/protocol/constants";
import { durationMsToSeconds, nowUnixSeconds } from "@/lib/time";

const bodySchema = z.object({
  wallet: z.string(),
  vault: z.string(),
  nonce: z.string(),
  signalHash: z.string(),
});

export async function POST(request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const proposalRecord = await getProposalRecord(proposalId);
    if (!proposalRecord) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (proposalRecord.wallet.toLowerCase() !== body.wallet.toLowerCase()) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
    }
    if (proposalRecord.status !== "payment_settled") {
      return NextResponse.json({ error: "Proposal is not ready for authorization" }, { status: 409 });
    }

    const payment = await getPaymentIntentByProposal(proposalId);
    if (!payment || payment.status !== "settled") {
      return NextResponse.json({ error: "Settled x402 payment required" }, { status: 402 });
    }

    const convex = getConvexServerClient();
    const worldVerification = await convex.query(api.worldid.getFreshVerification, {
      walletAddress: body.wallet.toLowerCase(),
      action: "cerberus_vault_execute",
      signalHash: body.signalHash,
      proposalHash: proposalRecord.proposalHash,
      now: Date.now(),
    });

    if (!worldVerification) {
      return NextResponse.json({ error: "Fresh World ID verification is required" }, { status: 403 });
    }

    await reserveNonce(body.vault, body.nonce);

    const policyHash = hashPolicyContext({
      proposalId,
      proposalHash: proposalRecord.proposalHash as `0x${string}`,
      xmtpConversationId: proposalRecord.conversationId,
      xmtpMessageId: proposalRecord.approvalMessageId,
      worldVerificationId: worldVerification._id,
      signalHash: body.signalHash as `0x${string}`,
      x402PaymentId: payment.paymentId,
      policyVersion: proposalRecord.proposal.metadata.policyVersion,
      action: "execute",
    });

    const validAfter = nowUnixSeconds();
    const auth = executionAuthorizationSchema.parse({
      vault: proposalRecord.vault,
      proposalId,
      proposalHash: proposalRecord.proposalHash,
      adapter: proposalRecord.proposal.action.adapter,
      tokenIn: proposalRecord.proposal.action.tokenIn,
      tokenOut: proposalRecord.proposal.action.tokenOut,
      amountIn: proposalRecord.proposal.action.amountIn,
      minAmountOut: proposalRecord.proposal.action.minAmountOut,
      callDataHash: keccak256(proposalRecord.proposal.action.encodedCall as `0x${string}`),
      nonce: body.nonce,
      validAfter,
      validUntil: validAfter + durationMsToSeconds(TTL_MS.authSession),
      policyHash,
    });

    const account = getCerberusAccount();
    const typed = toExecutionTypedData(auth);
    const cerberusSigner = account.signTypedData as unknown as (args: {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<`0x${string}`>;

    const cerberusSignature = await cerberusSigner({
      domain: cerberusDomain(84532, auth.vault as `0x${string}`) as never,
      types: executionAuthorizationTypes as never,
      primaryType: typed.primaryType as never,
      message: typed.message as never,
    });

    await updateProposalRecord(proposalId, { status: "authorized" });

    return NextResponse.json({
      authorization: auth,
      cerberusSignature,
      payment,
      worldVerificationId: worldVerification._id,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to authorize proposal" }, { status: 400 });
  }
}
