"use client";

import { useState, useEffect } from "react";
import { useAccount, useSendTransaction, useConnect, useDisconnect } from "wagmi";
import { injected } from "wagmi/connectors";
import { parseEther, formatEther } from "viem";
import { useBalance } from "wagmi";

// Mock agent opportunities for demo
const AGENT_OPPORTUNITIES = [
  {
    id: 1,
    type: "NFT",
    title: "CryptoPunk #7234",
    description: "Rare punk with gold chain, listed 15% below floor",
    price: "0.045",
    displayPrice: "0.045 ETH",
    riskScore: 85,
    urgency: "high",
    legitimacy: "verified",
  },
  {
    id: 2,
    type: "Trade",
    title: "ETH/USDC Arbitrage",
    description: "2.3% spread detected across DEXs on Base",
    price: "0.052",
    displayPrice: "5.2 ETH → 5.32 ETH",
    riskScore: 92,
    urgency: "medium",
    legitimacy: "verified",
  },
  {
    id: 3,
    type: "Suspicious",
    title: "Unknown Token Pre-sale",
    description: "New token offering 1000x returns guaranteed",
    price: "0.1",
    displayPrice: "1.0 ETH",
    riskScore: 15,
    urgency: "high",
    legitimacy: "unverified",
  },
];

interface XMTPMessage {
  id: string;
  from: "agent" | "owner";
  content: string;
  timestamp: number;
  proposal?: (typeof AGENT_OPPORTUNITIES)[0];
}

