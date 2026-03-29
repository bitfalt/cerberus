import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { enqueueScanRequest, listProposalRecordsByWallet, listScanRequestsByWallet } from "@/lib/server/workflow";
import { getSupportedPaymentNetworks, resolveRequestedPaymentNetwork } from "@/lib/payments";

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
    const scans = await listScanRequestsByWallet(wallet.toLowerCase());
    return NextResponse.json({ proposals, scans });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load agent proposals" }, { status: 400 });
  }
}

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const paymentNetwork = resolveRequestedPaymentNetwork(body.paymentNetwork);
    const scanRequest = await enqueueScanRequest({
      scanRequestId: randomUUID(),
      wallet: body.wallet,
      vault: body.vault,
      paymentNetwork,
      adapter: body.adapter.toLowerCase(),
      tokenIn: body.tokenIn.toLowerCase(),
      tokenOut: body.tokenOut.toLowerCase(),
      router: body.router.toLowerCase(),
      status: "queued",
      requestedAt: Date.now(),
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      scanRequest,
      supportedPaymentNetworks: getSupportedPaymentNetworks(),
      queued: true,
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Agent scan failed" }, { status: 400 });
  }
}
