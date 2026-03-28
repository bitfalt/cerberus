import { useState, useCallback } from 'react';
import { type TradingOpportunity } from '@/lib/agentkit/agent';

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
}

export function useAgent(): UseAgentReturn {
  const [opportunities, setOpportunities] = useState<TradingOpportunity[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [logs, setLogs] = useState<AgentLog[]>([]);

  // Scan markets for opportunities
  const scan = useCallback(async () => {
    setIsScanning(true);
    setScanError(null);

    try {
      // Try to call API route first (works before Convex is set up)
      const response = await fetch('/api/agent/scan', {
        method: 'POST',
      });

      if (response.ok) {
        const data = await response.json();
        setOpportunities(data.opportunities || []);
        setLogs(prev => [...prev, {
          action: 'scan',
          timestamp: Date.now(),
        }]);
        return;
      }

      // Fallback: call the agent directly
      const { scanWithAgentKit } = await import('@/lib/agentkit/agent');
      const results = await scanWithAgentKit();
      setOpportunities(results);
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
  }, []);

  // Analyze a specific opportunity
  const analyzeOpportunity = useCallback(async (id: string) => {
    try {
      const { analyzeOpportunity: analyze } = await import('@/lib/agentkit/agent');
      const result = await analyze(id);
      return {
        approved: result.approved,
        reason: result.reason,
      };
    } catch (error) {
      return {
        approved: false,
        reason: error instanceof Error ? error.message : 'Analysis failed',
      };
    }
  }, []);

  // Mock agent status
  const agentStatus: UseAgentReturn['agentStatus'] = {
    connected: true,
    lastScan: Date.now() - 60000,
    walletAddress: undefined,
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
  };
}
