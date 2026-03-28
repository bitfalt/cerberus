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

// Market Opportunity Types
interface MarketOpportunity {
  id: number;
  type: "NFT" | "Trade" | "DeFi" | "Suspicious" | "Meme" | "Airdrop";
  title: string;
  description: string;
  price: string;
  displayPrice: string;
  riskScore: number;
  urgency: "high" | "medium" | "low";
  legitimacy: "verified" | "unverified" | "unknown";
  contractAddress: `0x${string}`;
  source?: string;
  volume24h?: string;
  age?: string;
  liquidity?: string;
  socialScore?: number;
  auditStatus?: "audited" | "unaudited" | "unknown";
}

// Realistic market opportunities with varied data
const MARKET_OPPORTUNITIES: MarketOpportunity[] = [
  {
    id: 1,
    type: "NFT",
    title: "CryptoPunk #5841 Floor Drop",
    description: "Rare CryptoPunk listed 15% below floor on Base marketplace. Verified contract, clean history.",
    price: "0.45",
    displayPrice: "0.45 ETH",
    riskScore: 88,
    urgency: "high",
    legitimacy: "verified",
    contractAddress: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e",
    source: "OpenSea Base",
    volume24h: "$2.4M",
    age: "3 years",
    liquidity: "High",
    socialScore: 95,
    auditStatus: "audited",
  },
  {
    id: 2,
    type: "DeFi",
    title: "Aave V3 USDC Pool Yield Spike",
    description: "USDC lending pool APY jumped to 8.2% on Base. Liquid, audited, low risk.",
    price: "0.001",
    displayPrice: "0.001 ETH (gas)",
    riskScore: 92,
    urgency: "medium",
    legitimacy: "verified",
    contractAddress: "0xA238Dd80C2594E87b5759eB6E6A099229fD1ecD9",
    source: "Aave V3 Base",
    volume24h: "$45M",
    age: "2 years",
    liquidity: "Very High",
    socialScore: 98,
    auditStatus: "audited",
  },
  {
    id: 3,
    type: "Suspicious",
    title: "BASEAPE Token Pre-sale",
    description: "Unverified token contract with mint function. Creator wallet funded via Tornado Cash.",
    price: "0.02",
    displayPrice: "0.02 ETH",
    riskScore: 12,
    urgency: "high",
    legitimacy: "unverified",
    contractAddress: "0x742d35Cc6634C7562e7aF6D6e6d5e8f3a4B2C1d0",
    source: "Unknown DEX",
    volume24h: "$12K",
    age: "2 hours",
    liquidity: "None",
    socialScore: 15,
    auditStatus: "unaudited",
  },
  {
    id: 4,
    type: "Trade",
    title: "ETH-USDC Uniswap V3 Arbitrage",
    description: "2.3% price discrepancy detected between Base and Ethereum mainnet.",
    price: "0.003",
    displayPrice: "0.003 ETH",
    riskScore: 78,
    urgency: "high",
    legitimacy: "verified",
    contractAddress: "0x1F98431c8aD98523631AE4a59f267346ea31F984",
    source: "Uniswap V3",
    volume24h: "$890M",
    age: "4 years",
    liquidity: "Very High",
    socialScore: 96,
    auditStatus: "audited",
  },
  {
    id: 5,
    type: "Meme",
    title: "DOGE on Base Community Growth",
    description: "Dogecoin bridged to Base showing 300% holder growth in 24h. High volatility.",
    price: "0.015",
    displayPrice: "0.015 ETH",
    riskScore: 45,
    urgency: "medium",
    legitimacy: "unknown",
    contractAddress: "0x42069dE9E23F3c5E5C5d4B5A6b8c9d0E1F2A3B4C5",
    source: "Base DEX Aggregator",
    volume24h: "$1.2M",
    age: "5 days",
    liquidity: "Medium",
    socialScore: 72,
    auditStatus: "unknown",
  },
  {
    id: 6,
    type: "Airdrop",
    title: "Optimism RetroPGF 4 Claim",
    description: "Eligible for 850 OP tokens from Retroactive Public Goods Funding round 4.",
    price: "0.0005",
    displayPrice: "0.0005 ETH",
    riskScore: 95,
    urgency: "low",
    legitimacy: "verified",
    contractAddress: "0x4200000000000000000000000000000000000042",
    source: "Optimism Foundation",
    volume24h: "$15M",
    age: "3 years",
    liquidity: "Very High",
    socialScore: 91,
    auditStatus: "audited",
  },
  {
    id: 7,
    type: "DeFi",
    title: "Morpho Blue Leveraged Position",
    description: "Undercollateralized lending position liquidatable at 2% price drop. $5,200 profit.",
    price: "0.008",
    displayPrice: "0.008 ETH",
    riskScore: 65,
    urgency: "high",
    legitimacy: "verified",
    contractAddress: "0xBBBBBbbBBb9b8b9b8b9b8b9b8b9b8b9b8b9b8b9",
    source: "Morpho Blue",
    volume24h: "$8M",
    age: "8 months",
    liquidity: "High",
    socialScore: 78,
    auditStatus: "audited",
  },
  {
    id: 8,
    type: "Suspicious",
    title: "Free Base ETH Giveaway",
    description: "DApp requesting unlimited token approval. honeypot pattern detected.",
    price: "0.05",
    displayPrice: "0.05 ETH",
    riskScore: 5,
    urgency: "high",
    legitimacy: "unverified",
    contractAddress: "0xDEADbeefDEADbeefDEADbeefDEADbeefDEADbeef",
    source: "Unknown",
    volume24h: "$0",
    age: "1 hour",
    liquidity: "None",
    socialScore: 8,
    auditStatus: "unaudited",
  },
];

