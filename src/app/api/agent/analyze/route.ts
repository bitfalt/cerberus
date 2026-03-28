// app/api/agent/analyze/route.ts - Agent opportunity analysis endpoint
import { NextRequest, NextResponse } from 'next/server';
import { analyzeOpportunity } from '@/lib/agentkit/agent';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { opportunityId } = body;

    if (!opportunityId || typeof opportunityId !== 'string') {
      return NextResponse.json(
        { error: 'opportunityId is required' },
        { status: 400 }
      );
    }

    // Analyze the opportunity using AgentKit
    const result = await analyzeOpportunity(opportunityId);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Agent analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        approved: false,
        reason: error instanceof Error ? error.message : 'Analysis failed',
        riskAssessment: 100,
      },
      { status: 500 }
    );
  }
}
