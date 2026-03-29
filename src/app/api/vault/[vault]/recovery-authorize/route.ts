import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '../../../../../../convex/_generated/api';
import { getConvexServerClient } from '@/lib/convex/server-client';
import { cerberusDomain, recoveryAuthorizationTypes, toRecoveryTypedData } from '@/lib/protocol/eip712';
import { hashPolicyContext } from '@/lib/protocol/hash';
import { recoveryAuthorizationSchema } from '@/lib/protocol/schemas';
import { TTL_MS } from '@/lib/protocol/constants';
import { getCerberusAccount } from '@/lib/server/wallet';
import { reserveNonce } from '@/lib/server/workflow';
import { durationMsToSeconds, nowUnixSeconds } from '@/lib/time';
import { toWorldAction } from '@/lib/worldid';

const bodySchema = z.object({
  wallet: z.string(),
  recoveryAddress: z.string(),
  nonce: z.string(),
  signalHash: z.string(),
});

export async function POST(request: Request, context: { params: Promise<{ vault: string }> }) {
  try {
    const { vault } = await context.params;
    const body = bodySchema.parse(await request.json());
    const convex = getConvexServerClient();
    const worldVerification = await convex.query(api.worldid.getFreshVerification, {
      walletAddress: body.wallet.toLowerCase(),
      action: toWorldAction('recover'),
      signalHash: body.signalHash,
      proposalHash: undefined,
      now: Date.now(),
    });

    if (!worldVerification) {
      return NextResponse.json({ error: 'Fresh World ID verification is required' }, { status: 403 });
    }

    await reserveNonce(vault, body.nonce);
    const policyHash = hashPolicyContext({
      signalHash: body.signalHash as `0x${string}`,
      worldVerificationId: worldVerification._id,
      policyVersion: 'v1',
      action: 'recover',
    });

    const validAfter = nowUnixSeconds();
    const auth = recoveryAuthorizationSchema.parse({
      vault: vault.toLowerCase(),
      recoveryAddress: body.recoveryAddress.toLowerCase(),
      nonce: body.nonce,
      validAfter,
      validUntil: validAfter + durationMsToSeconds(TTL_MS.authSession),
      policyHash,
    });

    const account = getCerberusAccount();
    const typed = toRecoveryTypedData(auth);
    const cerberusSigner = account.signTypedData as unknown as (args: {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<`0x${string}`>;

    const cerberusSignature = await cerberusSigner({
      domain: cerberusDomain(84532, auth.vault as `0x${string}`) as never,
      types: recoveryAuthorizationTypes as never,
      primaryType: typed.primaryType as never,
      message: typed.message as never,
    });

    return NextResponse.json({ authorization: auth, cerberusSignature, worldVerificationId: worldVerification._id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to authorize recovery' }, { status: 400 });
  }
}
