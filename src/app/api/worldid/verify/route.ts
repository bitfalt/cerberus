import { NextResponse } from "next/server";
import type { IDKitResult } from "@worldcoin/idkit";
import { z } from "zod";
import { api } from "../../../../../convex/_generated/api";
import { getConvexServerClient } from "@/lib/convex/server-client";
import { TTL_MS } from "@/lib/protocol/constants";
import { createWorldSignal, toWorldAction, verifyWorldIdResult, type WorldActionType } from "@/lib/worldid";
import { enforceRateLimit } from "@/lib/server/rate-limit";

const getSchema = z.object({
  wallet: z.string(),
  action: z.string().optional(),
  signalHash: z.string().optional(),
  proposalHash: z.string().optional(),
});

const postSchema = z.object({
  actionType: z.enum(["execute", "withdraw", "recover"]),
  wallet: z.string(),
  vault: z.string(),
  proposalHash: z.string().optional(),
  recoveryAddress: z.string().optional(),
  nonce: z.string().min(1),
  idkitResponse: z.custom<IDKitResult>(),
});

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const args = getSchema.parse({
      wallet: url.searchParams.get("wallet"),
      action: url.searchParams.get("action") ?? undefined,
      signalHash: url.searchParams.get("signalHash") ?? undefined,
      proposalHash: url.searchParams.get("proposalHash") ?? undefined,
    });

    const client = getConvexServerClient();
    const verification = args.action
      ? await client.query(api.worldid.getFreshVerification, {
          walletAddress: args.wallet.toLowerCase(),
          action: args.action,
          signalHash: args.signalHash,
          proposalHash: args.proposalHash,
          now: Date.now(),
        })
      : await client.query(api.worldid.getWalletBinding, {
          walletAddress: args.wallet.toLowerCase(),
        });

    return NextResponse.json({
      verified: Boolean(verification),
      verification,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load World ID verification" },
      { status: 400 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = postSchema.parse(await request.json());
    await enforceRateLimit(`rate:worldid:verify:${body.wallet.toLowerCase()}`, 10, 60);

    const expectedAction = toWorldAction(body.actionType as WorldActionType);
    const { signalHash } = createWorldSignal({
      actionType: body.actionType,
      wallet: body.wallet,
      vault: body.vault,
      proposalHash: body.proposalHash,
      recoveryAddress: body.recoveryAddress,
      nonce: body.nonce,
    });

    if (!("action" in body.idkitResponse) || body.idkitResponse.action !== expectedAction) {
      throw new Error("World ID action mismatch");
    }

    const primaryResponse = body.idkitResponse.responses?.[0];
    if (!primaryResponse) {
      throw new Error("World ID response payload is empty");
    }

    if (primaryResponse.signal_hash && primaryResponse.signal_hash !== signalHash) {
      throw new Error("World ID signal mismatch");
    }

    const verification = await verifyWorldIdResult(body.idkitResponse);

    const client = getConvexServerClient();
    const recorded = await client.mutation(api.worldid.recordVerification, {
      walletAddress: body.wallet.toLowerCase(),
      vaultAddress: body.vault.toLowerCase(),
      action: expectedAction,
      signalHash,
      proposalHash: body.proposalHash,
      recoveryAddress: body.recoveryAddress?.toLowerCase(),
      nullifier: verification.nullifier,
      requestNonce: body.idkitResponse.nonce,
      verificationLevel: primaryResponse.identifier === "orb" ? "orb" : "device",
      protocolVersion: body.idkitResponse.protocol_version,
      verifiedAt: Date.now(),
      expiresAt: Date.now() + TTL_MS.verificationFreshness,
      metadata: {
        appId: process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID,
        environment: verification.payload.environment,
      },
    });

    return NextResponse.json({
      verified: true,
      verificationId: recorded.verificationId,
      nullifier: verification.nullifier,
      signalHash,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "World ID verification failed" },
      { status: 400 }
    );
  }
}
