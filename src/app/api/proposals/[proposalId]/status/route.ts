import { NextResponse } from "next/server";
import { getPaymentIntentByProposal, getProposalRecord } from "@/lib/server/workflow";

export async function GET(_request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const proposal = await getProposalRecord(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: "Proposal not found" }, { status: 404 });
    }

    const payment = await getPaymentIntentByProposal(proposalId);
    return NextResponse.json({ proposal, payment });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load proposal status" }, { status: 400 });
  }
}
