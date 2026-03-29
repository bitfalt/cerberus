'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount, usePublicClient, useReadContract, useSignTypedData, useWalletClient, useWriteContract } from 'wagmi';
import { formatEther, parseEther } from 'viem';
import { cerberusVaultAbi, cerberusVaultFactoryAbi } from '@/lib/contracts';
import { publicEnv } from '@/lib/env';
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

function currentTimestamp() {
  return Date.now();
}

export default function Home() {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const { signTypedDataAsync } = useSignTypedData();

  const [recoveryAddress, setRecoveryAddress] = useState<string>('');
  const [depositAmount, setDepositAmount] = useState('0.01');
  const [withdrawAmount, setWithdrawAmount] = useState('0.001');
  const [withdrawRecipient, setWithdrawRecipient] = useState('');
  const [scanStatus, setScanStatus] = useState<string | null>(null);
  const [bootstrapStatus, setBootstrapStatus] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus | null>(null);
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [verificationSignals, setVerificationSignals] = useState<Record<string, string>>({});
  const [actionNonce, setActionNonce] = useState<Record<string, string>>({});
  const [recoverySignalHash, setRecoverySignalHash] = useState<string | null>(null);
  const [withdrawSignalHash, setWithdrawSignalHash] = useState<string | null>(null);
  const [withdrawNonce, setWithdrawNonce] = useState<string>(() => crypto.randomUUID());
  const [recoveryNonce, setRecoveryNonce] = useState<string>(() => crypto.randomUUID());

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

  const currentVaultAddress = vaultAddress as `0x${string}` | undefined;

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
    const response = await fetch(`/api/proposals?wallet=${address}`);
    const payload = await response.json();
    if (response.ok) {
      setProposals(payload.proposals ?? []);
    }
  }, [address]);

  const refreshVaultStatus = useCallback(async () => {
    if (!activeVault) return;
    const response = await fetch(`/api/vault/${activeVault}/status`);
    const payload = await response.json();
    if (response.ok) {
      setVaultStatus(payload);
    }
  }, [activeVault]);

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
    if (!address) return;
    const timer = window.setInterval(() => {
      void refreshProposals();
      void refreshVaultStatus();
      void xmtp.refreshMessages();
    }, 15_000);
    return () => window.clearInterval(timer);
  }, [address, activeVault, refreshProposals, refreshVaultStatus, xmtp]);

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
    await x402.payForProposal({
      proposalId: proposal.proposal.proposalId,
      wallet: address,
      vault: activeVault,
      proposalHash: proposal.proposalHash,
      paymentNetwork: proposal.proposal.paymentRequirement.paymentNetwork,
      asset: proposal.proposal.paymentRequirement.paymentAsset,
      amount: proposal.proposal.paymentRequirement.paymentAmount,
    });
    await refreshProposals();
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
    if (!address || !activeVault || !recoveryAddress || !recoverySignalHash) return;
    const response = await fetch(`/api/vault/${activeVault}/recovery-authorize`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        wallet: address,
        recoveryAddress,
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

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.16),_transparent_34%),linear-gradient(180deg,_#08111b_0%,_#0f172a_48%,_#111827_100%)] text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-6 rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-sky-950/30 backdrop-blur">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="text-xs uppercase tracking-[0.4em] text-sky-300">Cerberus Governance Console</p>
              <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">Real Base market discovery with governed Base Sepolia execution.</h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-300 sm:text-base">
                Cerberus scans real Base Mainnet liquidity for opportunities, then runs the approval, World ID, x402, and governed vault flow safely on Base Sepolia.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 rounded-3xl border border-white/10 bg-slate-950/50 p-4">
              <ConnectButton />
              <div className="grid grid-cols-2 gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 px-3 py-1">Opportunity chain: Base</span>
                <span className="rounded-full border border-white/10 px-3 py-1">Exec chain: Base Sepolia</span>
                <span className="rounded-full border border-white/10 px-3 py-1">x402 default: {defaultPaymentNetwork}</span>
                <span className="rounded-full border border-white/10 px-3 py-1">World ID v4</span>
                <span className="rounded-full border border-white/10 px-3 py-1">XMTP real agent path</span>
              </div>
            </div>
          </div>
        </div>

        {!isConnected ? (
          <section className="rounded-[2rem] border border-white/10 bg-slate-950/40 p-8 text-center text-slate-300">
            Connect a wallet to create a governed vault, link to the XMTP agent, and run the full World ID + x402 + on-chain authorization flow.
          </section>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <h2 className="text-lg font-semibold text-white">Vault setup</h2>
                <p className="mt-1 text-sm text-slate-400">Deploy one governed vault per owner. All outflows require Cerberus authorization.</p>
                <div className="mt-4 space-y-3">
                  <input
                    value={recoveryAddress}
                    onChange={(event) => setRecoveryAddress(event.target.value)}
                    placeholder="Recovery address"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm outline-none ring-0 placeholder:text-slate-500"
                  />
                  <button onClick={createVault} className="w-full rounded-2xl bg-amber-400 px-4 py-3 font-semibold text-slate-950 hover:bg-amber-300">
                    {activeVault ? 'Vault deployed' : 'Create governed vault'}
                  </button>
                  {activeVault ? (
                    <button onClick={bootstrapVault} className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5">
                      Bootstrap allowlists and approvals
                    </button>
                  ) : null}
                  {bootstrapStatus ? <p className="text-xs text-sky-300">{bootstrapStatus}</p> : null}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-300">
                  <p className="font-medium text-white">Vault</p>
                  <p className="mt-1 break-all">{activeVault ?? 'Not deployed yet'}</p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <h2 className="text-lg font-semibold text-white">Funding and status</h2>
                <div className="mt-4 space-y-3 text-sm text-slate-300">
                  <div className="grid grid-cols-2 gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4">
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">ETH</p>
                      <p className="mt-2 text-lg font-semibold text-white">{vaultStatus?.balances.eth ?? '0.0'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">USDC</p>
                      <p className="mt-2 text-lg font-semibold text-white">{vaultStatus?.balances.usdc ?? '0.0'}</p>
                    </div>
                  </div>
                  <input
                    value={depositAmount}
                    onChange={(event) => setDepositAmount(event.target.value)}
                    placeholder="Deposit ETH"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                  />
                  <button onClick={fundVault} disabled={!activeVault} className="w-full rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
                    Fund vault with ETH
                  </button>
                  <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-400">
                    <p>Owner: {vaultStatus?.owner ?? '—'}</p>
                    <p className="mt-1">Recovery: {vaultStatus?.recoveryAddress ?? '—'}</p>
                    <p className="mt-1">Paused: {vaultStatus?.paused ? 'yes' : 'no'}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <h2 className="text-lg font-semibold text-white">XMTP control plane</h2>
                <p className="mt-1 text-sm text-slate-400">The web client talks to the persistent agent inbox, while the worker streams approvals and proposal state.</p>
                <button onClick={connectXmtp} className="mt-4 w-full rounded-2xl bg-sky-500 px-4 py-3 font-semibold text-white hover:bg-sky-400">
                  {xmtp.client ? 'XMTP connected' : 'Connect XMTP inbox'}
                </button>
                {xmtp.error ? <p className="mt-2 text-xs text-rose-300">{xmtp.error}</p> : null}
                <div className="mt-4 rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-300">
                  <p>Agent address: {xmtp.agentAddress}</p>
                  <p className="mt-1">Messages synced: {xmtp.messages.length}</p>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <h2 className="text-lg font-semibold text-white">Manual withdrawal</h2>
                <p className="mt-1 text-sm text-slate-400">Withdrawals stay governed: fresh World ID plus owner and Cerberus signatures.</p>
                <div className="mt-4 space-y-3">
                  <input
                    value={withdrawRecipient}
                    onChange={(event) => setWithdrawRecipient(event.target.value)}
                    placeholder="Recipient (defaults to connected wallet)"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                  />
                  <input
                    value={withdrawAmount}
                    onChange={(event) => setWithdrawAmount(event.target.value)}
                    placeholder="Amount in ETH"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm outline-none placeholder:text-slate-500"
                  />
                  {address && activeVault ? (
                    <WorldIdActionButton
                      actionType="withdraw"
                      wallet={address}
                      vault={activeVault}
                      nonce={withdrawNonce}
                      onVerified={({ signalHash }) => setWithdrawSignalHash(signalHash)}
                    />
                  ) : null}
                  <button onClick={withdrawFromVault} disabled={!activeVault || !withdrawSignalHash} className="w-full rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
                    Execute governed withdrawal
                  </button>
                </div>
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <h2 className="text-lg font-semibold text-white">Recovery path</h2>
                <p className="mt-1 text-sm text-slate-400">Recovery is constrained to the pre-registered address and still requires Cerberus authorization.</p>
                {address && activeVault && recoveryAddress ? (
                  <div className="mt-4 space-y-3">
                    <WorldIdActionButton
                      actionType="recover"
                      wallet={address}
                      vault={activeVault}
                      nonce={recoveryNonce}
                      recoveryAddress={recoveryAddress}
                      onVerified={({ signalHash }) => setRecoverySignalHash(signalHash)}
                    />
                    <button onClick={requestRecovery} disabled={!recoverySignalHash} className="w-full rounded-2xl border border-white/15 px-4 py-3 font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">
                      Request recovery timelock
                    </button>
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">Set a recovery address first.</p>
                )}
              </div>
            </section>

            <section className="space-y-6">
              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">Agent proposals</h2>
                    <p className="mt-1 text-sm text-slate-400">Queue a worker job, fetch a live Base Mainnet quote, push the proposal over XMTP, then complete the World ID and x402 gates before testnet execution.</p>
                  </div>
                  <button onClick={triggerScan} disabled={!activeVault} className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-slate-950 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40">
                    Run AgentKit scan
                  </button>
                </div>
                {scanStatus ? <p className="mt-3 text-sm text-sky-300">{scanStatus}</p> : null}
              </div>

              <div className="space-y-4">
                {proposals.length === 0 ? (
                  <div className="rounded-[1.75rem] border border-dashed border-white/10 bg-slate-950/40 p-10 text-center text-slate-400">
                    No proposals staged yet. Deploy a vault, bootstrap it, connect XMTP, and run the AgentKit scan.
                  </div>
                ) : (
                  proposals.map((proposal) => {
                    const nonce = actionNonce[proposal.proposal.proposalId] ?? crypto.randomUUID();
                    return (
                      <article key={proposal.proposal.proposalId} className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                              <span className="rounded-full border border-sky-400/30 bg-sky-400/10 px-3 py-1 text-sky-200">{proposal.status}</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">Risk {proposal.proposal.risk.score}</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">Confidence {(proposal.proposal.risk.confidence * 100).toFixed(0)}%</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">Payment {proposal.proposal.paymentRequirement.paymentNetwork}</span>
                              <span className="rounded-full border border-white/10 px-3 py-1">Quote {proposal.proposal.opportunity.source}</span>
                            </div>
                            <div>
                              <h3 className="text-xl font-semibold text-white">Proposal {proposal.proposal.proposalId}</h3>
                              <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">{proposal.proposal.risk.analysisSummary}</p>
                            </div>
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                              <Metric label="Proposal hash" value={`${proposal.proposalHash.slice(0, 10)}...${proposal.proposalHash.slice(-8)}`} />
                              <Metric label="Base quote in" value={`${(Number(proposal.proposal.opportunity.amountIn) / 1_000_000).toFixed(2)} USDC`} />
                              <Metric label="Quoted out" value={`${formatEther(BigInt(proposal.proposal.opportunity.quotedAmountOut))} WETH`} />
                              <Metric label="Min receive" value={`${formatEther(BigInt(proposal.proposal.opportunity.minAmountOut))} ETH/WETH`} />
                              <Metric label="Fee tier" value={`${proposal.proposal.opportunity.feeTier / 10_000}%`} />
                              <Metric label="Expires" value={new Date(proposal.proposal.timing.expiresAt).toLocaleTimeString()} />
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-xs text-slate-300">
                              <p>Opportunity chain: {proposal.proposal.metadata.opportunityChain}</p>
                              <p className="mt-1">Execution chain: {proposal.proposal.metadata.executionChain}</p>
                              <p className="mt-1">Quote source: {proposal.proposal.metadata.quoteSource}</p>
                              <p className="mt-1 break-all">Quote hash: {proposal.proposal.opportunity.quoteHash}</p>
                            </div>
                          </div>
                          <div className="w-full max-w-md space-y-3 rounded-[1.5rem] border border-white/10 bg-slate-900/70 p-4">
                            <div className="flex flex-wrap gap-2">
                              <button onClick={() => approveProposal(proposal)} disabled={!xmtp.client} className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-40">Approve via XMTP</button>
                              <button onClick={() => rejectProposal(proposal)} disabled={!xmtp.client} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">Reject</button>
                            </div>
                            {address && activeVault ? (
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
                            ) : null}
                            <button onClick={() => settlePayment(proposal)} disabled={!x402.isReady} className="w-full rounded-2xl border border-white/15 px-4 py-3 text-sm font-semibold text-white hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40">Pay x402 authorization fee</button>
                            <button onClick={() => executeProposal(proposal)} disabled={!verificationSignals[proposal.proposal.proposalId]} className="w-full rounded-2xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-40">Execute on-chain through vault</button>
                            {proposal.executionTxHash ? <p className="text-xs text-emerald-300">Executed: {proposal.executionTxHash}</p> : null}
                          </div>
                        </div>
                      </article>
                    );
                  })
                )}
              </div>

              <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/55 p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-white">XMTP transcript</h2>
                    <p className="mt-1 text-sm text-slate-400">Live transport between the browser owner inbox and the persistent Cerberus agent inbox.</p>
                  </div>
                  <button onClick={xmtp.refreshMessages} className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white hover:bg-white/5">Refresh</button>
                </div>
                <div className="mt-4 space-y-3">
                  {xmtp.messages.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 px-4 py-10 text-center text-sm text-slate-500">
                      No XMTP messages yet.
                    </div>
                  ) : (
                    xmtp.messages.map((message) => (
                      <div key={message.id} className="rounded-2xl border border-white/10 bg-slate-900/70 p-4 text-sm text-slate-200">
                        <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
                          <span>{message.senderInboxId}</span>
                          <span>{new Date(message.sentAt).toLocaleString()}</span>
                        </div>
                        <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-xs text-slate-200">{message.content}</pre>
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

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-4">
      <p className="text-xs uppercase tracking-[0.24em] text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
