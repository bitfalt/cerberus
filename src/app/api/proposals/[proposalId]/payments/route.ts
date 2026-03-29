import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import type { PaymentPayload } from "@x402/core/types";
import { z } from "zod";
import { paymentIntentSchema } from "@/lib/protocol/schemas";
import { getPaymentGateway } from "@/lib/payments";
import { getPaymentIntent, getPaymentIntentByProposal, getProposalRecord, storePaymentIntent, updatePaymentIntent, updateProposalRecord } from "@/lib/server/workflow";
import { TTL_MS } from "@/lib/protocol/constants";

const createSchema = z.object({
  wallet: z.string(),
  vault: z.string(),
  proposalHash: z.string(),
  paymentNetwork: z.enum(["base-sepolia", "world"]).default("base-sepolia"),
  asset: z.string().min(1),
  amount: z.string().min(1),
});

const settleSchema = z.object({
  paymentId: z.string().min(1),
  payload: z.custom<PaymentPayload>(),
});

export async function GET(_request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const intent = await getPaymentIntentByProposal(proposalId);
    return NextResponse.json({ payment: intent });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load payment state" }, { status: 400 });
  }
}

export async function POST(request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const body = createSchema.parse(await request.json());
    const proposal = await getProposalRecord(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const paymentId = randomUUID();
    const intent = paymentIntentSchema.parse({
      paymentId,
      proposalId,
      proposalHash: body.proposalHash,
      wallet: body.wallet.toLowerCase(),
      vault: body.vault.toLowerCase(),
      executionChain: "base-sepolia",
      paymentNetwork: body.paymentNetwork,
      asset: body.asset,
      amount: body.amount,
      status: "pending",
      createdAt: Date.now(),
      expiresAt: Date.now() + TTL_MS.payment,
    });

    const gateway = getPaymentGateway(body.paymentNetwork);
    const requirements = await gateway.createRequirements(intent);
    await storePaymentIntent(intent);
    await updateProposalRecord(proposalId, { status: "payment_pending", paymentId });

    return NextResponse.json({
      payment: intent,
      accepts: [requirements],
      x402Version: 2,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to create payment intent" }, { status: 400 });
  }
}

export async function PUT(request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const body = settleSchema.parse(await request.json());
    const intent = await getPaymentIntent(body.paymentId);
    if (!intent || intent.proposalId !== proposalId) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    const gateway = getPaymentGateway(intent.paymentNetwork);
    const requirements = await gateway.createRequirements(intent);
    const verifyResult = await gateway.verify(body.payload, requirements);
    if (!verifyResult.isValid) {
      const failed = await updatePaymentIntent(body.paymentId, { status: "failed" });
      return NextResponse.json({ error: verifyResult.invalidReason ?? "Payment verification failed", payment: failed }, { status: 400 });
    }

    const settled = await gateway.settle(body.payload, requirements);
    if (!settled.success) {
      const failed = await updatePaymentIntent(body.paymentId, { status: "failed" });
      return NextResponse.json({ error: settled.errorReason ?? "Payment settlement failed", payment: failed }, { status: 500 });
    }

    const updated = await updatePaymentIntent(body.paymentId, {
      status: "settled",
      settlementTxHash: settled.transaction,
    });
    await updateProposalRecord(proposalId, { status: "payment_settled", paymentId: body.paymentId });

    return NextResponse.json({ payment: updated, payer: verifyResult.payer ?? settled.payer });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to settle payment" }, { status: 400 });
  }
}
