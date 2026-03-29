import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getProposalRecord, updateProposalRecord } from '@/lib/server/workflow';

const bodySchema = z.object({
  txHash: z.string(),
});

export async function POST(request: Request, context: { params: Promise<{ proposalId: string }> }) {
  try {
    const { proposalId } = await context.params;
    const body = bodySchema.parse(await request.json());
    const proposal = await getProposalRecord(proposalId);
    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    const updated = await updateProposalRecord(proposalId, {
      status: 'executed',
      executionTxHash: body.txHash,
    });

    return NextResponse.json({ proposal: updated });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to persist execution state' }, { status: 400 });
  }
}
