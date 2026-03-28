// components/OpportunityCard.tsx - Display agent-found opportunities
'use client';

import { useState } from 'react';
import { type TradingOpportunity } from '@/lib/agentkit/types';
import { useX402 } from '@/hooks/useX402';

interface OpportunityCardProps {
  opportunity: TradingOpportunity;
  onExecute?: (id: string) => void;
  onReject?: (id: string) => void;
  className?: string;
}

export function OpportunityCard({ 
  opportunity, 
  onExecute, 
  onReject,
  className = '' 
}: OpportunityCardProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<{ approved: boolean; reason: string } | null>(null);
  const { create, activePayment, isCreating, formatAmount } = useX402();

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    // Mock analysis - in production, this would call AgentKit
    setTimeout(() => {
      setAnalysis({
        approved: opportunity.riskScore < 40,
        reason: opportunity.riskScore < 40 
          ? 'Low risk opportunity with verified contracts'
          : 'Risk level exceeds safe threshold',
      });
      setIsAnalyzing(false);
    }, 1500);
  };

  const handlePayAndExecute = async () => {
    await create({
      opportunityId: opportunity.id,
      amount: '1000000000000000', // 0.001 ETH in wei
      tokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // ETH
      description: `Execute ${opportunity.type} on ${opportunity.protocol}`,
    });
  };

  const getRiskColor = (score: number) => {
    if (score < 25) return 'text-green-600 bg-green-50';
    if (score < 50) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'arbitrage': return '⚡';
      case 'mev': return '🎯';
      case 'liquidity': return '💧';
      case 'yield': return '🌾';
      default: return '📊';
    }
  };

  const timeLeft = Math.max(0, Math.floor((opportunity.deadline - Date.now()) / 1000 / 60));

  return (
    <div className={`p-4 rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md transition-shadow ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{getTypeIcon(opportunity.type)}</span>
          <div>
            <p className="font-semibold text-gray-900 capitalize">{opportunity.type} Opportunity</p>
            <p className="text-sm text-gray-500">{opportunity.protocol}</p>
          </div>
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(opportunity.riskScore)}`}>
          Risk: {opportunity.riskScore}/100
        </div>
      </div>

      {/* Details */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Expected Profit:</span>
          <span className="font-medium text-green-600">+{opportunity.expectedProfit} ETH</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Confidence:</span>
          <span className="font-medium">{Math.round(opportunity.confidence * 100)}%</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Time Remaining:</span>
          <span className={`font-medium ${timeLeft < 3 ? 'text-red-600' : 'text-gray-700'}`}>
            {timeLeft} min
          </span>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-600 mb-4 bg-gray-50 p-3 rounded-lg">
        {opportunity.details}
      </p>

      {/* Analysis Result */}
      {analysis && (
        <div className={`p-3 rounded-lg mb-4 ${analysis.approved ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          <p className={`text-sm font-medium ${analysis.approved ? 'text-green-800' : 'text-red-800'}`}>
            {analysis.approved ? '✓ AI Approved' : '✗ AI Rejected'}
          </p>
          <p className={`text-sm ${analysis.approved ? 'text-green-600' : 'text-red-600'}`}>
            {analysis.reason}
          </p>
        </div>
      )}

      {/* Payment State */}
      {activePayment && (
        <div className="p-3 rounded-lg bg-blue-50 border border-blue-200 mb-4">
          <p className="text-sm font-medium text-blue-800">Payment Required</p>
          <p className="text-sm text-blue-600">
            Amount: {activePayment.amount} ETH
          </p>
          <p className="text-xs text-blue-500 mt-1">
            Status: {activePayment.status}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {!analysis ? (
          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
          >
            {isAnalyzing ? 'Analyzing...' : 'Analyze with AI'}
          </button>
        ) : analysis.approved ? (
          <>
            <button
              onClick={handlePayAndExecute}
              disabled={isCreating || !!activePayment}
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium"
            >
              {isCreating ? 'Creating Payment...' : activePayment ? 'Payment Pending' : 'Pay & Execute'}
            </button>
            <button
              onClick={() => onReject?.(opportunity.id)}
              className="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
            >
              Skip
            </button>
          </>
        ) : (
          <button
            onClick={() => onReject?.(opportunity.id)}
            className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
          >
            Dismiss
          </button>
        )}
      </div>
    </div>
  );
}
