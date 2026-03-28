// components/XMTPChat.tsx - XMTP Negotiation Layer Interface
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useXMTP } from '@/hooks/useXMTP';
import { useAccount } from 'wagmi';
import { useWorldID } from '@/hooks/useWorldID';
import { useX402 } from '@/hooks/useX402';
import { 
  type XMTPNegotiationContent, 
  type Opportunity, 
  type XMTPApprovalContent, 
  type XMTPRejectionContent,
  type XMTPProposalContent 
} from '@/lib/agentkit/types';

interface XMTPChatProps {
  className?: string;
  onApprove?: (opportunity: Opportunity) => void;
  onReject?: (opportunityId: string, reason: string) => void;
  onExecute?: (opportunity: Opportunity) => void;
}

// Parse message content to check if it's a negotiation message
function parseNegotiationMessage(content: string): XMTPNegotiationContent | null {
  try {
    const parsed = JSON.parse(content);
    if (parsed.type && ['PROPOSAL', 'APPROVAL', 'REJECTION', 'EXECUTION', 'CHAT'].includes(parsed.type)) {
      return parsed as XMTPNegotiationContent;
    }
    return null;
  } catch {
    // Not JSON, treat as chat message
    return { type: 'CHAT', text: content, timestamp: Date.now() };
  }
}

// Format opportunity for display
function formatOpportunity(opp: Opportunity): string {
  return `💰 ${opp.type.toUpperCase()} on ${opp.protocol}
Asset: ${opp.asset}
Return: ${opp.potentialReturn}%
Risk: ${opp.risk}
Amount: ${opp.amount} ETH
AI: ${opp.aiAnalysis}`;
}

// Check if high value (>$1000)
function isHighValue(amount: number): boolean {
  return amount > 1000;
}

