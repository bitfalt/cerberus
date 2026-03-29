'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useReadContract, useSignTypedData, useWalletClient, useWriteContract } from 'wagmi';
import { erc20Abi, formatEther, formatUnits, parseEther } from 'viem';
import { cerberusVaultAbi, cerberusVaultFactoryAbi } from '@/lib/contracts';
import { publicEnv } from '@/lib/public-env';
import { useCerberusXMTP } from '@/hooks/useCerberusXMTP';
import { useCerberusX402 } from '@/hooks/useCerberusX402';
import { WorldIdActionButton } from '@/components/WorldIdActionButton';
import { cerberusDomain, executionAuthorizationTypes, toExecutionTypedData, toWithdrawalTypedData, withdrawalAuthorizationTypes } from '@/lib/protocol/eip712';

const configuredPaymentNetworks = publicEnv.NEXT_PUBLIC_SUPPORTED_PAYMENT_NETWORKS.split(',')
  .map((value) => value.trim())
  .filter((value): value is 'base-sepolia' | 'world' => value === 'base-sepolia' || value === 'world');

const defaultPaymentNetwork = configuredPaymentNetworks.includes(publicEnv.NEXT_PUBLIC_DEFAULT_PAYMENT_NETWORK)
  ? publicEnv.NEXT_PUBLIC_DEFAULT_PAYMENT_NETWORK
  : configuredPaymentNetworks[0] ?? 'base-sepolia';

type ProposalRecord = {
  proposal: {
    proposalId: string;
    proposalHash?: string;
    opportunity: {
      network: 'base';
      source: string;
      targetRouter: `0x${string}`;
      amountIn: string;
      quotedAmountOut: string;
      minAmountOut: string;
      feeTier: number;
      quoteTimestamp: number;
      quoteHash: `0x${string}`;
    };
    paymentRequirement: { paymentNetwork: 'base-sepolia' | 'world'; paymentAsset: string; paymentAmount: string };
    action: {
      tokenIn: `0x${string}`;
      tokenOut: `0x${string}`;
      amountIn: string;
      minAmountOut: string;
      encodedCall: `0x${string}`;
      adapter: `0x${string}`;
    };
    risk: { score: number; confidence: number; analysisSummary: string };
    timing: { expiresAt: number };
    metadata: { policyVersion: string; opportunityChain: 'base'; executionChain: 'base-sepolia'; quoteSource: string; slippageBps: number };
  };
  proposalHash: `0x${string}`;
  wallet: string;
  vault: string;
  status: string;
  paymentId?: string;
  executionTxHash?: string;
};

type VaultStatus = {
  owner: string;
  recoveryAddress: string;
  paused: boolean;
  balances: { eth: string; usdc: string };
};

type HealthStatus = {
  ok: boolean;
  redis?: { ok: boolean };
  worker?: {
    seen: boolean;
    stale: boolean;
    ageMs: number | null;
    heartbeat?: {
      inboxId: string;
      walletAddress: string;
      env: string;
      timestamp: number;
    } | null;
  };
  xmtp?: {
    env: string;
    agentAddressConfigured: boolean;
  };
  error?: string;
};

type TabType = 'overview' | 'vault' | 'actions';

function currentTimestamp() {
  return Date.now();
}

// Inline SVG Icons
const Icons = {
  Shield: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  Activity: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2" />
    </svg>
  ),
  Database: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5V19A9 3 0 0 0 21 19V5" />
      <path d="M3 12A9 3 0 0 0 21 12" />
    </svg>
  ),
  Server: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  ),
  MessageSquare: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  ),
  Wallet: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
      <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
      <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
    </svg>
  ),
  Coins: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="8" r="6" />
      <path d="M18.09 10.37A6 6 0 1 1 10.34 18" />
      <path d="M7 6h1v4" />
      <path d="m16.71 13.88.7.71-2.82 2.82" />
    </svg>
  ),
  ArrowRightLeft: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16 3 4 4-4 4" />
      <path d="M20 7H4" />
      <path d="m8 21-4-4 4-4" />
      <path d="M4 17h16" />
    </svg>
  ),
  Scan: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  Globe: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  CreditCard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <line x1="2" x2="22" y1="10" y2="10" />
    </svg>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  XCircle: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m15 9-6 6" />
      <path d="m9 9 6 6" />
    </svg>
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  ChevronDown: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  ),
  ChevronUp: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18 15-6-6-6 6" />
    </svg>
  ),
  ExternalLink: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </svg>
  ),
  Clock: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  ),
  RefreshCw: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  Sparkles: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    </svg>
  ),
  LayoutGrid: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  ),
  Lock: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  ),
  Unlock: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 9.9-1" />
    </svg>
  ),
  LayoutDashboard: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" />
      <rect width="7" height="5" x="14" y="3" rx="1" />
      <rect width="7" height="9" x="14" y="12" rx="1" />
      <rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  Vault: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="M12 12h.01" />
      <path d="M8 12h.01" />
      <path d="M16 12h.01" />
    </svg>
  ),
  Zap: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  ),
  TrendingUp: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
};

// Skeleton Components
function SkeletonCard() {
  return (
    <div className="glass-panel p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="skeleton w-10 h-10 rounded-xl" />
        <div className="space-y-2 flex-1">
          <div className="skeleton w-1/3 h-4 rounded" />
          <div className="skeleton w-1/2 h-3 rounded" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="skeleton h-16 rounded-xl" />
        <div className="skeleton h-16 rounded-xl" />
      </div>
      <div className="skeleton h-10 rounded-xl" />
    </div>
  );
}

function SkeletonMetric() {
  return (
    <div className="glass-panel p-4 space-y-2">
      <div className="skeleton w-16 h-3 rounded" />
      <div className="skeleton w-24 h-6 rounded" />
    </div>
  );
}

