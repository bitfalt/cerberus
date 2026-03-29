import { NextResponse } from 'next/server';
import { z } from 'zod';
import { api } from '../../../../../../convex/_generated/api';
import { getConvexServerClient } from '@/lib/convex/server-client';
import { cerberusDomain, toWithdrawalTypedData, withdrawalAuthorizationTypes } from '@/lib/protocol/eip712';
import { hashPolicyContext } from '@/lib/protocol/hash';
import { withdrawalAuthorizationSchema } from '@/lib/protocol/schemas';
import { TTL_MS } from '@/lib/protocol/constants';
import { getCerberusAccount } from '@/lib/server/wallet';
import { reserveNonce } from '@/lib/server/workflow';
import { durationMsToSeconds, nowUnixSeconds } from '@/lib/time';

const bodySchema = z.object({
  wallet: z.string(),
  vault: z.string(),
  token: z.string(),
  to: z.string(),
  amount: z.string(),
  nonce: z.string(),
  signalHash: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const convex = getConvexServerClient();
    const worldVerification = await convex.query(api.worldid.getFreshVerification, {
      walletAddress: body.wallet.toLowerCase(),
      action: 'cerberus_vault_withdraw',
      signalHash: body.signalHash,
      proposalHash: undefined,
      now: Date.now(),
    });

    if (!worldVerification) {
      return NextResponse.json({ error: 'Fresh World ID verification is required' }, { status: 403 });
    }

    await reserveNonce(body.vault, body.nonce);
    const policyHash = hashPolicyContext({
      signalHash: body.signalHash as `0x${string}`,
      worldVerificationId: worldVerification._id,
      policyVersion: 'v1',
      action: 'withdraw',
    });

    const validAfter = nowUnixSeconds();
    const auth = withdrawalAuthorizationSchema.parse({
      vault: body.vault.toLowerCase(),
      token: body.token.toLowerCase(),
      to: body.to.toLowerCase(),
      amount: body.amount,
      nonce: body.nonce,
      validAfter,
      validUntil: validAfter + durationMsToSeconds(TTL_MS.authSession),
      policyHash,
    });

    const account = getCerberusAccount();
    const typed = toWithdrawalTypedData(auth);
    const cerberusSigner = account.signTypedData as unknown as (args: {
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<`0x${string}`>;

    const cerberusSignature = await cerberusSigner({
      domain: cerberusDomain(84532, auth.vault as `0x${string}`) as never,
      types: withdrawalAuthorizationTypes as never,
      primaryType: typed.primaryType as never,
      message: typed.message as never,
    });

    return NextResponse.json({ authorization: auth, cerberusSignature, worldVerificationId: worldVerification._id });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to authorize withdrawal' }, { status: 400 });
  }
}
