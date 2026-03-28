"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount, useSignMessage } from "wagmi";
import { formatEther } from "viem";
import { useIDKitRequest, IDKitRequestWidget, deviceLegacy } from "@worldcoin/idkit";
import type { IDKitResult, IDKitErrorCodes } from "@worldcoin/idkit";

// Dynamic import for XMTP to avoid SSR WASM issues
// Types only - actual import happens in browser
import type { Client as XMTPClientType, Conversation as ConversationType } from "@xmtp/xmtp-js";

// Real agent opportunities for demo (these would come from a real agent in production)
const AGENT_OPPORTUNITIES = [
  {
    id: 1,
    type: "NFT",
    title: "Base NFT Opportunity",
    description: "Rare NFT listed on Base marketplace, verified collection",
    price: "0.001",
    displayPrice: "0.001 ETH",
    riskScore: 85,
    urgency: "high",
    legitimacy: "verified",
    contractAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  {
    id: 2,
    type: "Trade",
    title: "ETH Staking Opportunity",
    description: "Verified liquid staking on Base",
    price: "0.002",
    displayPrice: "0.002 ETH",
    riskScore: 92,
    urgency: "medium",
    legitimacy: "verified",
    contractAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
  {
    id: 3,
    type: "Suspicious",
    title: "Suspicious Token Contract",
    description: "Unverified token offering detected",
    price: "0.005",
    displayPrice: "0.005 ETH",
    riskScore: 15,
    urgency: "high",
    legitimacy: "unverified",
    contractAddress: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
];

interface XMTPMessage {
  id: string;
  from: "agent" | "owner";
  content: string;
  timestamp: number;
  proposal?: (typeof AGENT_OPPORTUNITIES)[0];
}

interface WorldIDProof {
  proof: string;
  nullifier_hash: string;
  merkle_root: string;
  verification_level: string;
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  
  // World ID state
  const [worldIdVerified, setWorldIdVerified] = useState(false);
  const [worldIdProof, setWorldIdProof] = useState<WorldIDProof | null>(null);
  const [worldIdOpen, setWorldIdOpen] = useState(false);
  const [verifying, setVerifying] = useState(false);
  
  // XMTP state (using any due to dynamic import)
  const [xmtpClient, setXmtpClient] = useState<any>(null);
  const [xmtpConversation, setXmtpConversation] = useState<any>(null);
  const [messages, setMessages] = useState<XMTPMessage[]>([]);
  const [xmtpInitialized, setXmtpInitialized] = useState(false);
  
  // Agent and proposal state
  const [currentProposal, setCurrentProposal] = useState<(typeof AGENT_OPPORTUNITIES)[0] | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentActive, setAgentActive] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, saved: "0.00" });
  
  // Payment state (x402)
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "checking" | "paying" | "complete" | "failed">("idle");
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);

  // Refs for intervals
  const agentIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // ========== REAL WORLD ID V4 VERIFICATION ==========
  // Backend verifies the proof via /api/verify
  const verifyProofOnBackend = async (result: IDKitResult) => {
    try {
      setVerifying(true);
      
      // Handle v4 proof format
      let proofData: any;
      
      if ("protocol_version" in result && result.protocol_version === "4.0") {
        // V4 format - extract from responses array
        const response = result.responses?.[0];
        if (!response) {
          throw new Error("No proof response found");
        }
        // Handle both uniqueness proof (nullifier) and session proof (session_nullifier)
        const nullifier_hash = "nullifier" in response 
          ? response.nullifier 
          : "session_nullifier" in response 
            ? response.session_nullifier[0] 
            : "";
        proofData = {
          proof: response.proof, // string[] array
          nullifier_hash,
          merkle_root: response.proof[4], // 5th element is Merkle root
          verification_level: "device",
          action: "cerberus-verify",
          signal: address || "",
        };
      } else {
        // Fallback for v3 format
        const v3Result = result as any;
        proofData = {
          proof: v3Result.proof,
          nullifier_hash: v3Result.nullifier_hash,
          merkle_root: v3Result.merkle_root,
          verification_level: v3Result.verification_level,
          action: "cerberus-verify",
          signal: address || "",
        };
      }

      // Send to backend for verification
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(proofData),
      });

      const data = await response.json();

      if (data.success) {
        setWorldIdVerified(true);
        setWorldIdProof(proofData);
        setWorldIdOpen(false);
        
        addMessage({
          id: `verify-${Date.now()}`,
          from: "agent",
          content: `✅ World ID v4 verified on backend!\nNullifier: ${proofData.nullifier_hash.slice(0, 16)}...\nProtocol: v4.0\nYou are now authenticated as the unique human controller.`,
          timestamp: Date.now(),
        });
      } else {
        console.error("Backend verification failed:", data.error);
        addMessage({
          id: `verify-fail-${Date.now()}`,
          from: "agent",
          content: `❌ World ID verification failed: ${data.error}`,
          timestamp: Date.now(),
        });
      }
    } catch (error) {
      console.error("Verification error:", error);
      addMessage({
        id: `verify-error-${Date.now()}`,
        from: "agent",
        content: `❌ Verification error: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    } finally {
      setVerifying(false);
    }
  };

  // World ID v4 configuration
  const now = Math.floor(Date.now() / 1000);
  const worldIdConfig = {
    app_id: (process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID || "app_aaf3769987b47a8922c2948e7ae7ebfd") as `app_${string}`,
    action: "cerberus-verify",
    signal: address || "",
    preset: deviceLegacy(),
    rp_context: {
      rp_id: "cerberus-localhost",
      nonce: crypto.randomUUID(),
      created_at: now,
      expires_at: now + 3600, // 1 hour expiry
      signature: "0x", // Would be signed by backend in production
    },
    allow_legacy_proofs: false,
  };

  // IDKit v4 hook
  const { open: openWorldID } = useIDKitRequest(worldIdConfig);

  const handleWorldIDVerify = () => {
    setWorldIdOpen(true);
    openWorldID();
  };

  // ========== REAL XMTP INITIALIZATION ==========
  const initXMTP = useCallback(async () => {
    if (!address || !signMessageAsync || xmtpInitialized) return;
    
    try {
      console.log("Initializing real XMTP client...");
      
      // Dynamic import of XMTP (avoids SSR WASM issues)
      const xmtpModule = await import("@xmtp/xmtp-js");
      const Client = xmtpModule.Client;
      
      const xmtpSigner = {
        getAddress: () => Promise.resolve(address),
        signMessage: async (message: string) => {
          const result = await signMessageAsync({ message });
          return result;
        },
      };
      
      const client = await Client.create(xmtpSigner as any, {
        env: (process.env.NEXT_PUBLIC_XMTP_ENV as "dev" | "production") || "dev",
      });
      
      setXmtpClient(client);
      
      const agentAddress = "0x0000000000000000000000000000000000000000";
      const conversation = await client.conversations.newConversation(agentAddress);
      setXmtpConversation(conversation);
      
      setXmtpInitialized(true);
      
      const existingMessages = await conversation.messages();
      const formattedMessages: XMTPMessage[] = existingMessages.map((msg: any, idx: number) => ({
        id: `xmtp-${idx}`,
        from: msg.senderAddress === address ? "owner" : "agent",
        content: msg.content,
        timestamp: msg.sent?.getTime() || Date.now(),
      }));
      
      if (formattedMessages.length > 0) {
        setMessages(formattedMessages);
      } else {
        await conversation.send("👋 Hello! I'm your autonomous trading agent. I'll scan for opportunities and request your approval before executing any trades via x402 payments.");
        addMessage({
          id: "welcome",
          from: "agent",
          content: "👋 Hello! I'm your autonomous trading agent. I'll scan for opportunities and request your approval before executing any trades via x402 payments.",
          timestamp: Date.now(),
        });
      }
      
      const stream = await conversation.streamMessages();
      (async () => {
        try {
          for await (const msg of stream) {
            if (msg.senderAddress !== address) {
              addMessage({
                id: `xmtp-${Date.now()}`,
                from: "agent",
                content: msg.content || "",
                timestamp: Date.now(),
              });
            }
          }
        } catch (streamError) {
          console.error("XMTP stream error:", streamError);
        }
      })();
      
    } catch (error) {
      console.error("XMTP initialization error:", error);
      addMessage({
        id: "welcome",
        from: "agent",
        content: "👋 Hello! I'm your autonomous trading agent.\n⚠️ XMTP encryption unavailable - using local messaging.",
        timestamp: Date.now(),
      });
    }
  }, [address, signMessageAsync, xmtpInitialized]);

  const addMessage = useCallback(async (msg: XMTPMessage) => {
    setMessages((prev) => [...prev, msg]);
    
    if (xmtpConversation && msg.from === "owner") {
      try {
        await xmtpConversation.send(msg.content);
      } catch (error) {
        console.error("Failed to send XMTP message:", error);
      }
    }
  }, [xmtpConversation, address]);

  useEffect(() => {
    if (isConnected && !xmtpInitialized) {
      initXMTP();
    }
  }, [isConnected, initXMTP, xmtpInitialized]);

  // ========== REAL AGENT SIMULATION ==========
  useEffect(() => {
    if (!agentActive || !isConnected) {
      if (agentIntervalRef.current) {
        clearInterval(agentIntervalRef.current);
        agentIntervalRef.current = null;
      }
      return;
    }

    addMessage({
      id: `scanning-${Date.now()}`,
      from: "agent",
      content: "🔍 Agent activated. Scanning Base Sepolia for opportunities...",
      timestamp: Date.now(),
    });

    agentIntervalRef.current = setInterval(async () => {
      const randomOp = AGENT_OPPORTUNITIES[Math.floor(Math.random() * AGENT_OPPORTUNITIES.length)];
      
      const messageContent = `🔍 Found opportunity: ${randomOp.title} (${randomOp.displayPrice})\n\nRisk Score: ${randomOp.riskScore}/100\nType: ${randomOp.type}\nContract: ${randomOp.contractAddress.slice(0, 12)}...`;
      
      if (xmtpConversation) {
        try {
          await xmtpConversation.send(messageContent);
        } catch (error) {
          console.error("Failed to send agent message via XMTP:", error);
        }
      }
      
      addMessage({
        id: `proposal-${Date.now()}`,
        from: "agent",
        content: messageContent,
        timestamp: Date.now(),
        proposal: randomOp,
      });
      
      setCurrentProposal(randomOp);
    }, 20000);

    return () => {
      if (agentIntervalRef.current) {
        clearInterval(agentIntervalRef.current);
      }
    };
  }, [agentActive, isConnected, xmtpConversation, addMessage]);

  // ========== REAL X402 PAYMENT FLOW WITH BACKEND ==========
  const handleApprove = async (proposal: (typeof AGENT_OPPORTUNITIES)[0]) => {
    if (!worldIdVerified || !worldIdProof) {
      alert("Please verify with World ID first!");
      return;
    }

    if (!address) return;

    setIsProcessing(true);
    setPaymentStatus("checking");

    try {
      addMessage({
        id: `action-${Date.now()}`,
        from: "owner",
        content: `✅ APPROVED: ${proposal.title}`,
        timestamp: Date.now(),
      });

      setPaymentStatus("paying");

      // Call backend x402 payment endpoint
      const paymentResponse = await fetch("/api/x402/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: proposal.price,
          token: "ETH",
          recipient: proposal.contractAddress,
          world_id_nullifier: worldIdProof.nullifier_hash,
          proposal_id: proposal.id,
          user_address: address,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (paymentData.success) {
        setPaymentStatus("complete");
        setLastTxHash(paymentData.transaction_hash);

        addMessage({
          id: `exec-${Date.now()}`,
          from: "agent",
          content: `💰 x402 PAYMENT COMPLETE\nAmount: ${proposal.displayPrice}\nTo: ${proposal.contractAddress.slice(0, 12)}...\nTx: ${paymentData.transaction_hash.slice(0, 20)}...\nWorld ID verified: ${worldIdProof.nullifier_hash.slice(0, 16)}...`,
          timestamp: Date.now(),
        });

        setStats((prev) => ({
          ...prev,
          approved: prev.approved + 1,
          saved: (parseFloat(prev.saved) + 0.5).toFixed(2),
        }));
      } else {
        throw new Error(paymentData.error || "Payment failed");
      }

    } catch (error) {
      console.error("x402 payment failed:", error);
      setPaymentStatus("failed");
      
      addMessage({
        id: `error-${Date.now()}`,
        from: "agent",
        content: `❌ x402 payment failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        timestamp: Date.now(),
      });
    }

    setCurrentProposal(null);
    setIsProcessing(false);
    setTimeout(() => setPaymentStatus("idle"), 3000);
  };

  const handleReject = async (proposal: (typeof AGENT_OPPORTUNITIES)[0]) => {
    setIsProcessing(true);
    await new Promise((resolve) => setTimeout(resolve, 500));

    const potentialLoss = proposal.legitimacy === "unverified" ? "10,000" : "0";

    addMessage({
      id: `reject-${Date.now()}`,
      from: "owner",
      content: `❌ REJECTED: ${proposal.title}`,
      timestamp: Date.now(),
    });

    addMessage({
      id: `blocked-${Date.now()}`,
      from: "agent",
      content: proposal.legitimacy === "unverified"
        ? `🛡️ Trade BLOCKED by human decision. x402 payment guard prevented execution. Potential savings: $${potentialLoss}`
        : "🛡️ Trade cancelled as requested. x402 payment remains unexecuted.",
      timestamp: Date.now(),
    });

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
      {/* World ID v4 Widget */}
      <IDKitRequestWidget
        {...worldIdConfig}
        open={worldIdOpen}
        onOpenChange={setWorldIdOpen}
        handleVerify={async (result) => {
          console.log("Proof received, sending to backend...", result);
          await verifyProofOnBackend(result);
        }}
        onSuccess={(result) => {
          console.log("Widget success:", result);
        }}
        onError={(error: IDKitErrorCodes) => {
          console.error("Widget error:", error);
          setVerifying(false);
        }}
      />

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-red-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
              🐕
            </div>
            <div>
              <h1 className="font-bold text-lg text-white">Cerberus</h1>
              <p className="text-xs text-zinc-400">Human-in-the-Loop Agent Governance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <span className={`w-2 h-2 rounded-full ${worldIdVerified ? "bg-green-400" : "bg-yellow-400"}`}></span>
              World ID
              <span className={`w-2 h-2 rounded-full ${xmtpInitialized ? "bg-green-400" : "bg-yellow-400"}`}></span>
              XMTP
              <span className={`w-2 h-2 rounded-full ${lastTxHash ? "bg-green-400" : "bg-zinc-600"}`}></span>
              x402
            </div>
            <ConnectButton />
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isConnected ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-orange-500/20 via-red-500/20 to-purple-600/20 flex items-center justify-center mb-6">
              <span className="text-4xl">🐕</span>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">Welcome to Cerberus</h2>
            <p className="text-zinc-400 max-w-md mb-4">
              The 3-Headed Guardian for AI Agent Governance. Autonomous agents propose actions, but funds only move via x402 after World ID-verified human approval.
            </p>
            <p className="text-sm text-zinc-500 max-w-md mb-8">
              🔐 World ID • 💰 Coinbase x402 • 💬 XMTP Encryption
            </p>
            <ConnectButton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left Panel: Stats & Controls */}
            <div className="space-y-6">
              {/* World ID Verification Card */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>🔐</span> World ID
                  {worldIdVerified && <span className="text-xs text-green-400">✓ Verified</span>}
                </h3>
                {worldIdVerified ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-green-400">
                      <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                      <span className="text-sm font-medium">Verified Human Controller</span>
                    </div>
                    <p className="text-xs text-zinc-500">
                      Nullifier: {worldIdProof?.nullifier_hash.slice(0, 20)}...
                    </p>
                    <p className="text-xs text-zinc-500">
                      Backend verified via /api/verify
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-zinc-400">
                      Verify with World ID v4. Proof will be verified on backend via /api/verify.
                    </p>
                    <button
                      onClick={handleWorldIDVerify}
                      disabled={verifying}
                      className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      {verifying ? "Verifying..." : "Verify with World ID v4"}
                    </button>
                  </div>
                )}
              </div>

              {/* XMTP Status */}
              <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <span>💬</span> XMTP
                  {xmtpInitialized && <span className="text-xs text-green-400">✓ Connected</span>}
                </h3>
                <div className="space-y-3">
                  <div className={`flex items-center gap-2 ${xmtpInitialized ? "text-green-400" : "text-yellow-400"}`}>
                    <span className={`w-2 h-2 rounded-full ${xmtpInitialized ? "bg-green-400" : "bg-yellow-400"} ${xmtpInitialized ? "" : "animate-pulse"}`}></span>
                    <span className="text-sm font-medium">
                      {xmtpInitialized ? "Encrypted Messaging Active" : "Initializing..."}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    {xmtpInitialized 
                      ? "All agent communications are encrypted end-to-end via XMTP protocol."
                      : "Setting up XMTP client with your wallet..."}
                  </p>
                </div>
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
                <div className="mt-4 bg-gradient-to-r from-orange-500/10 via-red-500/10 to-purple-600/10 rounded-xl p-4 border border-orange-500/20">
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
                    <span className="text-xs text-green-400 font-normal">{xmtpInitialized ? "🔒 Encrypted" : "Connecting..."}</span>
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-zinc-400">
                    <span className={`w-2 h-2 rounded-full ${agentActive ? "bg-green-400 animate-pulse" : "bg-zinc-600"}`}></span>
                    {agentActive ? "Agent Active" : "Agent Standby"}
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
                      Connect wallet to start encrypted chat with your agent
                    </div>
                  )}
                </div>
              </div>

              {/* x402 Payment Status */}
              {paymentStatus !== "idle" && (
                <div className={`rounded-2xl p-4 border ${
                  paymentStatus === "complete" ? "bg-green-500/10 border-green-500/30" :
                  paymentStatus === "failed" ? "bg-red-500/10 border-red-500/30" :
                  "bg-blue-500/10 border-blue-500/30"
                }`}>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      paymentStatus === "complete" ? "bg-green-500/20 text-green-400" :
                      paymentStatus === "failed" ? "bg-red-500/20 text-red-400" :
                      "bg-blue-500/20 text-blue-400 animate-pulse"
                    }`}>
                      {paymentStatus === "complete" ? "✓" :
                       paymentStatus === "failed" ? "✕" :
                       "⟳"}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">
                        {paymentStatus === "checking" && "Checking x402 payment requirements..."}
                        {paymentStatus === "paying" && "Processing x402 payment via /api/x402/pay..."}
                        {paymentStatus === "complete" && "x402 payment complete!"}
                        {paymentStatus === "failed" && "x402 payment failed"}
                      </p>
                      <p className="text-xs text-zinc-400">
                        {paymentStatus === "checking" && "Verifying payment guard conditions..."}
                        {paymentStatus === "paying" && "Submitting to Base Sepolia via backend..."}
                        {paymentStatus === "complete" && `Tx: ${lastTxHash?.slice(0, 25)}...`}
                        {paymentStatus === "failed" && "Check console for error details"}
                      </p>
                    </div>
                  </div>
                </div>
              )}

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
                        {currentProposal.legitimacy === "verified" ? "✓ Verified Contract" : "⚠ High Risk"}
                      </span>
                      <h4 className="text-xl font-bold text-white">{currentProposal.title}</h4>
                      <p className="text-zinc-400 text-sm mt-1">{currentProposal.description}</p>
                      <p className="text-zinc-500 text-xs mt-2 font-mono">
                        Contract: {currentProposal.contractAddress}
                      </p>
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
                      disabled={isProcessing || !worldIdVerified}
                      className="flex-1 py-3 px-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      {isProcessing ? "Processing..." : 
                       !worldIdVerified ? "Verify World ID First" : 
                       "✅ Approve (x402)"}
                    </button>
                  </div>

                  {!worldIdVerified && (
                    <p className="text-center text-sm text-yellow-400 mt-3">
                      ⚠️ World ID verification required — prevents key compromise attacks
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
                  <p className="text-xs text-zinc-600 mt-2">Encrypted proposals will appear via XMTP</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-zinc-800 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center text-sm text-zinc-500">
          <p className="font-medium text-zinc-400">Built for AgentKit Hackathon 2025</p>
          <p className="mt-2">🐕 Cerberus — The 3-Headed Guardian</p>
          <p className="mt-1 text-xs">🔐 World ID v4 • 💰 Coinbase x402 • 💬 XMTP Encryption</p>
          <p className="mt-2 text-xs text-zinc-600">
            Backend APIs: /api/verify + /api/x402/pay • Demo on Base Sepolia
          </p>
        </div>
      </footer>
    </main>
  );
}
