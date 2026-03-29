import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { scanWithAgentKit } from "@/lib/agentkit/agent";
import { createProposalRecord, listProposalRecordsByWallet } from "@/lib/server/workflow";
import { hashProposal } from '@/lib/protocol/hash';
import { proposalSchema } from "@/lib/protocol/schemas";

const bodySchema = z.object({
  wallet: z.string(),
  vault: z.string(),
  paymentNetwork: z.enum(["base-sepolia", "world"]).default("base-sepolia"),
  adapter: z.string(),
  tokenIn: z.string(),
  tokenOut: z.string(),
  router: z.string(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const wallet = url.searchParams.get("wallet");
    if (!wallet) {
      return NextResponse.json({ error: "wallet query parameter is required" }, { status: 400 });
    }
    const proposals = await listProposalRecordsByWallet(wallet.toLowerCase());
    return NextResponse.json({ proposals });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load agent proposals" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const scanned = await scanWithAgentKit({
      wallet: body.wallet,
      vault: body.vault,
      paymentNetwork: body.paymentNetwork,
      adapter: body.adapter as `0x${string}`,
      tokenIn: body.tokenIn as `0x${string}`,
      tokenOut: body.tokenOut as `0x${string}`,
      router: body.router as `0x${string}`,
    });

    const records = await Promise.all(
      scanned.map(async ({ proposal }) => {
        const normalized = proposalSchema.parse({
          ...proposal,
          proposalId: proposal.proposalId || randomUUID(),
        });
        const normalizedHash = hashProposal(normalized);

        return await createProposalRecord({
          proposal: normalized,
          proposalHash: normalizedHash,
          wallet: body.wallet.toLowerCase(),
          vault: body.vault.toLowerCase(),
          status: "proposed",
          createdAt: Date.now(),
          updatedAt: Date.now(),
        });
      })
    );

    return NextResponse.json({ proposals: records });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent scan failed" }, { status: 400 });
  }
}
