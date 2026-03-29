import { NextResponse } from "next/server";
import { fetchBaseMainnetUsdcWethQuote } from "@/lib/quotes/base-mainnet-uniswap";
import { buildAgentkitChallenge, verifyAgentkitAccess } from "@/lib/world-agentkit";

export async function GET(request: Request) {
  try {
    const access = await verifyAgentkitAccess(request);
    if (!access?.grantAccess) {
      const challenge = await buildAgentkitChallenge(request);
      return NextResponse.json(challenge, { status: 402 });
    }

    const quote = await fetchBaseMainnetUsdcWethQuote();
    return NextResponse.json({
      quote,
      protectedBy: "world-agentkit",
      mode: "free-trial",
    });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch premium quote" }, { status: 500 });
  }
}