// Status Badge Component
function StatusBadge({ status, type = 'default' }: { status: string; type?: 'default' | 'success' | 'warning' | 'error' | 'info' }) {
  const variants = {
    default: 'badge-slate',
    success: 'badge-green',
    warning: 'badge-amber',
    error: 'badge-rose',
    info: 'badge-blue',
  };

  const icons = {
    default: null,
    success: <Icons.CheckCircle className="w-3 h-3" />,
    warning: <Icons.AlertTriangle className="w-3 h-3" />,
    error: <Icons.XCircle className="w-3 h-3" />,
    info: <Icons.Activity className="w-3 h-3" />,
  };

  return (
    <span className={`badge ${variants[type]}`}>
      {icons[type]}
      {status}
    </span>
  );
}

// Section Header Component
function SectionHeader({ 
  icon: Icon, 
  title, 
  description, 
  action,
  variant = 'default'
}: { 
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'blue' | 'green' | 'amber' | 'rose' | 'violet';
}) {
  const iconVariants = {
    default: 'icon-container',
    blue: 'icon-container-blue',
    green: 'icon-container-green',
    amber: 'icon-container-amber',
    rose: 'icon-container-rose',
    violet: 'icon-container-violet',
  };

  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        <div className={iconVariants[variant]}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h2 className="section-title">{title}</h2>
          {description && <p className="section-description mt-0.5">{description}</p>}
        </div>
      </div>
      {action && <div className="flex-shrink-0">{action}</div>}
    </div>
  );
}

// Metric Card Component
function MetricCard({ label, value, icon: Icon, loading = false, variant = 'default' }: { label: string; value: string; icon?: React.ComponentType<{ className?: string }>; loading?: boolean; variant?: 'default' | 'blue' | 'green' }) {
  if (loading) return <SkeletonMetric />;

  const valueClasses = {
    default: 'text-slate-100',
    blue: 'text-sky-400',
    green: 'text-emerald-400',
  };

  return (
    <div className="glass-panel glass-elevated p-4 hover-lift transition-all duration-200">
      <div className="flex items-center gap-2 mb-2">
        {Icon && <Icon className="w-4 h-4 text-slate-500" />}
        <p className="text-[11px] font-medium uppercase tracking-wider text-slate-500">{label}</p>
      </div>
      <p className={`text-lg font-semibold ${valueClasses[variant]}`}>{value}</p>
    </div>
  );
}

// Empty State Component
function EmptyState({ icon: Icon, title, description, action }: { icon: React.ComponentType<{ className?: string }>; title: string; description: string; action?: React.ReactNode }) {
  return (
    <div className="glass-panel border-dashed border-slate-700/50 p-10 text-center">
      <div className="icon-container mx-auto mb-4">
        <Icon className="w-6 h-6 text-slate-500" />
      </div>
      <h3 className="text-lg font-medium text-slate-300 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">{description}</p>
      {action}
    </div>
  );
}

