// lib/agentkit/types.ts - Shared types for AgentKit (safe for client/server)

export interface TradingOpportunity {
  id: string;
  type: 'arbitrage' | 'mev' | 'liquidity' | 'yield';
  protocol: string;
  tokenIn: string;
  tokenOut: string;
  amountIn: string;
  expectedProfit: string;
  riskScore: number; // 0-100
  confidence: number; // 0-1
  deadline: number; // timestamp
  details: string;
}

export interface AgentStatus {
  connected: boolean;
  walletAddress?: string;
  network?: string;
  lastScan?: number;
}

export interface AnalysisResult {
  approved: boolean;
  reason: string;
  riskAssessment: number;
}

export interface TradeResult {
  success: boolean;
  txHash?: string;
  error?: string;
}