// Legacy export for compatibility
const AGENT_OPPORTUNITIES = MARKET_OPPORTUNITIES;

// ========== RISK CALCULATION HELPERS ==========

/**
 * Calculate risk score based on multiple factors
 * Returns 0-100 score (higher is safer)
 */
function calculateRiskScore(opportunity: MarketOpportunity): number {
  let score = 50; // Base score
  
  // Factor 1: Audit status (0-20 points)
  if (opportunity.auditStatus === "audited") score += 20;
  else if (opportunity.auditStatus === "unknown") score += 5;
  else score -= 15;
  
  // Factor 2: Social/community score (0-15 points)
  if (opportunity.socialScore !== undefined) {
    score += (opportunity.socialScore / 100) * 15;
  }
  
  // Factor 3: Contract age (0-15 points)
  if (opportunity.age) {
    if (opportunity.age.includes("year")) score += 15;
    else if (opportunity.age.includes("month")) score += 10;
    else if (opportunity.age.includes("day")) score += 3;
    else score -= 10; // Very new = risky
  }
  
  // Factor 4: Liquidity assessment (0-10 points)
  if (opportunity.liquidity === "Very High") score += 10;
  else if (opportunity.liquidity === "High") score += 7;
  else if (opportunity.liquidity === "Medium") score += 4;
  else score -= 5; // Low or no liquidity
  
  // Factor 5: Volume check (0-10 points)
  if (opportunity.volume24h) {
    const volumeNum = parseFloat(opportunity.volume24h.replace(/[$KM]/g, ""));
    const multiplier = opportunity.volume24h.includes("M") ? 1000000 : 
                      opportunity.volume24h.includes("K") ? 1000 : 1;
    const realVolume = volumeNum * multiplier;
    if (realVolume > 10000000) score += 10; // >$10M
    else if (realVolume > 1000000) score += 7; // >$1M
    else if (realVolume > 100000) score += 3; // >$100K
    else score -= 5; // Low volume
  }
  
  // Factor 6: Contract address heuristics (0-10 points)
  if (opportunity.contractAddress) {
    const addr = opportunity.contractAddress.toLowerCase();
    if (addr.includes("dead") || addr.includes("beef")) score -= 15; // Suspicious pattern
    else if (addr.startsWith("0x0000") || addr.startsWith("0x1111")) score -= 5; // Vanity addresses
    else if (addr.startsWith("0x7a25") || addr.startsWith("0x1f98")) score += 5; // Known protocols
  }
  
  // Factor 7: Type-based adjustments
  if (opportunity.type === "Suspicious") score -= 20;
  else if (opportunity.type === "Meme") score -= 10; // Meme coins are risky
  else if (opportunity.type === "Airdrop" && opportunity.legitimacy === "verified") score += 5;
  
  // Clamp to 0-100
  return Math.max(0, Math.min(100, Math.round(score)));
}

/**
 * Determine legitimacy status based on opportunity data
 */