// Health Status Indicator
function HealthIndicator({ label, status }: { label: string; status: 'online' | 'stale' | 'offline' | 'unknown' }) {
  const variants = {
    online: { dot: 'bg-emerald-500', bg: 'glass-green', text: 'text-emerald-400' },
    stale: { dot: 'bg-amber-500', bg: 'glass-amber', text: 'text-amber-400' },
    offline: { dot: 'bg-rose-500', bg: 'glass-rose', text: 'text-rose-400' },
    unknown: { dot: 'bg-slate-500', bg: '', text: 'text-slate-500' },
  };

  const v = variants[status];

  return (
    <div className={`glass-panel ${v.bg} px-3 py-2 flex items-center gap-2`}>
      <span className={`w-2 h-2 rounded-full ${v.dot} ${status === 'online' ? 'pulse-dot' : ''}`} />
      <span className={`text-xs font-medium ${v.text}`}>{label}</span>
    </div>
  );
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [recoveryAddress, setRecoveryAddress] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState('0.01');
  const [withdrawAmount, setWithdrawAmount] = useState('0.001');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [bootstrapStatus, setBootstrapStatus] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [verificationSignals, setVerificationSignals] = useState<Record<string, string>>({});
  const [actionNonce, setActionNonce] = useState<Record<string, string>>({});
  const [recoverySignalHash, setRecoverySignalHash] = useState<string | null>(null);
  const [withdrawSignalHash, setWithdrawSignalHash] = useState<string | null>(null);
  const [withdrawNonce, setWithdrawNonce] = useState<string>(() => crypto.randomUUID());
  const [recoveryNonce, setRecoveryNonce] = useState<string>(() => crypto.randomUUID());
  const [expandedProposals, setExpandedProposals] = useState<Set<string>>(new Set());
  const [loadingProposals, setLoadingProposals] = useState(true);
  const [loadingVault, setLoadingVault] = useState(true);

  const xmtp = useCerberusXMTP();
  const x402 = useCerberusX402();

  const { data: vaultAddress, refetch: refetchVaultAddress } = useReadContract({
    address: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_VAULT_FACTORY as `0x${string}`,
    abi: cerberusVaultFactoryAbi,
    functionName: 'vaultByOwner',
    args: [address as `0x${string}`],
    query: {
      enabled: Boolean(address),
      refetchInterval: 10_000,
    },
  });

  const { data: userUsdcBalance } = useReadContract({
    address: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC as `0x${string}` | undefined,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address as `0x${string}`] : undefined,
    query: {
      enabled: Boolean(address && publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC),
      refetchInterval: 15_000,
    },
  });

  const currentVaultAddress = vaultAddress as `0x${string}` | undefined;
  const effectiveRecoveryAddress = recoveryAddress || vaultStatus?.recoveryAddress || '';

  const activeVault = useMemo<`0x${string}` | null>(() => {
    if (!currentVaultAddress || currentVaultAddress === '0x0000000000000000000000000000000000000000') {
      return null;
    }
    return currentVaultAddress;
  }, [currentVaultAddress]);

  const signTypedData = signTypedDataAsync as unknown as (args: {
    domain: Record<string, unknown>;
    types: Record<string, unknown>;
    primaryType: string;
    message: Record<string, unknown>;
  }) => Promise<`0x${string}`>;

  const refreshProposals = useCallback(async () => {
    if (!address) return;
    setLoadingProposals(true);
    const response = await fetch(`/api/proposals?wallet=${address}`);
    const payload = await response.json();
    if (response.ok) {
      setProposals(payload.proposals ?? []);
    }
    setLoadingProposals(false);
  }, [address]);

  const refreshVaultStatus = useCallback(async () => {
    if (!activeVault) {
      setLoadingVault(false);
      return;
    }
    setLoadingVault(true);
    const response = await fetch(`/api/vault/${activeVault}/status`);
    const payload = await response.json();
    if (response.ok) {
      setVaultStatus(payload);
    }
    setLoadingVault(false);
  }, [activeVault]);

  const refreshHealthStatus = useCallback(async () => {
    const response = await fetch('/api/health');
    const payload = await response.json();
    setHealthStatus(payload);
  }, []);

  useEffect(() => {
    if (!address) return;
    const timeout = window.setTimeout(() => {
      void refreshProposals();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [address, refreshProposals]);

  useEffect(() => {
    if (!activeVault) return;
    const timeout = window.setTimeout(() => {
      void refreshVaultStatus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [activeVault, refreshVaultStatus]);

  useEffect(() => {
    if (!vaultStatus?.recoveryAddress) {
      return;
    }
    if (recoveryAddress && recoveryAddress.toLowerCase() === vaultStatus.recoveryAddress.toLowerCase()) {
      return;
    }
    if (!recoveryAddress) {
      setRecoveryAddress(vaultStatus.recoveryAddress);
    }
  }, [vaultStatus?.recoveryAddress, recoveryAddress]);

  useEffect(() => {
    if (!address) return;
    const timer = window.setInterval(() => {
      void refreshProposals();
      void refreshVaultStatus();
      void refreshHealthStatus();
      void xmtp.refreshMessages();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [address, activeVault, refreshHealthStatus, refreshProposals, refreshVaultStatus, xmtp]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void refreshHealthStatus();
    }, 0);
    return () => window.clearTimeout(timeout);
  }, [refreshHealthStatus]);

  const toggleProposal = (id: string) => {
    setExpandedProposals(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const getProposalStatusType = (status: string): 'default' | 'success' | 'warning' | 'error' | 'info' => {
    const s = status.toLowerCase();
    if (s.includes('executed') || s.includes('confirmed')) return 'success';
    if (s.includes('approved')) return 'warning';
    if (s.includes('rejected') || s.includes('failed')) return 'error';
    if (s.includes('pending') || s.includes('scanning')) return 'info';
    return 'default';
  };

  const createVault = async () => {
    if (!recoveryAddress) {
      setBootstrapStatus('Set a recovery address before creating a vault.');
      return;
    }
    const hash = await writeContractAsync({
      address: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_VAULT_FACTORY as `0x${string}`,
      abi: cerberusVaultFactoryAbi,
      functionName: 'createVault',
      args: [recoveryAddress as `0x${string}`],
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }
    await refetchVaultAddress();
    setBootstrapStatus('Vault deployed. Bootstrap permissions next.');
  };

  const bootstrapVault = async () => {
    if (!activeVault || !address) return;
    setBootstrapStatus('Bootstrapping vault permissions...');
    const response = await fetch(`/api/vault/${activeVault}/bootstrap`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ owner: address }),
    });
    const payload = await response.json();
    setBootstrapStatus(response.ok ? 'Vault bootstrapped successfully.' : payload.error ?? 'Vault bootstrap failed');
    if (response.ok) {
      await refreshVaultStatus();
    }
  };

  const fundVault = async () => {
    if (!walletClient || !activeVault || !walletClient.account) return;
    const hash = await walletClient.sendTransaction({
      account: walletClient.account,
      to: activeVault,
      value: parseEther(depositAmount),
    });
    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash });
    }
    await refreshVaultStatus();
  };

  const connectXmtp = async () => {
    try {
      await xmtp.connect();
    } catch {
      // surfaced in hook state
    }
  };

  const triggerScan = async () => {
    if (!address || !activeVault) return;
    setScanStatus('Scanning Base Mainnet for live quote-backed opportunities...');
    const response = await fetch('/api/agent/scan', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wallet: address,
        vault: activeVault,
        paymentNetwork: defaultPaymentNetwork,
        adapter: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER,
        tokenIn: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_USDC,
        tokenOut: '0x0000000000000000000000000000000000000000',
        router: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_SWAP_ADAPTER,
      }),
    });
    const payload = await response.json();
    setScanStatus(response.ok ? `Scan queued. Request ${payload.scanRequest?.scanRequestId ?? 'created'} is now waiting for the worker.` : payload.error ?? 'Scan failed');
    await refreshProposals();
  };

  const approveProposal = async (proposal: ProposalRecord) => {
    if (!address) return;
    const nonce = crypto.randomUUID();
    setActionNonce((current) => ({ ...current, [proposal.proposal.proposalId]: nonce }));

    const messageId = await xmtp.sendJsonMessage({
      type: 'APPROVAL',
      version: 1,
      proposalId: proposal.proposal.proposalId,
      proposalHash: proposal.proposalHash,
      vault: proposal.vault,
      wallet: proposal.wallet,
      timestamp: currentTimestamp(),
      approvalScope: 'execute',
    });

    setScanStatus(`XMTP approval sent as ${messageId}. Waiting for the worker to mark the proposal approved.`);
    window.setTimeout(() => {
      void refreshProposals();
    }, 3000);
  };

  const rejectProposal = async (proposal: ProposalRecord) => {
    if (!address) return;
    const reason = 'Rejected from governance console';
    await xmtp.sendJsonMessage({
      type: 'REJECTION',
      version: 1,
      proposalId: proposal.proposal.proposalId,
      proposalHash: proposal.proposalHash,
      vault: proposal.vault,
      wallet: proposal.wallet,
      timestamp: currentTimestamp(),
      reason,
    });

    setScanStatus('XMTP rejection sent. Waiting for the worker to close the proposal.');
    window.setTimeout(() => {
      void refreshProposals();
    }, 3000);
  };

  const settlePayment = async (proposal: ProposalRecord) => {
    if (!address || !activeVault) return;
    try {
      const requiredAmount = BigInt(proposal.proposal.paymentRequirement.paymentAmount);
      const availableUsdc = userUsdcBalance ? BigInt(userUsdcBalance) : BigInt(0);
      if (availableUsdc < requiredAmount) {
        throw new Error(
          `Insufficient Base Sepolia USDC in the connected wallet. Required ${formatUnits(requiredAmount, 6)} USDC, available ${formatUnits(availableUsdc, 6)} USDC.`
        );
      }

      setScanStatus('Creating x402 payment payload...');
      await x402.payForProposal({
        proposalId: proposal.proposal.proposalId,
        wallet: address,
        vault: activeVault,
        proposalHash: proposal.proposalHash,
        paymentNetwork: proposal.proposal.paymentRequirement.paymentNetwork,
        asset: proposal.proposal.paymentRequirement.paymentAsset,
        amount: proposal.proposal.paymentRequirement.paymentAmount,
      });
      setScanStatus('x402 fee paid. Proposal is ready for authorization.');
      await refreshProposals();
    } catch (error) {
      setScanStatus(error instanceof Error ? error.message : 'Failed to pay x402 authorization fee');
    }
  };

  const executeProposal = async (proposal: ProposalRecord) => {
    if (!address || !activeVault) return;
    const nonce = actionNonce[proposal.proposal.proposalId] ?? crypto.randomUUID();
    const signalHash = verificationSignals[proposal.proposal.proposalId];
    if (!signalHash) {
      throw new Error('World ID verification required before execution');
    }

    const authResponse = await fetch(`/api/proposals/${proposal.proposal.proposalId}/authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wallet: address,
        vault: activeVault,
        nonce,
        signalHash,
      }),
    });
    const authPayload = await authResponse.json();
    if (!authResponse.ok) {
      throw new Error(authPayload.error ?? 'Failed to authorize proposal');
    }

    const typed = toExecutionTypedData(authPayload.authorization);
    const ownerSignature = await signTypedData({
      domain: cerberusDomain(84532, activeVault) as never,
      types: executionAuthorizationTypes as never,
      primaryType: typed.primaryType as never,
      message: typed.message as never,
    });

    const txHash = await writeContractAsync({
      address: activeVault,
      abi: cerberusVaultAbi,
      functionName: 'executeAuthorized',
      args: [authPayload.authorization, ownerSignature, authPayload.cerberusSignature, proposal.proposal.action.encodedCall],
    });

    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }

    await fetch(`/api/proposals/${proposal.proposal.proposalId}/executed`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ txHash }),
    });

    await xmtp.sendJsonMessage({
      type: 'EXECUTION_CONFIRMED',
      version: 1,
      proposalId: proposal.proposal.proposalId,
      proposalHash: proposal.proposalHash,
      vault: proposal.vault,
      wallet: proposal.wallet,
      timestamp: currentTimestamp(),
      txHash,
    });

    await refreshProposals();
    await refreshVaultStatus();
  };

  const withdrawFromVault = async () => {
    if (!address || !activeVault) return;
    if (!withdrawSignalHash) {
      throw new Error('World ID verification is required for withdrawals');
    }

    const response = await fetch(`/api/proposals/manual-withdraw/withdraw-authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wallet: address,
        vault: activeVault,
        token: '0x0000000000000000000000000000000000000000',
        to: withdrawRecipient || address,
        amount: parseEther(withdrawAmount).toString(),
        nonce: withdrawNonce,
        signalHash: withdrawSignalHash,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'Failed to authorize withdrawal');
    }

    const typed = toWithdrawalTypedData(payload.authorization);
    const ownerSignature = await signTypedData({
      domain: cerberusDomain(84532, activeVault) as never,
      types: withdrawalAuthorizationTypes as never,
      primaryType: typed.primaryType as never,
      message: typed.message as never,
    });

    const txHash = await writeContractAsync({
      address: activeVault,
      abi: cerberusVaultAbi,
      functionName: 'withdrawAuthorized',
      args: [payload.authorization, ownerSignature, payload.cerberusSignature],
    });

    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }
    setWithdrawSignalHash(null);
    setWithdrawNonce(crypto.randomUUID());
    await refreshVaultStatus();
  };

  const requestRecovery = async () => {
    if (!address || !activeVault || !effectiveRecoveryAddress || !recoverySignalHash) return;
    const response = await fetch(`/api/vault/${activeVault}/recovery-authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wallet: address,
        recoveryAddress: effectiveRecoveryAddress,
        nonce: recoveryNonce,
        signalHash: recoverySignalHash,
      }),
    });
    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'Failed to authorize recovery');
    }

    const txHash = await writeContractAsync({
      address: activeVault,
      abi: cerberusVaultAbi,
      functionName: 'requestRecovery',
      args: [payload.authorization, payload.cerberusSignature],
    });

    if (publicClient) {
      await publicClient.waitForTransactionReceipt({ hash: txHash });
    }
    await xmtp.sendJsonMessage({
      type: 'RECOVERY_REQUESTED',
      version: 1,
      vault: activeVault,
      wallet: address,
      timestamp: currentTimestamp(),
    });
    setRecoverySignalHash(null);
    setRecoveryNonce(crypto.randomUUID());
  };

  // Tab configuration
  const tabs = [
    { id: 'overview' as TabType, label: 'Overview', icon: Icons.LayoutDashboard },
    { id: 'vault' as TabType, label: 'Vault', icon: Icons.Vault },
    { id: 'actions' as TabType, label: 'Actions', icon: Icons.Zap },
  ];

  return (
    <main className="min-h-screen pb-12">
      {/* Animated Background Orbs */}
      <div className="animated-bg-orb animated-bg-orb-1" />
      <div className="animated-bg-orb animated-bg-orb-2" />
      <div className="animated-bg-orb animated-bg-orb-3" />

      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-sky-950/30 via-slate-950/90 to-slate-950" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(14,165,233,0.12),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_60%,rgba(139,92,246,0.06),transparent_40%)]" />
        
        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="glass-panel glass-elevated glass-blue p-6 sm:p-8 glow-blue">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="max-w-2xl space-y-4">
                <div className="flex items-center gap-3">
                  <div className="icon-container-blue">
                    <Icons.Shield className="w-5 h-5" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-widest text-sky-400">
                    Cerberus Governance Console
                  </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white tracking-tight leading-tight">
                  Real Base market discovery
                  <span className="block gradient-text">with governed execution</span>
                </h1>
                <p className="text-base text-slate-400 max-w-xl leading-relaxed">
                  Cerberus scans real Base Mainnet liquidity for opportunities, then runs the approval, 
                  World ID, x402, and governed vault flow safely on Base Sepolia.
                </p>
              </div>
              
              <div className="flex flex-col items-start gap-4">
                <ConnectButton />
                <div className="flex flex-wrap gap-2">
                  <span className="badge badge-blue">
                    <Icons.Globe className="w-3 h-3" />
                    Base → Sepolia
                  </span>
                  <span className="badge badge-slate">
                    <Icons.CreditCard className="w-3 h-3" />
                    {defaultPaymentNetwork}
                  </span>
                  <span className="badge badge-slate">
                    <Icons.Globe className="w-3 h-3" />
                    World ID
                  </span>
                  <span className={`badge ${healthStatus?.worker?.seen && !healthStatus?.worker?.stale ? 'badge-green' : healthStatus?.worker?.stale ? 'badge-amber' : 'badge-rose'}`}>
                    <Icons.Server className="w-3 h-3" />
                    {healthStatus?.worker?.seen ? (healthStatus.worker.stale ? 'Worker Stale' : 'Worker Online') : 'Worker Offline'}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 overflow-x-hidden">
        {!isConnected ? (
          <EmptyState
            icon={Icons.Wallet}
            title="Connect Your Wallet"
            description="Connect a wallet to create a governed vault, link to the XMTP agent, and run the full World ID + x402 + on-chain authorization flow."
          />
        ) : (
          <div className="main-layout">
            {/* Left Sidebar with Tabs */}
            <section className="space-y-4">
              {/* Tab Navigation */}
              <div className="tab-container">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="tab-content active">
                {activeTab === 'overview' && (
                  <div className="space-y-4 fade-in">
                    {/* System Health */}
                    <div className="glass-panel glass-blue p-5">
                      <SectionHeader
                        icon={Icons.Activity}
                        title="System Health"
                        description="Real-time infrastructure monitoring"
                        variant="blue"
                      />
                      
                      <div className="card-grid-3 gap-2 mb-4">
                        <HealthIndicator 
                          label="Redis" 
                          status={healthStatus?.redis?.ok ? 'online' : healthStatus?.redis ? 'offline' : 'unknown'} 
                        />
                        <HealthIndicator 
                          label="Worker" 
                          status={healthStatus?.worker?.seen ? (healthStatus.worker.stale ? 'stale' : 'online') : 'offline'} 
                        />
                        <HealthIndicator 
                          label="XMTP" 
                          status={healthStatus?.xmtp?.env ? 'online' : 'unknown'} 
                        />
                      </div>

                      {healthStatus?.worker?.heartbeat && (
                        <div className="glass-panel glass-elevated p-3 text-xs space-y-1.5">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Icons.MessageSquare className="w-3 h-3" />
                            <span className="font-mono text-slate-400 truncate">{healthStatus.worker.heartbeat.inboxId}</span>
                          </div>
                          <div className="flex items-center gap-2 text-slate-500">
                            <Icons.Clock className="w-3 h-3" />
                            <span>Last: {new Date(healthStatus.worker.heartbeat.timestamp).toLocaleTimeString()}</span>
                          </div>
                        </div>
                      )}

                      {healthStatus?.error && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-rose-400">
                          <Icons.AlertTriangle className="w-4 h-4" />
                          {healthStatus.error}
                        </div>
                      )}
                    </div>

                    {/* Treasury Overview */}
                    <div className="glass-panel p-5">
                      <SectionHeader
                        icon={Icons.Coins}
                        title="Treasury"
                        description="Vault balances and funding"
                        variant="default"
                      />
                      
                      <div className="card-grid-2 gap-3 mb-4">
                        <MetricCard 
                          label="ETH Balance" 
                          value={vaultStatus?.balances.eth ?? '0.0'} 
                          icon={Icons.Coins}
                          loading={loadingVault}
                          variant="blue"
                        />
                        <MetricCard 
                          label="USDC Balance" 
                          value={vaultStatus?.balances.usdc ?? '0.0'} 
                          icon={Icons.Coins}
                          loading={loadingVault}
                          variant="green"
                        />
                      </div>

                      <div className="glass-panel glass-elevated p-3 text-xs space-y-2">
                        <div className="info-row">
                          <span className="info-row-label">Connected Wallet USDC</span>
                          <span className="text-slate-300">{formatUnits(BigInt(userUsdcBalance ?? BigInt(0)), 6)} USDC</span>
                        </div>
                        <div className="text-slate-500 text-[10px] leading-tight">
                          x402 fees are paid by the connected wallet. Fund with Base Sepolia USDC.
                        </div>
                      </div>
                    </div>

                    {/* XMTP Status */}
                    <div className="glass-panel glass-violet p-5">
                      <SectionHeader
                        icon={Icons.MessageSquare}
                        title="XMTP Control"
                        description="Connect to the persistent agent inbox"
                        variant="violet"
                      />
                      
                      <button 
                        onClick={connectXmtp} 
                        className={`glass-button w-full ${xmtp.client ? 'glass-button-success' : 'glass-button-primary'}`}
                      >
                        {xmtp.client ? (
                          <>
                            <Icons.CheckCircle className="w-4 h-4" />
                            XMTP Connected
                          </>
                        ) : (
                          <>
                            <Icons.MessageSquare className="w-4 h-4" />
                            Connect XMTP
                          </>
                        )}
                      </button>

                      {xmtp.error && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-rose-400">
                          <Icons.AlertTriangle className="w-4 h-4" />
                          {xmtp.error}
                        </div>
                      )}

                      <div className="mt-4 glass-panel glass-elevated p-3 space-y-2 text-xs">
                        <div className="info-row">
                          <span className="info-row-label">Agent</span>
                          <span className="info-row-value">{xmtp.agentAddress}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-row-label">Reachable</span>
                          <span className={`${xmtp.agentReachable ? 'text-emerald-400' : xmtp.agentReachable === null ? 'text-slate-500' : 'text-rose-400'}`}>
                            {xmtp.agentReachable === null ? 'Unknown' : xmtp.agentReachable ? 'Yes' : 'No'}
                          </span>
                        </div>
                        <div className="info-row">
                          <span className="info-row-label">Messages</span>
                          <span className="badge badge-blue">{xmtp.messages.length}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'vault' && (
                  <div className="space-y-4 fade-in">
                    {/* Vault Setup */}
                    <div className="glass-panel p-5">
                      <SectionHeader
                        icon={Icons.Lock}
                        title="Vault Setup"
                        description="Deploy one governed vault per owner"
                        variant="default"
                      />
                      
                      <div className="space-y-3">
                        <input
                          value={recoveryAddress}
                          onChange={(e) => setRecoveryAddress(e.target.value)}
                          placeholder="Recovery address (0x...)"
                          className="glass-input"
                        />
                        
                        <button 
                          onClick={createVault} 
                          disabled={!!activeVault}
                          className={`glass-button w-full ${activeVault ? 'glass-button-success' : 'glass-button-primary'}`}
                        >
                          {activeVault ? (
                            <>
                              <Icons.CheckCircle className="w-4 h-4" />
                              Vault Deployed
                            </>
                          ) : (
                            <>
                              <Icons.Shield className="w-4 h-4" />
                              Create Governed Vault
                            </>
                          )}
                        </button>
                        
                        {activeVault && (
                          <button 
                            onClick={bootstrapVault} 
                            className="glass-button w-full"
                          >
                            <Icons.Sparkles className="w-4 h-4" />
                            Bootstrap Allowlists
                          </button>
                        )}
                        
                        {bootstrapStatus && (
                          <div className="flex items-center gap-2 text-sm text-sky-400 p-2 rounded-lg bg-sky-950/30 border border-sky-500/20">
                            <Icons.Activity className="w-4 h-4" />
                            {bootstrapStatus}
                          </div>
                        )}
                      </div>

                      <div className="mt-4 glass-panel glass-elevated p-3">
                        <div className="info-row">
                          <span className="info-row-label">Vault Address</span>
                        </div>
                        <p className="font-mono text-sm text-slate-300 break-all mt-1">
                          {activeVault || 'Not deployed yet'}
                        </p>
                      </div>
                    </div>

                    {/* Funding */}
                    <div className="glass-panel glass-blue p-5">
                      <SectionHeader
                        icon={Icons.Wallet}
                        title="Fund Vault"
                        description="Add ETH to your governed vault"
                        variant="blue"
                      />
                      
                      <div className="space-y-3">
                        <input
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(e.target.value)}
                          placeholder="Amount in ETH"
                          className="glass-input"
                        />
                        <button 
                          onClick={fundVault} 
                          disabled={!activeVault}
                          className="glass-button w-full glass-button-primary"
                        >
                          <Icons.Wallet className="w-4 h-4" />
                          Fund Vault
                        </button>
                      </div>
                    </div>

                    {/* Vault Status */}
                    <div className="glass-panel p-5">
                      <SectionHeader
                        icon={Icons.Database}
                        title="Vault Status"
                        description="Current configuration and state"
                        variant="default"
                      />
                      
                      <div className="glass-panel glass-elevated p-3 space-y-2 text-xs">
                        <div className="info-row">
                          <span className="info-row-label">Owner</span>
                          <span className="info-row-value">{vaultStatus?.owner ?? '—'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-row-label">Recovery</span>
                          <span className="info-row-value">{vaultStatus?.recoveryAddress ?? '—'}</span>
                        </div>
                        <div className="info-row">
                          <span className="info-row-label">Status</span>
                          <span className={`badge ${vaultStatus?.paused ? 'badge-rose' : 'badge-green'}`}>
                            {vaultStatus?.paused ? 'Paused' : 'Active'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'actions' && (
                  <div className="space-y-4 fade-in">
                    {/* Manual Withdrawal */}
                    <div className="glass-panel glass-amber p-5">
                      <SectionHeader
                        icon={Icons.Unlock}
                        title="Manual Withdrawal"
                        description="Withdrawals require World ID + dual signatures"
                        variant="amber"
                      />
                      
                      <div className="space-y-3">
                        <input
                          value={withdrawRecipient}
                          onChange={(e) => setWithdrawRecipient(e.target.value)}
                          placeholder="Recipient (defaults to owner)"
                          className="glass-input"
                        />
                        <input
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Amount in ETH"
                          className="glass-input"
                        />
                        {address && activeVault && (
                          <WorldIdActionButton
                            actionType="withdraw"
                            wallet={address}
                            vault={activeVault}
                            nonce={withdrawNonce}
                            onVerified={({ signalHash }) => setWithdrawSignalHash(signalHash)}
                          />
                        )}
                        <button 
                          onClick={withdrawFromVault} 
                          disabled={!activeVault || !withdrawSignalHash}
                          className="glass-button w-full glass-button-warning"
                        >
                          <Icons.Unlock className="w-4 h-4" />
                          Execute Withdrawal
                        </button>
                      </div>
                    </div>

                    {/* Recovery Path */}
                    <div className="glass-panel glass-rose p-5">
                      <SectionHeader
                        icon={Icons.Shield}
                        title="Recovery Path"
                        description="Recovery requires pre-registered address"
                        variant="rose"
                      />
                      
                {address && activeVault && effectiveRecoveryAddress ? (
                  <div className="space-y-3">
                    <WorldIdActionButton
                      actionType="recover"
                      wallet={address}
                      vault={activeVault}
                      nonce={recoveryNonce}
                      recoveryAddress={effectiveRecoveryAddress}
                      onVerified={({ signalHash }) => setRecoverySignalHash(signalHash)}
                    />
                          <button 
                            onClick={requestRecovery} 
                            disabled={!recoverySignalHash}
                            className="glass-button w-full glass-button-warning"
                          >
                            <Icons.Shield className="w-4 h-4" />
                            Request Recovery
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 text-sm text-slate-500 p-3 rounded-xl bg-slate-950/50 border border-slate-800">
                          <Icons.AlertTriangle className="w-4 h-4 text-amber-500" />
                          Set a recovery address first in Vault tab
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Main Content */}
            <section className="space-y-5 min-w-0">
              {/* Agent Proposals Header */}
              <div className="glass-panel p-5">
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="icon-container-blue">
                      <Icons.Scan className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="section-title">Agent Proposals</h2>
                      <p className="section-description">
                        Live Base Mainnet opportunities queued for execution
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button 
                      onClick={xmtp.refreshMessages}
                      className="glass-button"
                      title="Refresh XMTP Messages"
                    >
                      <Icons.RefreshCw className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={triggerScan} 
                      disabled={!activeVault}
                      className="glass-button glass-button-primary whitespace-nowrap"
                    >
                      <Icons.Scan className="w-4 h-4" />
                      Run AgentKit Scan
                    </button>
                  </div>
                </div>

                {scanStatus && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-sky-400 p-3 rounded-xl bg-sky-950/30 border border-sky-500/20">
                    <Icons.Activity className="w-4 h-4 animate-pulse" />
                    {scanStatus}
                  </div>
                )}
              </div>

              {/* Proposals List */}
              <div className="space-y-4 max-w-full overflow-x-hidden">
                {loadingProposals ? (
                  <>
                    <SkeletonCard />
                    <SkeletonCard />
                  </>
                ) : proposals.length === 0 ? (
                  <EmptyState
                    icon={Icons.LayoutGrid}
                    title="No Proposals Yet"
                    description="Deploy a vault, bootstrap it, connect XMTP, and run the AgentKit scan to discover opportunities."
                  />
                ) : (
                  proposals.map((proposal) => {
                    const nonce = actionNonce[proposal.proposal.proposalId] ?? crypto.randomUUID();
                    const isExpanded = expandedProposals.has(proposal.proposal.proposalId);
                    const statusType = getProposalStatusType(proposal.status);

                    return (
                      <div 
                        key={proposal.proposal.proposalId}
                        className={`glass-panel proposal-card transition-all duration-300 ${
                          statusType === 'success' ? 'glass-green' : 
                          statusType === 'error' ? 'glass-rose' :
                          statusType === 'warning' ? 'glass-amber' : 'glass-blue'
                        }`}
                      >
                        {/* Collapsed Header */}
                        <div 
                          className="p-5 cursor-pointer"
                          onClick={() => toggleProposal(proposal.proposal.proposalId)}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-1">
                              <StatusBadge 
                                status={proposal.status} 
                                type={statusType}
                              />
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-slate-100 truncate">
                                  Proposal {proposal.proposal.proposalId.slice(0, 8)}...
                                </h3>
                                <p className="text-xs text-slate-500 truncate">
                                  {proposal.proposal.risk.analysisSummary}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-semibold text-slate-100">
                                  {(Number(proposal.proposal.opportunity.amountIn) / 1_000_000).toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500">USDC</span>
                              </div>
                              <Icons.ArrowRightLeft className="w-4 h-4 text-slate-600" />
                              <div className="flex items-baseline gap-1">
                                <span className="text-lg font-semibold text-slate-100">
                                  {formatEther(BigInt(proposal.proposal.opportunity.quotedAmountOut)).slice(0, 6)}
                                </span>
                                <span className="text-xs text-slate-500">WETH</span>
                              </div>
                              <button className="p-1 rounded-lg hover:bg-white/5 transition-colors">
                                {isExpanded ? (
                                  <Icons.ChevronUp className="w-5 h-5 text-slate-400" />
                                ) : (
                                  <Icons.ChevronDown className="w-5 h-5 text-slate-400" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Quick Stats Row */}
                          <div className="flex items-center gap-4 mt-3 text-xs">
                            <span className="flex items-center gap-1 text-slate-500">
                              Risk: <span className="text-slate-300 font-medium">{proposal.proposal.risk.score}/10</span>
                            </span>
                            <span className="flex items-center gap-1 text-slate-500">
                              Confidence: <span className="text-slate-300 font-medium">{(proposal.proposal.risk.confidence * 100).toFixed(0)}%</span>
                            </span>
                            <span className="badge badge-slate">
                              {proposal.proposal.paymentRequirement.paymentNetwork}
                            </span>
                          </div>
                        </div>

                          {/* Expanded Content */}
                          {isExpanded && (
                            <div className="border-t border-slate-800/50 p-5 fade-in overflow-x-hidden">
                              <div className="grid lg:grid-cols-2 gap-5 max-w-full">
                                {/* Left: Details */}
                                <div className="space-y-4 min-w-0 overflow-hidden">
                                  <div>
                                    <p className="text-sm text-slate-300 mb-3 leading-relaxed line-clamp-4">
                                      {proposal.proposal.risk.analysisSummary}
                                    </p>
                                  </div>

                                <div className="card-grid-2 gap-2">
                                  <MetricCard 
                                    label="Input" 
                                    value={`${(Number(proposal.proposal.opportunity.amountIn) / 1_000_000).toFixed(2)} USDC`}
                                  />
                                  <MetricCard 
                                    label="Expected Output" 
                                    value={`${formatEther(BigInt(proposal.proposal.opportunity.quotedAmountOut))} WETH`}
                                  />
                                  <MetricCard 
                                    label="Minimum" 
                                    value={`${formatEther(BigInt(proposal.proposal.opportunity.minAmountOut))} ETH`}
                                  />
                                  <MetricCard 
                                    label="Fee Tier" 
                                    value={`${proposal.proposal.opportunity.feeTier / 10_000}%`}
                                  />
                                </div>

                                <div className="glass-panel glass-elevated p-3 text-xs space-y-1.5">
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Expires</span>
                                    <span className="text-slate-300">{new Date(proposal.proposal.timing.expiresAt).toLocaleString()}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Opportunity Chain</span>
                                    <span className="text-slate-300">{proposal.proposal.metadata.opportunityChain}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Execution Chain</span>
                                    <span className="text-slate-300">{proposal.proposal.metadata.executionChain}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span className="text-slate-500">Quote Source</span>
                                    <span className="text-slate-300">{proposal.proposal.metadata.quoteSource}</span>
                                  </div>
                                  <div className="pt-1.5 border-t border-slate-800">
                                    <span className="text-slate-500 block mb-1">Quote Hash</span>
                                    <span className="font-mono text-slate-400 break-all">{proposal.proposal.opportunity.quoteHash}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right: Actions */}
                              <div className="space-y-3 min-w-0">
                                <div className="glass-panel glass-elevated p-4 space-y-3 max-w-full">
                                  <h4 className="text-sm font-medium text-slate-300 mb-3">Execution Flow</h4>
                                  
                                  <div className="card-grid-2 gap-2">
                                    <button 
                                      onClick={() => approveProposal(proposal)} 
                                      disabled={!xmtp.client}
                                      className="glass-button glass-button-primary"
                                    >
                                      <Icons.MessageSquare className="w-4 h-4" />
                                      Approve XMTP
                                    </button>
                                    <button 
                                      onClick={() => rejectProposal(proposal)} 
                                      disabled={!xmtp.client}
                                      className="glass-button"
                                    >
                                      <Icons.XCircle className="w-4 h-4" />
                                      Reject
                                    </button>
                                  </div>

                                  {address && activeVault && (
                                    <WorldIdActionButton
                                      actionType="execute"
                                      wallet={address}
                                      vault={activeVault}
                                      nonce={nonce}
                                      proposalHash={proposal.proposalHash}
                                      onVerified={({ signalHash }) => {
                                        setVerificationSignals((current) => ({ ...current, [proposal.proposal.proposalId]: signalHash }));
                                        setActionNonce((current) => ({ ...current, [proposal.proposal.proposalId]: nonce }));
                                      }}
                                    />
                                  )}

                                  <button 
                                    onClick={() => settlePayment(proposal)} 
                                    disabled={!x402.isReady || BigInt(userUsdcBalance ?? BigInt(0)) < BigInt(proposal.proposal.paymentRequirement.paymentAmount)}
                                    className="glass-button w-full"
                                  >
                                    <Icons.CreditCard className="w-4 h-4" />
                                    {x402.paymentPhase === 'creating-intent'
                                      ? 'Creating Intent...'
                                      : x402.paymentPhase === 'creating-payload'
                                        ? 'Creating Payload...'
                                        : x402.paymentPhase === 'settling'
                                          ? 'Settling Fee...'
                                          : 'Pay x402 Fee'}
                                  </button>

                                  {BigInt(userUsdcBalance ?? BigInt(0)) < BigInt(proposal.proposal.paymentRequirement.paymentAmount) && (
                                    <p className="text-xs text-amber-400">
                                      Fund the connected wallet with at least {formatUnits(BigInt(proposal.proposal.paymentRequirement.paymentAmount), 6)} Base Sepolia USDC to pay this fee.
                                    </p>
                                  )}

                                  {x402.paymentError && (
                                    <p className="text-xs text-rose-400">{x402.paymentError}</p>
                                  )}

                                  <button 
                                    onClick={() => executeProposal(proposal)} 
                                    disabled={!verificationSignals[proposal.proposal.proposalId]}
                                    className="glass-button w-full glass-button-success"
                                  >
                                    <Icons.CheckCircle className="w-4 h-4" />
                                    Execute On-Chain
                                  </button>
                                </div>

                                {proposal.executionTxHash && (
                                  <div className="glass-panel glass-green p-3 flex items-center gap-2 text-sm">
                                    <Icons.CheckCircle className="w-4 h-4 text-emerald-400" />
                                    <span className="text-emerald-400">Executed:</span>
                                    <span className="font-mono text-slate-400 truncate flex-1">{proposal.executionTxHash}</span>
                                    <a 
                                      href={`https://sepolia.basescan.org/tx/${proposal.executionTxHash}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                                    >
                                      <Icons.ExternalLink className="w-4 h-4 text-slate-400" />
                                    </a>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* XMTP Transcript */}
              <div className="glass-panel glass-violet p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="icon-container-violet">
                      <Icons.MessageSquare className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="section-title">XMTP Transcript</h2>
                      <p className="section-description">Live transport between owner and agent</p>
                    </div>
                  </div>
                  <button 
                    onClick={xmtp.refreshMessages}
                    className="glass-button"
                  >
                    <Icons.RefreshCw className="w-4 h-4" />
                    Refresh
                  </button>
                </div>

                <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2">
                  {xmtp.messages.length === 0 ? (
                    <EmptyState
                      icon={Icons.MessageSquare}
                      title="No Messages"
                      description="XMTP messages will appear here once the agent connects."
                    />
                  ) : (
                    xmtp.messages.map((message) => (
                      <div 
                        key={message.id} 
                        className="glass-panel glass-elevated p-4 hover-lift"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-sky-500/20 to-violet-500/20 border border-slate-700/50 flex items-center justify-center text-xs font-medium text-slate-400">
                              {message.senderInboxId.slice(0, 2).toUpperCase()}
                            </div>
                            <span className="text-xs font-mono text-slate-500">
                              {message.senderInboxId.slice(0, 12)}...
                            </span>
                          </div>
                          <span className="text-xs text-slate-600">
                            {new Date(message.sentAt).toLocaleString()}
                          </span>
                        </div>
                        <pre className="text-xs text-slate-300 whitespace-pre-wrap break-words font-mono bg-slate-950/50 rounded-lg p-3 border border-slate-800/50">
                          {message.content}
                        </pre>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
}
