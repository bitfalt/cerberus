import { useState, useCallback } from 'react';
import { type TradingOpportunity } from '@/lib/agentkit/types';

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
      setOpportunities(data.opportunities || []);
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

  // Agent status from API
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