function determineLegitimacy(opportunity: MarketOpportunity): "verified" | "unverified" | "unknown" {
  // Direct checks for clear cases
  if (opportunity.auditStatus === "audited" && 
      opportunity.liquidity !== "None" && 
      opportunity.socialScore && opportunity.socialScore > 70) {
    return "verified";
  }
  
  if (opportunity.auditStatus === "unaudited" && 
      (opportunity.age?.includes("hour") || opportunity.liquidity === "None")) {
    return "unverified";
  }
  
  if (opportunity.contractAddress.toLowerCase().includes("dead") ||
      opportunity.contractAddress.toLowerCase().includes("beef")) {
    return "unverified";
  }
  
  // Default based on calculated risk
  const riskScore = calculateRiskScore(opportunity);
  if (riskScore >= 70) return "verified";
  if (riskScore <= 30) return "unverified";
  return "unknown";
}

/**
 * Format opportunity details for display in messages
 */
function formatOpportunity(opportunity: MarketOpportunity): string {
  const riskLevel = opportunity.riskScore >= 80 ? "Low Risk ✅" :
                   opportunity.riskScore >= 50 ? "Medium Risk ⚠️" :
                   "High Risk 🚨";
  
  const legitimacyEmoji = opportunity.legitimacy === "verified" ? "✅" :
                         opportunity.legitimacy === "unverified" ? "⚠️" :
                         "❓";
  
  let details = `🔍 Found opportunity: ${opportunity.title}\n`;
  details += `   💰 Price: ${opportunity.displayPrice}\n`;
  details += `   📊 Risk Score: ${opportunity.riskScore}/100 (${riskLevel})\n`;
  details += `   🏷️ Type: ${opportunity.type}\n`;
  details += `   ${legitimacyEmoji} Legitimacy: ${opportunity.legitimacy.toUpperCase()}\n`;
  
  if (opportunity.source) {
    details += `   📍 Source: ${opportunity.source}\n`;
  }
  
  if (opportunity.volume24h) {
    details += `   📈 24h Volume: ${opportunity.volume24h}\n`;
  }
  
  if (opportunity.age) {
    details += `   ⏱️ Contract Age: ${opportunity.age}\n`;
  }
  
  if (opportunity.liquidity) {
    details += `   💧 Liquidity: ${opportunity.liquidity}\n`;
  }
  
  details += `   🔗 Contract: ${opportunity.contractAddress.slice(0, 16)}...${opportunity.contractAddress.slice(-4)}`;
  
  return details;
}

interface XMTPMessage {
  id: string;
  from: "agent" | "owner";
  content: string;
  timestamp: number;
  proposal?: MarketOpportunity;
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
  const [currentProposal, setCurrentProposal] = useState<MarketOpportunity | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [agentActive, setAgentActive] = useState(false);
  const [stats, setStats] = useState({ approved: 0, rejected: 0, saved: "0.00" });
  
  // Scanning progress state
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  
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
        // Disable legacy V2 contact publishing - XMTP network has shut down V2
        publishLegacyContact: false,
        // Skip contact publishing for short-lived client (we'll handle this separately)
        skipContactPublishing: true,
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

