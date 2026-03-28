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

// In-memory store for development (replace with Redis/DB in production)
const verificationStore = new Map<string, { nullifierHash: string; verifiedAt: number }>();

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

    const normalizedWallet = wallet.toLowerCase();
    const stored = verificationStore.get(normalizedWallet);
    
    return NextResponse.json({
      verified: !!stored,
      wallet: normalizedWallet,
      nullifierHash: stored?.nullifierHash || null,
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
      return NextResponse.json(
        { error: 'World ID not configured' },
        { status: 500 }
      );
    }

    // Check if nullifier already used (prevent Sybil attacks)
    for (const [wallet, data] of verificationStore.entries()) {
      if (data.nullifierHash === proof.nullifier_hash && wallet !== signal.toLowerCase()) {
        return NextResponse.json(
          { error: 'This World ID has already verified a different wallet' },
          { status: 409 }
        );
      }
    }

    // Verify with World ID API v2
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

    // Store verification in memory (replace with Convex/DB in production)
    if (result.success || result.success === undefined) {
      verificationStore.set(signal.toLowerCase(), {
        nullifierHash: proof.nullifier_hash,
        verifiedAt: Date.now(),
      });
    }

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
