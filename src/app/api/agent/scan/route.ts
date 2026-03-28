// app/api/agent/scan/route.ts - Agent market scanning endpoint
import { NextRequest, NextResponse } from 'next/server';
import { scanWithAgentKit } from '@/lib/agentkit/agent';

export async function POST(_request: NextRequest) {
  try {
    // Scan for opportunities
    const opportunities = await scanWithAgentKit();

    return NextResponse.json({
      success: true,
      opportunities,
      scannedAt: Date.now(),
    });
  } catch (error) {
    console.error('Agent scan error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Scan failed',
        opportunities: [],
      },
      { status: 500 }
    );
  }
}