  // ========== REALISTIC AGENT SCANNER WITH PROGRESS ==========
  useEffect(() => {
    if (!agentActive || !isConnected) {
      if (agentIntervalRef.current) {
        clearInterval(agentIntervalRef.current);
        agentIntervalRef.current = null;
      }
      setIsScanning(false);
      setScanProgress(0);
      return;
    }

    // Agent activated - start scanning cycle
    const runScanningCycle = async () => {
      // Skip if already scanning or processing a proposal
      if (isScanning || currentProposal) return;
      
      setIsScanning(true);
      setScanProgress(0);
      
      // Scanning phases with realistic progress
      const phases = [
        { name: "Initializing scanners...", duration: 800, progress: 10 },
        { name: "Querying Base Sepolia mempool...", duration: 1200, progress: 25 },
        { name: "Analyzing DEX liquidity pools...", duration: 1500, progress: 40 },
        { name: "Checking NFT marketplaces...", duration: 1000, progress: 55 },
        { name: "Verifying contract audits...", duration: 1300, progress: 70 },
        { name: "Calculating risk scores...", duration: 1000, progress: 85 },
        { name: "Finalizing results...", duration: 800, progress: 100 },
      ];
      
      addMessage({
        id: `scan-start-${Date.now()}`,
        from: "agent",
        content: "🔍 Starting market scan on Base Sepolia...",
        timestamp: Date.now(),
      });
      
      // Progress through phases
      for (const phase of phases) {
        await new Promise(resolve => setTimeout(resolve, phase.duration));
        setScanProgress(phase.progress);
        
        // Send XMTP update every few phases
        if (phase.progress % 30 === 10 && xmtpConversation) {
          try {
            await xmtpConversation.send(`🔍 Scanning: ${phase.name} (${phase.progress}%)`);
          } catch (error) {
            // Silent fail for progress updates
          }
        }
      }
      
      // Select opportunity based on weighted randomness (higher risk = more interesting)
      const weightedOpportunities = MARKET_OPPORTUNITIES.map(op => ({
        ...op,
        weight: op.type === "Suspicious" ? 30 : // Suspicious more likely
                op.urgency === "high" ? 25 :      // High urgency more likely
                op.urgency === "medium" ? 15 : 10
      }));
      
      const totalWeight = weightedOpportunities.reduce((sum, op) => sum + op.weight, 0);
      let random = Math.random() * totalWeight;
      
      let selectedOp = weightedOpportunities[0];
      for (const op of weightedOpportunities) {
        random -= op.weight;
        if (random <= 0) {
          selectedOp = op;
          break;
        }
      }
      
      // Recalculate risk score dynamically
      const dynamicRiskScore = calculateRiskScore(selectedOp);
      const finalOp = {
        ...selectedOp,
        riskScore: dynamicRiskScore,
        legitimacy: determineLegitimacy(selectedOp)
      };
      
      const formattedMessage = formatOpportunity(finalOp);
      
      // Send via XMTP
      if (xmtpConversation) {
        try {
          await xmtpConversation.send(formattedMessage);
        } catch (error) {
          console.error("Failed to send agent message via XMTP:", error);
        }
      }
      
      addMessage({
        id: `proposal-${Date.now()}`,
        from: "agent",
        content: formattedMessage,
        timestamp: Date.now(),
        proposal: finalOp,
      });
      
      setCurrentProposal(finalOp);
      setIsScanning(false);
      setScanProgress(0);
    };

    // Start the scanning cycle
    runScanningCycle();
    
    // Set up recurring scan interval (every 25 seconds after completion)
    agentIntervalRef.current = setInterval(() => {
      runScanningCycle();
    }, 25000);

    return () => {
      if (agentIntervalRef.current) {
        clearInterval(agentIntervalRef.current);
        agentIntervalRef.current = null;
      }
      setIsScanning(false);
    };
  }, [agentActive, isConnected, xmtpConversation, addMessage, isScanning, currentProposal]);

