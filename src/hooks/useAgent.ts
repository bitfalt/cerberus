'use client';

import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { type TradingOpportunity, type Opportunity, type XMTPProposalContent, type NegotiationState } from '@/lib/agentkit/types';
import { useXMTP } from './useXMTP';

interface AgentLog {
  action: string;
  opportunityId?: string;
  metadata?: {
    riskScore?: number;
    expectedProfit?: string;
  };
  timestamp: number;
}

interface UseAgentReturn {
  opportunities: TradingOpportunity[];
  isScanning: boolean;
  scanError: string | null;
  scan: () => Promise<void>;
  agentStatus: {
    connected: boolean;
    lastScan?: number;
    walletAddress?: string;
    network?: string;
  };
  logs: AgentLog[];
  analyzeOpportunity: (id: string) => Promise<{ approved: boolean; reason: string }>;
  // XMTP Negotiation Layer
  pendingProposals: Opportunity[];
  negotiationStates: Map<string, NegotiationState>;
  sendProposal: (opportunity: Opportunity) => Promise<void>;
  executeApprovedTrade: (opportunityId: string) => Promise<{ success: boolean; txHash?: string }>;
}

// Convert old TradingOpportunity to new Opportunity format
function convertToOpportunity(opp: TradingOpportunity): Opportunity {
  const risk: 'low' | 'medium' | 'high' = opp.riskScore < 30 ? 'low' : opp.riskScore < 60 ? 'medium' : 'high';
  const recommendation: 'proceed' | 'caution' | 'avoid' = opp.riskScore < 30 ? 'proceed' : opp.riskScore < 60 ? 'caution' : 'avoid';
  
  return {
    id: opp.id,
    type: opp.type === 'arbitrage' ? 'arbitrage' : opp.type === 'yield' ? 'yield' : 'nft',
    protocol: opp.protocol,
    asset: `${opp.tokenIn} → ${opp.tokenOut}`,
    potentialReturn: parseFloat(opp.expectedProfit) || 0,
    risk,
    amount: parseFloat(opp.amountIn) || 0,
    aiAnalysis: opp.details,
    recommendation,
    contractAddress: '0x0000000000000000000000000000000000000000', // Placeholder
  };
}

export function useAgent(): UseAgentReturn {
  const { address } = useAccount();
  const { isConnected, send, startChat } = useXMTP();
  const [opportunities, setOpportunities] = useState<TradingOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);
  const [pendingProposals, setPendingProposals] = useState<Opportunity[]>([]);
  const [negotiationStates, setNegotiationStates] = useState<Map<string, NegotiationState>>(new Map());

  // Send a proposal via XMTP to the owner
  const sendProposal = useCallback(async (opportunity: Opportunity) => {
    if (!isConnected || !address) {
      console.error('XMTP not connected or wallet not connected');
      return;
    }

    try {
      // Start a conversation with self (agent messages owner)
      await startChat(address);

      const proposalContent: XMTPProposalContent = {
        type: 'PROPOSAL',
        opportunity,
        timestamp: Date.now(),
        expiresAt: Date.now() + 30 * 60 * 1000, // 30 minutes
      };

      // Send the proposal as a JSON message
      await send(JSON.stringify(proposalContent));

      // Update negotiation state
      setNegotiationStates(prev => {
        const newMap = new Map(prev);
        newMap.set(opportunity.id, {
          opportunityId: opportunity.id,
          status: 'pending',
          worldIDVerified: false,
          x402Paid: false,
          lastMessageTimestamp: Date.now(),
        });
        return newMap;
      });

      // Add to pending proposals
      setPendingProposals(prev => {
        if (prev.some(p => p.id === opportunity.id)) return prev;
        return [...prev, opportunity];
      });

      setLogs(prev => [...prev, {
        action: 'send_proposal_xmtp',
        opportunityId: opportunity.id,
        timestamp: Date.now(),
      }]);
    } catch (error) {
      console.error('Failed to send proposal via XMTP:', error);
    }
  }, [isConnected, address, send, startChat]);

  // Scan markets for opportunities via API route
  const scan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      // Call API route (server-side only, where AgentKit runs)
      const response = await fetch('/api/agent/scan', {
        method: 'POST',
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Scan failed: ${response.status}`);
      }

      const data = await response.json();
      const scannedOpportunities: TradingOpportunity[] = data.opportunities || [];
      setOpportunities(scannedOpportunities);
      
      // For each opportunity found, send XMTP proposal
      for (const opp of scannedOpportunities) {
        const opportunity = convertToOpportunity(opp);
        // Only send proposals for low/medium risk opportunities
        if (opportunity.recommendation !== 'avoid') {
          await sendProposal(opportunity);
        }
      }

      setLogs(prev => [...prev, {
        action: 'scan',
        timestamp: Date.now(),
      }]);
    } catch (error) {
      console.error('Agent scan error:', error);
      setScanError(error instanceof Error ? error.message : 'Scan failed');
    } finally {
      setIsScanning(false);
    }
  }, [sendProposal]);

  // Analyze a specific opportunity via API route
  const analyzeOpportunity = useCallback(async (id: string) => {
    try {
      const response = await fetch('/api/agent/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId: id }),
      });

      if (!response.ok) {
        return {
          approved: false,
          reason: 'Analysis failed',
        };
      }

      const result = await response.json();
      return {
        approved: result.approved ?? false,
        reason: result.reason || 'No reason provided',
      };
    } catch (error) {
      return {
        approved: false,
        reason: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }, []);

  // Execute an approved trade
  const executeApprovedTrade = useCallback(async (opportunityId: string) => {
    try {
      // Update state to executing
      setNegotiationStates(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(opportunityId);
        if (state) {
          newMap.set(opportunityId, { ...state, status: 'executing' });
        }
        return newMap;
      });

      // Call execution API
      const response = await fetch('/api/agent/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ opportunityId }),
      });

      if (!response.ok) {
        throw new Error('Execution failed');
      }

      const result = await response.json();

      // Send execution confirmation via XMTP
      if (isConnected && result.txHash) {
        await send(JSON.stringify({
          type: 'EXECUTION',
          opportunityId,
          txHash: result.txHash,
          status: 'confirmed',
          timestamp: Date.now(),
        }));
      }

      // Update state to completed
      setNegotiationStates(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(opportunityId);
        if (state) {
          newMap.set(opportunityId, { ...state, status: 'completed' });
        }
        return newMap;
      });

      // Remove from pending
      setPendingProposals(prev => prev.filter(p => p.id !== opportunityId));

      return { success: true, txHash: result.txHash };
    } catch (error) {
      console.error('Trade execution error:', error);
      
      // Update state to failed
      setNegotiationStates(prev => {
        const newMap = new Map(prev);
        const state = newMap.get(opportunityId);
        if (state) {
          newMap.set(opportunityId, { ...state, status: 'failed' });
        }
        return newMap;
      });

      return { success: false };
    }
  }, [isConnected, send]);

  // Agent status from API
  const agentStatus: UseAgentReturn['agentStatus'] = {
    connected: true,
    lastScan: Date.now() - 60000,
    walletAddress: address,
    network: 'base-mainnet',
  };

  return {
    opportunities,
    isScanning,
    scanError,
    scan,
    agentStatus,
    logs,
    analyzeOpportunity,
    pendingProposals,
    negotiationStates,
    sendProposal,
    executeApprovedTrade,
  };
}
