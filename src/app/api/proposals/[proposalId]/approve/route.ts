import { NextResponse } from "next/server";
import { z } from "zod";
import { getProposalRecord, updateProposalRecord } from "@/lib/server/workflow";

const bodySchema = z.object({
  wallet: z.string(),
  messageId: z.string().min(1),
});

export async function POST(request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const proposal = await getProposalRecord(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }
    if (proposal.wallet.toLowerCase() !== body.wallet.toLowerCase()) {
      return NextResponse.json({ error: "Wallet mismatch" }, { status: 403 });
    }

    const updated = await updateProposalRecord(proposalId, {
      status: "approved",
      approvalMessageId: body.messageId,
    });

    return NextResponse.json({ success: true, proposal: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to approve proposal" }, { status: 400 });
  }
}
