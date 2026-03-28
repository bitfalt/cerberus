// lib/agentkit/types.ts - Shared types for AgentKit (safe for client/server)

// Opportunity Type matching the task specification
export interface Opportunity {
  id: string;
  type: 'yield' | 'arbitrage' | 'nft' | 'risky';
  protocol: string;
  asset: string;
  potentialReturn: number;
  risk: 'low' | 'medium' | 'high';
  amount: number;
  aiAnalysis: string;
  recommendation: 'proceed' | 'caution' | 'avoid';
  contractAddress: string;
}

// Legacy TradingOpportunity (for backward compatibility)
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

// XMTP Message Types for Negotiation Layer
export type XMTPMessageType = 'PROPOSAL' | 'APPROVAL' | 'REJECTION' | 'EXECUTION' | 'CHAT';

export interface XMTPProposalContent {
  type: 'PROPOSAL';
  opportunity: Opportunity;
  timestamp: number;
  expiresAt: number;
}

export interface XMTPApprovalContent {
  type: 'APPROVAL';
  opportunityId: string;
  requireWorldID: boolean;
  timestamp: number;
}

export interface XMTPRejectionContent {
  type: 'REJECTION';
  opportunityId: string;
  reason: string;
  timestamp: number;
}

export interface XMTPExecutionContent {
  type: 'EXECUTION';
  opportunityId: string;
  txHash: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: number;
}

export interface XMTPChatContent {
  type: 'CHAT';
  text: string;
  timestamp: number;
}

export type XMTPNegotiationContent = 
  | XMTPProposalContent 
  | XMTPApprovalContent 
  | XMTPRejectionContent 
  | XMTPExecutionContent 
  | XMTPChatContent;

// Negotiation State
export interface NegotiationState {
  opportunityId: string;
  status: 'pending' | 'approved' | 'rejected' | 'executing' | 'completed' | 'failed';
  worldIDVerified: boolean;
  x402Paid: boolean;
  lastMessageTimestamp: number;
}
