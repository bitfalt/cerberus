// components/AgentStatus.tsx - Show agent connection state
'use client';

import { useAgent } from '@/hooks/useAgent';

interface AgentStatusProps {
  className?: string;
}

export function AgentStatus({ className = '' }: AgentStatusProps) {
  const { agentStatus, isScanning, scan, logs } = useAgent();

  const getStatusColor = () => {
    if (!agentStatus.connected) return 'bg-red-500';
    if (isScanning) return 'bg-yellow-500 animate-pulse';
    return 'bg-green-500';
  };

  const lastScanTime = agentStatus.lastScan 
    ? new Date(agentStatus.lastScan).toLocaleTimeString()
    : 'Never';

  return (
    <div className={`p-4 rounded-xl bg-white border border-gray-200 shadow-sm ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-3 h-3 rounded-full ${getStatusColor()}`} />
          <div>
            <p className="font-semibold text-gray-900">Cerberus Agent</p>
            <p className="text-xs text-gray-500">
              {agentStatus.connected ? 'Connected to markets' : 'Disconnected'}
            </p>
          </div>
        </div>
        <button
          onClick={scan}
          disabled={isScanning || !agentStatus.connected}
          className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {isScanning ? 'Scanning...' : 'Scan Markets'}
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Last Scan:</span>
          <span className="text-gray-700">{lastScanTime}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Wallet:</span>
          <span className="text-gray-700 font-mono text-xs">
            {agentStatus.walletAddress 
              ? `${agentStatus.walletAddress.slice(0, 6)}...${agentStatus.walletAddress.slice(-4)}`
              : 'Not configured'}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Network:</span>
          <span className="text-gray-700">{agentStatus.network || 'base-mainnet'}</span>
        </div>
      </div>

      {/* Recent Logs */}
      {logs.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">Recent Activity</p>
          <div className="space-y-1">
            {logs.slice(0, 3).map((log, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span className="capitalize px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                  {log.action}
                </span>
                <span className="text-gray-400">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
