// app/page.tsx - Main Cerberus dashboard
'use client';

import { useEffect, Suspense, useState } from 'react';
import { useAccount } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { WorldIDVerify } from '@/components/WorldIDVerify';
import { XMTPChat } from '@/components/XMTPChat';
import { OpportunityCard } from '@/components/OpportunityCard';
import { AgentStatus } from '@/components/AgentStatus';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAgent } from '@/hooks/useAgent';

export default function Home() {
  const { address } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { opportunities, isScanning, scan } = useAgent();
  const [activeTab, setActiveTab] = useState<'opportunities' | 'chat' | 'settings'>('opportunities');

  const handleReject = (id: string) => {
    // In a full implementation, this would track rejected opportunities
    console.log('Rejected opportunity:', id);
  };

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
                <p className="text-xs text-gray-500">AI-Powered DeFi Agent</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
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
            <p className="text-lg text-gray-600 mb-8 max-w-2xl mx-auto">
              Cerberus scans markets, discovers opportunities, and executes trades with 
              AI-powered risk analysis. Verified by World ID, powered by AgentKit.
            </p>
            <button
              onClick={openConnectModal}
              className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold text-lg transition-all"
            >
              Connect Wallet to Start
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left column - Agent & Verification */}
            <div className="space-y-6">
              <ErrorBoundary>
                <AgentStatus />
              </ErrorBoundary>
              <ErrorBoundary>
                <WorldIDVerify />
              </ErrorBoundary>
            </div>

            {/* Center/Right column - Opportunities & Chat */}
            <div className="lg:col-span-2 space-y-6">
              {/* Tabs */}
              <div className="flex items-center gap-1 p-1 bg-gray-100 rounded-lg">
                <button
                  onClick={() => setActiveTab('opportunities')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'opportunities' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Opportunities {opportunities.length > 0 && (
                    <span className="ml-1.5 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs">
                      {opportunities.length}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === 'chat' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Messages
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

              {/* Tab Content */}
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
                            onReject={handleReject}
                          />
                        </ErrorBoundary>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'chat' && (
                <ErrorBoundary>
                  <XMTPChat className="h-[600px]" />
                </ErrorBoundary>
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
                      <p className="font-medium text-gray-900">Network</p>
                      <p className="text-sm text-gray-600 mt-1">Base Mainnet</p>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <p className="font-medium text-gray-900">Version</p>
                      <p className="text-sm text-gray-600 mt-1">Cerberus v0.1.0</p>
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
            <p>Powered by AgentKit, XMTP, World ID, and x402</p>
            <p>Built for AgentKit Hackathon 2025</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
