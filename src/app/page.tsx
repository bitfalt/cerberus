// app/page.tsx - Main Cerberus dashboard with XMTP as negotiation layer
'use client';

import { useEffect, Suspense, useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { WorldIDVerify } from '@/components/WorldIDVerify';
import { XMTPChat } from '@/components/XMTPChat';
import { OpportunityCard } from '@/components/OpportunityCard';
import { AgentStatus } from '@/components/AgentStatus';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAgent } from '@/hooks/useAgent';
import { useX402 } from '@/hooks/useX402';
import { useWorldID } from '@/hooks/useWorldID';
import { type Opportunity } from '@/lib/agentkit/types';

export default function Home() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { 
    opportunities, 
    isScanning, 
    scan, 
    pendingProposals, 
    executeApprovedTrade,
    negotiationStates 
  } = useAgent();
  const { 
    markXMTPApproved, 
    canPay, 
    createForXMTPApproved,
    activePayment 
  } = useX402();
  const { verified: worldIDVerified } = useWorldID();
  
  const [activeTab, setActiveTab] = useState<'negotiation' | 'opportunities' | 'settings'>('negotiation');
  const [executionQueue, setExecutionQueue] = useState<string[]>([]);

  // Handle XMTP approval - mark as approved and proceed to payment
  const handleApprove = useCallback(async (opportunity: Opportunity) => {
    const isHighValue = opportunity.amount > 1000;
    
    // Mark as XMTP-approved in x402
    // For high-value trades, XMTP approval alone isn't enough - World ID per-transaction is also required
    // This is handled in XMTPChat component via the handlePayAndExecute flow
    markXMTPApproved(opportunity.id, isHighValue ? worldIDVerified : true);
    
    // Note: For high-value trades, World ID per-transaction verification happens in XMTPChat
    // when the user clicks "Pay & Execute", not at approval time.
    // This ensures: XMTP Approval → World ID (if high-value) → x402 → Execute
    
    // Add to execution queue
    setExecutionQueue(prev => [...prev, opportunity.id]);
  }, [markXMTPApproved, worldIDVerified]);

  // Handle XMTP rejection
  const handleReject = useCallback((opportunityId: string, reason: string) => {
    console.log('Rejected opportunity:', opportunityId, reason);
    // Remove from execution queue if present
    setExecutionQueue(prev => prev.filter(id => id !== opportunityId));
  }, []);

  // Handle execution after payment
  const handleExecute = useCallback(async (opportunity: Opportunity) => {
    if (!canPay(opportunity.id)) {
      console.error('Cannot execute: trade not XMTP-approved');
      return;
    }
    
    const result = await executeApprovedTrade(opportunity.id);
    
    if (result.success) {
      // Remove from queue
      setExecutionQueue(prev => prev.filter(id => id !== opportunity.id));
    }
  }, [canPay, executeApprovedTrade]);

  // Check if we have any pending XMTP approvals
  const hasPendingProposals = pendingProposals.length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Cerberus</h1>
                <p className="text-xs text-gray-500">AI-Powered DeFi Agent with XMTP Negotiation</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              {address && hasPendingProposals && (
                <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-sm font-medium animate-pulse">
                  {pendingProposals.length} pending proposal{pendingProposals.length > 1 ? 's' : ''}
                </span>
              )}
              {!address && (
                <button
                  onClick={openConnectModal}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                >
                  Connect Wallet
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!address ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Autonomous DeFi Intelligence
            </h2>
            <p className="text-lg text-gray-600 mb-4 max-w-2xl mx-auto">
              Cerberus scans markets, discovers opportunities, and proposes trades via XMTP.
            </p>
            <p className="text-md text-blue-600 mb-8 max-w-2xl mx-auto font-medium">
              The agent negotiates with you through XMTP - approve proposals in chat, 
              pay via x402, and execute trades securely.
            </p>
            <button
              onClick={openConnectModal}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold text-lg transition-all"
            >
              Connect Wallet to Start
            </button>
            
            {/* Flow diagram */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-4 text-sm text-gray-500">
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-2">🤖</div>
                <span>Agent Scans</span>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center mb-2">💬</div>
                <span>XMTP Proposal</span>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mb-2">✅</div>
                <span>You Approve</span>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-2">🔐</div>
                <span>World ID (if $1000+)</span>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mb-2">💳</div>
                <span>x402 Payment</span>
              </div>
              <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <div className="flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-2">🚀</div>
                <span>Trade Executed</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Agent Status & World ID */}
            <div className="space-y-6">
              <ErrorBoundary>
                <AgentStatus />
              </ErrorBoundary>
              <ErrorBoundary>
                <WorldIDVerify />
              </ErrorBoundary>
              
              {/* XMTP Negotiation Status */}
              <div className="p-4 bg-white rounded-xl border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  Negotiation Status
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Pending Proposals:</span>
                    <span className="font-medium text-amber-600">{pendingProposals.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Approved & Queued:</span>
                    <span className="font-medium text-green-600">{executionQueue.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">World ID Status:</span>
                    <span className={`font-medium ${worldIDVerified ? 'text-green-600' : 'text-amber-600'}`}>
                      {worldIDVerified ? '✓ Gate Verified' : '⚠ Per-Trade Mode'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    High-value trades (&gt;$1000) require biometric verification per transaction.
                  </p>
                  {activePayment && (
                    <div className="mt-3 p-2 bg-indigo-50 rounded border border-indigo-200">
                      <p className="text-xs text-indigo-700">Active x402 Payment:</p>
                      <p className="text-sm font-medium text-indigo-900">{activePayment.amount} ETH</p>
                      <p className="text-xs text-indigo-600">Status: {activePayment.status}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Center/Right column - XMTP Negotiation Layer (Primary) */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs - Negotiation is now primary */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setActiveTab('negotiation')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'negotiation' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  XMTP Negotiation
                  {pendingProposals.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">
                      {pendingProposals.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'opportunities' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All Opportunities
                  {opportunities.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {opportunities.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'settings' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Settings
                </button>
              </div>

              {/* Tab Content - XMTP Negotiation is Primary */}
              {activeTab === 'negotiation' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">XMTP Negotiation Layer</h2>
                      <p className="text-sm text-gray-500">Agent sends proposals → You approve/reject via XMTP</p>
                    </div>
                    <button
                      onClick={scan}
                      disabled={isScanning}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isScanning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Scan Markets
                        </>
                      )}
                    </button>
                  </div>

                  <ErrorBoundary>
                    <XMTPChat 
                      className="h-[600px]" 
                      onApprove={handleApprove}
                      onReject={handleReject}
                      onExecute={handleExecute}
                    />
                  </ErrorBoundary>
                </div>
              )}

              {activeTab === 'opportunities' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Market Opportunities</h2>
                    <button
                      onClick={scan}
                      disabled={isScanning}
                      className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {isScanning ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Scanning...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Refresh
                        </>
                      )}
                    </button>
                  </div>

                  {opportunities.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                      <p className="text-gray-500 mb-4">No opportunities found yet</p>
                      <button
                        onClick={scan}
                        disabled={isScanning}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                      >
                        {isScanning ? 'Scanning...' : 'Scan Markets'}
                      </button>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {opportunities.map((opp) => (
                        <ErrorBoundary key={opp.id}>
                          <OpportunityCard
                            opportunity={opp}
                            onReject={(id) => handleReject(id, 'Rejected from opportunities list')}
                          />
                        </ErrorBoundary>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'settings' && (
                <div className="p-6 bg-white rounded-xl border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">Wallet Address</p>
                      <p className="text-sm text-gray-600 font-mono mt-1">{address}</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">XMTP Negotiation Layer</p>
                      <p className="text-sm text-gray-600 mt-1">Enabled - Agent sends proposals via XMTP</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">World ID Security</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Per-transaction biometric verification for trades &gt; $1,000.
                        Even with stolen keys, attackers can't trade without your iris scan.
                      </p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">Network</p>
                      <p className="text-sm text-gray-600 mt-1">Base Mainnet</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">Version</p>
                      <p className="text-sm text-gray-600 mt-1">Cerberus v0.1.0 (XMTP Negotiation)</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <p>Powered by AgentKit, XMTP (Negotiation Layer), World ID, and x402</p>
            <p>Built for AgentKit Hackathon 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