export function XMTPChat({ className = '', onApprove, onReject, onExecute }: XMTPChatProps) {
  const { address } = useAccount();
  const { verified: worldIDVerified, verify: verifyWorldID } = useWorldID();
  const { create: createX402Payment, activePayment } = useX402();
  const {
    isConnected,
    isInitializing,
    error,
    conversations,
    activeConversation,
    messages,
    connect,
    disconnect,
    startChat,
    send,
    setActiveConversation,
  } = useXMTP();

  const [newAddress, setNewAddress] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [pendingProposals, setPendingProposals] = useState<Map<string, Opportunity>>(new Map());
  const [worldIDRequired, setWorldIDRequired] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Parse messages and extract proposals
  useEffect(() => {
    const proposals = new Map<string, Opportunity>();
    
    messages.forEach(msg => {
      const parsed = parseNegotiationMessage(msg.content);
      if (parsed?.type === 'PROPOSAL') {
        const proposalContent = parsed as XMTPProposalContent;
        proposals.set(proposalContent.opportunity.id, proposalContent.opportunity);
      }
      if (parsed?.type === 'APPROVAL' || parsed?.type === 'REJECTION') {
        // Remove from pending if approved/rejected
        const id = (parsed as XMTPApprovalContent | XMTPRejectionContent).opportunityId;
        proposals.delete(id);
      }
    });
    
    setPendingProposals(proposals);
  }, [messages]);

  const handleStartChat = async () => {
    if (!newAddress || !newAddress.startsWith('0x')) return;
    await startChat(newAddress);
    setNewAddress('');
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    
    // Send as CHAT type
    const chatContent = {
      type: 'CHAT',
      text: newMessage,
      timestamp: Date.now(),
    };
    await send(JSON.stringify(chatContent));
    setNewMessage('');
  };

  // Handle approval via XMTP
  const handleApprove = useCallback(async (opportunity: Opportunity) => {
    const requireWorldID = isHighValue(opportunity.amount);
    
    // If high value and World ID not verified, require it
    if (requireWorldID && !worldIDVerified) {
      setWorldIDRequired(opportunity.id);
      return;
    }

    const approvalContent: XMTPApprovalContent = {
      type: 'APPROVAL',
      opportunityId: opportunity.id,
      requireWorldID,
      timestamp: Date.now(),
    };

    await send(JSON.stringify(approvalContent));
    
    // Remove from pending
    setPendingProposals(prev => {
      const newMap = new Map(prev);
      newMap.delete(opportunity.id);
      return newMap;
    });
    
    onApprove?.(opportunity);
  }, [send, worldIDVerified, onApprove]);

  // Handle rejection via XMTP
  const handleReject = useCallback(async (opportunity: Opportunity, reason: string = 'User rejected') => {
    const rejectionContent: XMTPRejectionContent = {
      type: 'REJECTION',
      opportunityId: opportunity.id,
      reason,
      timestamp: Date.now(),
    };

    await send(JSON.stringify(rejectionContent));
    
    // Remove from pending
    setPendingProposals(prev => {
      const newMap = new Map(prev);
      newMap.delete(opportunity.id);
      return newMap;
    });
    
    onReject?.(opportunity.id, reason);
  }, [send, onReject]);

  // Handle World ID verification and continue
  const handleWorldIDAndApprove = useCallback(async (opportunity: Opportunity) => {
    // This would trigger the World ID verification flow
    // For now, we assume it's verified via the hook
    await handleApprove(opportunity);
    setWorldIDRequired(null);
  }, [handleApprove]);

  // Handle payment via x402
  const handlePayAndExecute = useCallback(async (opportunity: Opportunity) => {
    await createX402Payment({
      opportunityId: opportunity.id,
      amount: '1000000000000000', // 0.001 ETH in wei
      tokenAddress: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
      description: `Execute ${opportunity.type} on ${opportunity.protocol}`,
    });
    
    onExecute?.(opportunity);
  }, [createX402Payment, onExecute]);

  // Render message content based on type
  const renderMessageContent = (content: string) => {
    const parsed = parseNegotiationMessage(content);
    if (!parsed) return <p className="text-sm">{content}</p>;

    switch (parsed.type) {
      case 'PROPOSAL': {
        const proposal = parsed as XMTPProposalContent;
        const opp = proposal.opportunity;
        const isExpired = Date.now() > proposal.expiresAt;
        
        return (
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-3 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900 mb-1">🤖 Trade Proposal</p>
            <div className="text-sm text-gray-700 space-y-1">
              <p><span className="font-medium">Type:</span> {opp.type}</p>
              <p><span className="font-medium">Protocol:</span> {opp.protocol}</p>
              <p><span className="font-medium">Asset:</span> {opp.asset}</p>
              <p><span className="font-medium">Return:</span> <span className="text-green-600 font-medium">{opp.potentialReturn}%</span></p>
              <p><span className="font-medium">Risk:</span> <span className={`${opp.risk === 'low' ? 'text-green-600' : opp.risk === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>{opp.risk}</span></p>
              <p><span className="font-medium">Amount:</span> {opp.amount} ETH</p>
              <p className="text-xs text-gray-500 mt-2 bg-white/50 p-2 rounded">{opp.aiAnalysis}</p>
            </div>
            {isExpired && <p className="text-xs text-red-500 mt-2">⚠️ Expired</p>}
          </div>
        );
      }
      
      case 'APPROVAL': {
        const approval = parsed as XMTPApprovalContent;
        return (
          <div className="bg-green-50 p-2 rounded-lg border border-green-200">
            <p className="text-sm font-semibold text-green-800">✅ Approved</p>
            {approval.requireWorldID && (
              <p className="text-xs text-green-600">World ID verified</p>
            )}
          </div>
        );
      }
      
      case 'REJECTION': {
        const rejection = parsed as XMTPRejectionContent;
        return (
          <div className="bg-red-50 p-2 rounded-lg border border-red-200">
            <p className="text-sm font-semibold text-red-800">❌ Rejected</p>
            <p className="text-xs text-red-600">{rejection.reason}</p>
          </div>
        );
      }
      
      case 'EXECUTION': {
        return (
          <div className="bg-purple-50 p-2 rounded-lg border border-purple-200">
            <p className="text-sm font-semibold text-purple-800">🚀 Trade Executed</p>
          </div>
        );
      }
      
      case 'CHAT':
      default:
        return <p className="text-sm">{(parsed as { text: string }).text || content}</p>;
    }
  };

  if (!address) {
    return (
      <div className={`p-4 rounded-lg bg-gray-100 ${className}`}>
        <p className="text-gray-500 text-center">Connect your wallet to use XMTP messaging</p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[600px] bg-white rounded-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="p-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">XMTP Negotiation Layer</h3>
          <p className="text-xs text-gray-500">Agent proposals & approvals</p>
        </div>
        {isConnected ? (
          <button
            onClick={disconnect}
            className="text-sm text-red-600 hover:text-red-700"
          >
            Disconnect
          </button>
        ) : (
          <button
            onClick={connect}
            disabled={isInitializing}
            className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isInitializing ? 'Connecting...' : 'Connect XMTP'}
          </button>
        )}
      </div>

      {error && (
        <div className="p-2 bg-red-50 border-b border-red-200">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {!isConnected ? (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-gray-500 mb-4">Connect to XMTP to receive agent proposals</p>
            <button
              onClick={connect}
              disabled={isInitializing}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isInitializing ? 'Initializing...' : 'Connect XMTP'}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left sidebar - Proposals */}
          <div className="w-72 border-r border-gray-200 flex flex-col bg-gray-50">
            <div className="p-3 border-b border-gray-200 bg-white">
              <h4 className="font-medium text-sm text-gray-700">Pending Proposals ({pendingProposals.size})</h4>
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {pendingProposals.size === 0 ? (
                <p className="p-3 text-sm text-gray-400 text-center">No pending proposals</p>
              ) : (
                Array.from(pendingProposals.entries()).map(([id, opp]) => (
                  <div key={id} className="bg-white p-3 rounded-lg border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                        {opp.type}
                      </span>
                      <span className={`text-xs ${opp.risk === 'low' ? 'text-green-600' : opp.risk === 'medium' ? 'text-yellow-600' : 'text-red-600'}`}>
                        {opp.risk} risk
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{opp.protocol}</p>
                    <p className="text-xs text-gray-500 mb-2">{opp.asset}</p>
                    <p className="text-sm font-semibold text-green-600 mb-2">+{opp.potentialReturn}% return</p>
                    
                    {isHighValue(opp.amount) && !worldIDVerified && (
                      <p className="text-xs text-amber-600 mb-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        World ID required (${opp.amount} &gt; $1000)
                      </p>
                    )}
                    
                    <div className="flex gap-1 mt-2">
                      <button
                        onClick={() => handleApprove(opp)}
                        disabled={isHighValue(opp.amount) && !worldIDVerified}
                        className="flex-1 px-2 py-1.5 bg-green-600 text-white text-xs rounded hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(opp)}
                        className="px-2 py-1.5 bg-red-100 text-red-700 text-xs rounded hover:bg-red-200"
                      >
                        Reject
                      </button>
                    </div>
                    
                    {worldIDRequired === opp.id && (
                      <div className="mt-2 p-2 bg-amber-50 rounded border border-amber-200">
                        <p className="text-xs text-amber-700 mb-1">Please verify with World ID first</p>
                        <button
                          onClick={() => handleWorldIDAndApprove(opp)}
                          className="w-full px-2 py-1 bg-amber-600 text-white text-xs rounded hover:bg-amber-700"
                        >
                          Verify & Approve
                        </button>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Center - Conversations */}
          <div className="w-64 border-r border-gray-200 flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <input
                type="text"
                placeholder="Enter address (0x...)"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleStartChat()}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={handleStartChat}
                disabled={!newAddress.startsWith('0x')}
                className="mt-2 w-full px-2 py-1.5 bg-gray-100 text-sm rounded hover:bg-gray-200 disabled:opacity-50"
              >
                Start Chat
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="p-3 text-sm text-gray-400 text-center">No conversations</p>
              ) : (
                conversations.map((convo) => (
                  <button
                    key={convo.topic}
                    onClick={() => setActiveConversation(convo)}
                    className={`w-full p-3 text-left hover:bg-gray-50 border-b border-gray-100 ${
                      activeConversation?.topic === convo.topic ? 'bg-blue-50' : ''
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {convo.peerAddress.slice(0, 6)}...{convo.peerAddress.slice(-4)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {convo.messages.length} messages
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Right - Chat area */}
          <div className="flex-1 flex flex-col">
            {activeConversation ? (
              <>
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <p className="text-center text-gray-400">No messages yet</p>
                  ) : (
                    messages.map((msg) => {
                      const isMe = msg.senderAddress.toLowerCase() === address.toLowerCase();
                      const parsed = parseNegotiationMessage(msg.content);
                      
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-[80%] ${parsed?.type && parsed.type !== 'CHAT' ? 'w-full' : ''}`}>
                            {renderMessageContent(msg.content)}
                            <p className={`text-xs mt-1 ${isMe ? 'text-blue-300 text-right' : 'text-gray-400'}`}>
                              {new Date(msg.sentAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSend} className="p-3 border-t border-gray-200 flex gap-2 bg-white">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message or reply to proposals..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-4">
                <p className="text-gray-400 mb-4">Select a conversation</p>
                <div className="text-center text-sm text-gray-500 max-w-xs">
                  <p className="mb-2">The agent sends trade proposals here.</p>
                  <p>Approve or reject them to control execution.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
