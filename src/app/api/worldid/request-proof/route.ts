// app/api/worldid/request-proof/route.ts - Generate signed rp_context for IDKit v4
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

interface RequestProofBody {
  signal: string; // Wallet address
}

// RpContext type matching IDKit v4 requirements
interface RpContext {
  rp_id: string;
  nonce: string;
  created_at: number;
  expires_at: number;
  signature: string;
}

// Sign the rp_context with the RP signing key
function signRpContext(context: { rp_id: string; nonce: string; created_at: number; expires_at: number }, signingKey: string): string {
  const message = JSON.stringify(context);
  const signature = crypto
    .createHmac('sha256', signingKey)
    .update(message)
    .digest('hex');
  return signature;
}

export async function POST(request: NextRequest) {
  try {
    const body: RequestProofBody = await request.json();
    const { signal } = body;

    if (!signal) {
      return NextResponse.json(
        { error: 'Missing signal (wallet address)' },
        { status: 400 }
      );
    }

    const rpId = process.env.WORLD_ID_RP_ID;
    const signingKey = process.env.WORLD_ID_RP_SIGNING_KEY;

    if (!rpId || !signingKey) {
      return NextResponse.json(
        { error: 'World ID RP not configured' },
        { status: 500 }
      );
    }

    // Generate unique nonce (32 bytes = 64 hex chars)
    const nonce = crypto.randomBytes(32).toString('hex');

    // Create timestamps (in seconds)
    const createdAt = Math.floor(Date.now() / 1000);
    const expiresAt = createdAt + 300; // 5 minutes expiry

    // Build rp_context base (without signature)
    const contextBase = {
      rp_id: rpId,
      nonce,
      created_at: createdAt,
      expires_at: expiresAt,
    };

    // Sign the context
    const signature = signRpContext(contextBase, signingKey);

    // Full rp_context with signature (matches IDKit v4 RpContext type)
    const rpContext: RpContext = {
      ...contextBase,
      signature,
    };

    return NextResponse.json({
      rp_context: rpContext,
      signal,
    });
  } catch (error) {
    console.error('World ID request-proof error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
