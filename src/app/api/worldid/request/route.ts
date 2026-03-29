import { NextResponse } from "next/server";
import { z } from "zod";
import { createRpContext, createWorldSignal, toWorldAction, type WorldActionType } from "@/lib/worldid";
import { enforceRateLimit } from "@/lib/server/rate-limit";

const requestSchema = z.object({
  actionType: z.enum(["execute", "withdraw", "recover"]),
  wallet: z.string(),
  vault: z.string(),
  proposalHash: z.string().optional(),
  recoveryAddress: z.string().optional(),
  nonce: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const body = requestSchema.parse(await request.json());
    await enforceRateLimit(`rate:worldid:request:${body.wallet.toLowerCase()}`, 15, 60);

    const worldAction = toWorldAction(body.actionType as WorldActionType);
    const rpContext = createRpContext(worldAction);
    const { signal, signalHash } = createWorldSignal({
      actionType: body.actionType,
      wallet: body.wallet,
      vault: body.vault,
      proposalHash: body.proposalHash,
      recoveryAddress: body.recoveryAddress,
      nonce: body.nonce,
    });

    return NextResponse.json({
      rp_context: rpContext,
      app_id: process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID,
      environment: "production",
      action: worldAction,
      signal,
      signalHash,
      requestNonce: rpContext.nonce,
      requestDebug: {
        rpId: rpContext.rp_id,
        createdAt: rpContext.created_at,
        expiresAt: rpContext.expires_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create World ID request" },
      { status: 400 }
    );
  }
}
