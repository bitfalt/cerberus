// app/api/worldid/verify/route.ts - World ID verification endpoint
import { NextRequest, NextResponse } from 'next/server';

interface VerifyRequest {
  proof: {
    merkle_root: string;
    nullifier_hash: string;
    proof: string;
    verification_level: 'orb' | 'device';
  };
  signal: string;
}

// Check verification status (GET)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const wallet = searchParams.get('wallet');

    if (!wallet) {
      return NextResponse.json(
        { error: 'Missing wallet address' },
        { status: 400 }
      );
    }

    // In production, check Convex or database
    // For now, check if we have localStorage data (server can't access localStorage,
    // but client will use this endpoint once Convex is set up)
    return NextResponse.json({
      verified: false,
      wallet,
      note: 'Use POST to verify',
    });
  } catch (error) {
    console.error('World ID check error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: VerifyRequest = await request.json();
    const { proof, signal } = body;

    if (!proof || !signal) {
      return NextResponse.json(
        { error: 'Missing proof or signal' },
        { status: 400 }
      );
    }

    const appId = process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID;
    const apiKey = process.env.WORLDID_API_KEY;

    if (!appId || !apiKey) {
      // Development fallback - accept any valid-looking proof
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: accepting mock World ID proof');
        return NextResponse.json({ verified: true, mock: true, nullifierHash: proof.nullifier_hash });
      }

      return NextResponse.json(
        { error: 'World ID not configured' },
        { status: 500 }
      );
    }

    // Verify with World ID API
    const response = await fetch('https://developer.worldcoin.org/api/v2/verify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        app_id: appId,
        action: 'cerberus_trade_approval',
        signal,
        proof: proof.proof,
        merkle_root: proof.merkle_root,
        nullifier_hash: proof.nullifier_hash,
        verification_level: proof.verification_level,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.message || 'World ID verification failed' },
        { status: response.status }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      verified: result.success ?? true,
      nullifierHash: proof.nullifier_hash,
    });
  } catch (error) {
    console.error('World ID verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