// Custom Wallet Button Component
function CustomWalletButton() {
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address });

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        {balance && (
          <span className="text-sm text-zinc-400 hidden sm:block">
            {parseFloat(formatEther(balance.value)).toFixed(4)} ETH
          </span>
        )}
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-sm font-medium transition-all"
        >
          {address.slice(0, 6)}...{address.slice(-4)}
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={() => connect({ connector: injected() })}
      disabled={isConnecting}
      className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl text-sm font-medium transition-all disabled:opacity-50"
    >
      {isConnecting ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { sendTransaction, isPending: isSending } = useSendTransaction();
  
  const [worldIdVerified, setWorldIdVerified] = useState(false);
  const [messages, setMessages] = useState<XMTPMessage[]>([]);
  const [currentProposal, setCurrentProposal] = useState<(typeof AGENT_OPPORTUNITIES)[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentActive, setAgentActive] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, saved: "0.00" });
  const [showWorldIDModal, setShowWorldIDModal] = useState(false);

  // Initialize XMTP messages
  useEffect(() => {
    if (isConnected && messages.length === 0) {
      setMessages([
        {
          id: "welcome",
          from: "agent",
          content: "👋 Hello! I'm your autonomous trading agent. I'll scan for opportunities and request your approval before executing any trades via x402 payments.",
          timestamp: Date.now(),
        },
      ]);
    }
  }, [isConnected]);

  // Simulate agent finding opportunities
  useEffect(() => {
    if (!agentActive || !isConnected) return;

    const interval = setInterval(() => {
      const randomOp = AGENT_OPPORTUNITIES[Math.floor(Math.random() * AGENT_OPPORTUNITIES.length)];
      const newMessage: XMTPMessage = {
        id: Date.now().toString(),
        from: "agent",
        content: `🔍 Found opportunity: ${randomOp.title} (${randomOp.displayPrice})\n\nRisk Score: ${randomOp.riskScore}/100`,
        timestamp: Date.now(),
        proposal: randomOp,
      };
      setMessages((prev) => [...prev, newMessage]);
      setCurrentProposal(randomOp);
    }, 20000); // New opportunity every 20 seconds for demo

    return () => clearInterval(interval);
  }, [agentActive, isConnected]);

  const handleWorldIDVerify = () => {
    setShowWorldIDModal(true);
  };

  const completeWorldIDVerification = () => {
    setWorldIdVerified(true);
    setShowWorldIDModal(false);
    setMessages((prev) => [
      ...prev,
      {
        id: `verify-${Date.now()}`,
        from: "agent",
        content: "✅ World ID verified. You are now authenticated as the unique human controller. Biometric proof active.",
        timestamp: Date.now(),
      },
    ]);
  };

  const handleApprove = async (proposal: (typeof AGENT_OPPORTUNITIES)[0]) => {
    if (!worldIdVerified) {
      alert("Please verify with World ID first! This prevents unauthorized trades even if your wallet is compromised.");
      return;
    }

    if (!address) return;

    setIsProcessing(true);

    try {
      // Simulate x402 payment flow
      // In production, this would use actual x402 protocol
      sendTransaction({
        to: "0x0000000000000000000000000000000000000000" as `0x${string}`,
        value: parseEther(proposal.price),
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `action-${Date.now()}`,
          from: "owner",
          content: `✅ APPROVED: ${proposal.title}`,
          timestamp: Date.now(),
        },
        {
          id: `exec-${Date.now()}`,
          from: "agent",
          content: `💰 x402 payment released (${proposal.displayPrice}). World ID verification confirmed. Trade executed successfully!`,
          timestamp: Date.now(),
        },
      ]);

      setStats((prev) => ({
        ...prev,
        approved: prev.approved + 1,
        saved: (parseFloat(prev.saved) + 0.5).toFixed(2),
      }));
    } catch (error) {
      console.error("Transaction failed:", error);
    }

    setCurrentProposal(null);
    setIsProcessing(false);
  };

  const handleReject = async (proposal: (typeof AGENT_OPPORTUNITIES)[0]) => {
    setIsProcessing(true);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    // Calculate what would have been lost for suspicious trades
    const potentialLoss = proposal.legitimacy === "unverified" ? "10,000" : "0";

    setMessages((prev) => [
      ...prev,
      {
        id: `reject-${Date.now()}`,
        from: "owner",
        content: `❌ REJECTED: ${proposal.title}`,
        timestamp: Date.now(),
      },
      {
        id: `blocked-${Date.now()}`,
        from: "agent",
        content: proposal.legitimacy === "unverified"
          ? `🛡️ Trade BLOCKED. This matched known scam patterns. Potential savings: $${potentialLoss}`
          : "🛡️ Trade cancelled as requested. Funds remain in your wallet.",
        timestamp: Date.now(),
      },
    ]);

    if (proposal.legitimacy === "unverified") {
      setStats((prev) => ({
        ...prev,
        rejected: prev.rejected + 1,
        saved: (parseFloat(prev.saved) + 10000).toFixed(2),
      }));
    } else {
      setStats((prev) => ({ ...prev, rejected: prev.rejected + 1 }));
    }

    setCurrentProposal(null);
    setIsProcessing(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              A
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">AgentAuth</h1>
              <p className="text-xs text-zinc-400">Human-in-the-Loop Agent Governance</p>
            </div>
          </div>
          <CustomWalletButton />
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <span className="text-4xl">🤖</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Welcome to AgentAuth</h2>
            <p className="text-zinc-400 max-w-md mb-4">
              Connect your wallet to experience autonomous AI agents with verified human approval.
            </p>
            <p className="text-sm text-zinc-500 max-w-md mb-8">
              Powered by World ID • Coinbase x402 • XMTP
            </p>
            <CustomWalletButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Stats & Controls */}
            <div className="space-y-6">
              {/* World ID Verification Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🔐</span> World ID
                </h3>
                {worldIdVerified ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-sm font-medium">Verified Human Controller</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Biometric proof active. Even if your wallet keys are compromised, attackers cannot authorize trades without your World ID.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">
                      Verify with World ID to enable agent authorization. This prevents unauthorized trades even with stolen keys.
                    </p>
                    <button
                      onClick={handleWorldIDVerify}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all"
                    >
                      Verify with World ID
                    </button>
                  </div>
                )}
              </div>

              {/* Agent Control */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🤖</span> Agent Control
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Status</span>
                    <span className={`text-sm font-medium ${agentActive ? "text-green-400" : "text-yellow-400"}`}>
                      {agentActive ? "Scanning Markets" : "Standby"}
                    </span>
                  </div>
                  <button
                    onClick={() => setAgentActive(!agentActive)}
                    className={`w-full py-3 px-4 rounded-xl font-medium transition-all ${
                      agentActive
                        ? "bg-red-500/20 text-red-400 hover:bg-red-500/30"
                        : "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                    }`}
                  >
                    {agentActive ? "Stop Agent" : "Activate Agent"}
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4">📊 Stats</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-400">{stats.approved}</div>
                    <div className="text-xs text-zinc-500">Approved</div>
                  </div>
                  <div className="bg-zinc-950/50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-red-400">{stats.rejected}</div>
                    <div className="text-xs text-zinc-500">Rejected</div>
                  </div>
                </div>
                <div className="mt-4 bg-gradient-to-r from-blue-500/10 to-purple-600/10 rounded-xl p-4 border border-blue-500/20">
                  <div className="text-2xl font-bold text-white">${stats.saved}</div>
                  <div className="text-xs text-zinc-400">Potential Loss Prevented</div>
                </div>
              </div>
            </div>

            {/* Right Panel: XMTP Chat & Proposals */}
            <div className="lg:col-span-2 space-y-6">
              {/* XMTP Chat Interface */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span>💬</span> XMTP Agent Chat
                    <span className="text-xs text-zinc-500 font-normal">(Encrypted)</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className="w-2 h-2 rounded-full bg-green-400"></span>
                    Active
                  </div>
                </div>
                <div className="h-80 overflow-y-auto p-4 space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.from === "owner" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                          msg.from === "owner"
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-800 text-zinc-200"
                        }`}
                      >
                        <p className="text-sm whitespace-pre-line">{msg.content}</p>
                        <span className="text-xs opacity-60 mt-1 block">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  ))}
                  {messages.length === 0 && (
                    <div className="text-center text-zinc-500 py-12">
                      Connect wallet to start chatting with your agent
                    </div>
                  )}
                </div>
              </div>

              {/* Current Proposal */}
              {currentProposal && (
                <div className="bg-gradient-to-r from-zinc-900/80 to-zinc-800/80 border border-zinc-700 rounded-2xl p-6 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium mb-2 ${
                        currentProposal.legitimacy === "verified"
                          ? "bg-green-500/20 text-green-400"
                          : "bg-red-500/20 text-red-400"
                      }`}>
                        {currentProposal.legitimacy === "verified" ? "✓ Verified" : "⚠ High Risk"}
                      </span>
                      <h4 className="text-xl font-bold text-white">{currentProposal.title}</h4>
                      <p className="text-zinc-400 text-sm mt-1">{currentProposal.description}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">{currentProposal.displayPrice}</div>
                      <div className={`text-sm ${
                        currentProposal.riskScore > 70 ? "text-green-400" : "text-red-400"
                      }`}>
                        Risk Score: {currentProposal.riskScore}/100
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 mt-6">
                    <button
                      onClick={() => handleReject(currentProposal)}
                      disabled={isProcessing}
                      className="flex-1 py-3 px-4 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : "❌ Reject"}
                    </button>
                    <button
                      onClick={() => handleApprove(currentProposal)}
                      disabled={isProcessing || !worldIdVerified || isSending}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      {isSending ? "Confirming..." : isProcessing ? "Processing..." : worldIdVerified ? "✅ Approve (x402)" : "Verify World ID First"}
                    </button>
                  </div>

                  {!worldIdVerified && (
                    <p className="text-center text-sm text-yellow-400 mt-3">
                      ⚠️ World ID verification required to approve trades — prevents key compromise attacks
                    </p>
                  )}
                </div>
              )}

              {/* Empty State */}
              {!currentProposal && agentActive && (
                <div className="bg-zinc-900/30 border border-zinc-800 rounded-2xl p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-zinc-800 flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl">🔍</span>
                  </div>
                  <p className="text-zinc-400">Agent is scanning for opportunities...</p>
                  <p className="text-xs text-zinc-600 mt-2">New proposals will appear here automatically via XMTP</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* World ID Modal */}
      {showWorldIDModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🌐</span>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">World ID Verification</h3>
              <p className="text-sm text-zinc-400 mb-6">
                Prove you're a unique human to authorize agent transactions. This prevents unauthorized trades even if your wallet is compromised.
              </p>
              
              <div className="bg-zinc-950 rounded-xl p-4 mb-6 text-left">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">1</div>
                  <span className="text-sm text-zinc-300">Biometric proof of personhood</span>
                </div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">2</div>
                  <span className="text-sm text-zinc-300">Zero-knowledge verification</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 text-xs">3</div>
                  <span className="text-sm text-zinc-300">Prevents bot/sybil attacks</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowWorldIDModal(false)}
                  className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={completeWorldIDVerification}
                  className="flex-1 py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all"
                >
                  Verify (Demo)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p>Built for AgentKit Hackathon 2025</p>
          <p className="mt-1">Powered by World ID • Coinbase x402 • XMTP</p>
        </div>
      </footer>
    </main>
  );
}
