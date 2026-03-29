import { NextResponse } from "next/server";
import { listProposalRecordsByWallet } from "@/lib/server/workflow";

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load proposals" }, { status: 400 });
  }
}