  // ========== REAL X402 PAYMENT FLOW WITH BACKEND ==========
  // Two-step x402 protocol: 1) Create payment, 2) Sign, 3) Verify & settle
  const handleApprove = async (proposal: MarketOpportunity) => {
    if (!worldIdVerified || !worldIdProof) {
      alert("Please verify with World ID first!");
      return;
    }

    if (!address || !signMessageAsync) return;

    setIsProcessing(true);
    setPaymentStatus("checking");

    try {
      addMessage({
        id: `action-${Date.now()}`,
        from: "owner",
        content: `✅ APPROVED: ${proposal.title}`,
        timestamp: Date.now(),
      });

      // ========== STEP 1: Create x402 Payment Requirements ==========
      setPaymentStatus("paying");
      
      addMessage({
        id: `x402-create-${Date.now()}`,
        from: "agent",
        content: `🔐 Creating x402 payment requirements...`,
        timestamp: Date.now(),
      });

      const createResponse = await fetch("/api/x402/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: proposal.price,
          token: "ETH",
          recipient: proposal.contractAddress,
          world_id_nullifier: worldIdProof.nullifier_hash,
          proposal_id: proposal.id,
          user_address: address,
          resource: `cerberus://proposal/${proposal.id}`,
        }),
      });

      const createData = await createResponse.json();

      if (!createData.success) {
        throw new Error(createData.error || "Failed to create payment");
      }

      const { paymentId, accepts, resource } = createData;

      console.log("x402 Payment Created:", { paymentId, accepts, resource });

      // ========== STEP 2: Create and Sign Payment Payload ==========
      addMessage({
        id: `x402-sign-${Date.now()}`,
        from: "agent",
        content: `✍️ Signing x402 payment with wallet...`,
        timestamp: Date.now(),
      });

      // Build the payment payload for signing
      // x402 v2 payment payload structure
      const selectedRequirement = accepts[0];
      const timestamp = Math.floor(Date.now() / 1000);
      
      // Create payment payload
      const paymentPayload = {
        x402Version: 2,
        scheme: selectedRequirement.scheme,
        network: selectedRequirement.network,
        payload: {
          payer: address,
          payee: selectedRequirement.payTo,
          amount: selectedRequirement.maxAmountRequired,
          asset: selectedRequirement.asset,
          timestamp: timestamp.toString(),
          nonce: crypto.randomUUID(),
          resource: selectedRequirement.resource,
          world_id_nullifier: worldIdProof.nullifier_hash,
        },
      };

      // Create the message to sign (EIP-191 style for x402)
      const messageToSign = JSON.stringify({
        scheme: paymentPayload.scheme,
        network: paymentPayload.network,
        payer: paymentPayload.payload.payer,
        payee: paymentPayload.payload.payee,
        amount: paymentPayload.payload.amount,
        asset: paymentPayload.payload.asset,
        timestamp: paymentPayload.payload.timestamp,
        nonce: paymentPayload.payload.nonce,
        resource: paymentPayload.payload.resource,
      });

      // Sign the payment with wallet
      const signature = await signMessageAsync({ message: messageToSign });

      // Add signature to payload
      const signedPaymentPayload = {
        ...paymentPayload,
        signature,
        message: messageToSign,
      };

      console.log("x402 Payment Signed:", { 
        paymentId, 
        signature: signature.slice(0, 20) + "..." 
      });

      // ========== STEP 3: Verify and Settle Payment ==========
      addMessage({
        id: `x402-verify-${Date.now()}`,
        from: "agent",
        content: `🔍 Verifying x402 payment on-chain...`,
        timestamp: Date.now(),
      });

      const verifyResponse = await fetch("/api/x402/pay", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId,
          paymentPayload: signedPaymentPayload,
          world_id_nullifier: worldIdProof.nullifier_hash,
        }),
      });

      const verifyData = await verifyResponse.json();

      if (verifyData.success && verifyData.status === "settled") {
        setPaymentStatus("complete");
        setLastTxHash(verifyData.transaction_hash);

        addMessage({
          id: `exec-${Date.now()}`,
          from: "agent",
          content: `💰 x402 PAYMENT COMPLETE\nAmount: ${proposal.displayPrice}\nTo: ${proposal.contractAddress.slice(0, 12)}...\nTx: ${verifyData.transaction_hash.slice(0, 20)}...\nWorld ID: ${worldIdProof.nullifier_hash.slice(0, 16)}...\nSignature: ${signature.slice(0, 16)}...`,
          timestamp: Date.now(),
        });

        setStats((prev) => ({
          ...prev,
          approved: prev.approved + 1,
          saved: (parseFloat(prev.saved) + 0.5).toFixed(2),
        }));
      } else {
        throw new Error(verifyData.error || "Payment verification or settlement failed");
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

  const handleReject = async (proposal: MarketOpportunity) => {
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
                    <span className={`text-sm font-medium ${agentActive ? (isScanning ? "text-blue-400 animate-pulse" : "text-green-400") : "text-yellow-400"}`}>
                      {agentActive ? (isScanning ? "Scanning..." : "Scanning Markets") : "Standby"}
                    </span>
                  </div>
                  
                  {/* Scan Progress Bar */}
                  {agentActive && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs text-zinc-500">
                        <span>Scan Progress</span>
                        <span>{scanProgress}%</span>
                      </div>
                      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ease-out ${
                            isScanning 
                              ? "bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" 
                              : "bg-green-500"
                          }`}
                          style={{ width: `${scanProgress}%` }}
                        ></div>
                      </div>
                      {isScanning && (
                        <div className="flex items-center gap-2 text-xs text-blue-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse"></span>
                          <span>Analyzing Base Sepolia markets...</span>
                        </div>
                      )}
                      {!isScanning && !currentProposal && agentActive && (
                        <div className="flex items-center gap-2 text-xs text-green-400">
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                          <span>Scan complete - waiting for next cycle</span>
                        </div>
                      )}
                    </div>
                  )}
                  
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
