import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

// World ID types
interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

interface VerifiedTransaction {
  nullifierHash: string;
  verifiedAt: number;
}

interface WorldIDState {
  verified: boolean;
  verifying: boolean;
  error: string | null;
  nullifierHash: string | null;
  verifiedTransactions: Map<string, VerifiedTransaction>;
}

export function useWorldID() {
  const { address } = useAccount();
  const [state, setState] = useState<WorldIDState>({
    verified: false,
    verifying: false,
    error: null,
    nullifierHash: null,
    verifiedTransactions: new Map(),
  });

  // Check verification status via API
  const checkVerification = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, verified: false }));
      return;
    }

    setState(prev => ({ ...prev, verifying: true, error: null }));

    try {
      const response = await fetch(`/api/worldid/verify?wallet=${address}`);
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          verified: data.verified,
          nullifierHash: data.nullifierHash || null,
          verifying: false,
        }));
        return;
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to check verification status');
    } catch (err) {
      console.error('World ID check error:', err);
      setState(prev => ({
        ...prev,
        verifying: false,
        error: err instanceof Error ? err.message : 'Failed to check verification',
      }));
    }
  }, [address]);

  // Verify with World ID - called after IDKit returns a real proof
  const verify = useCallback(async (proof: WorldIDProof) => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, verifying: true, error: null }));

    try {
      const response = await fetch('/api/worldid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof,
          signal: address,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        verified: true,
        verifying: false,
        nullifierHash: data.nullifierHash || proof.nullifier_hash,
      }));

      // Store in localStorage as backup for client-side checks
      if (typeof window !== 'undefined') {
        localStorage.setItem(`worldid_${address.toLowerCase()}`, JSON.stringify({
          nullifierHash: data.nullifierHash || proof.nullifier_hash,
          verifiedAt: Date.now(),
        }));
      }
    } catch (error) {
      console.error('World ID verification error:', error);
      setState(prev => ({
        ...prev,
        verifying: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [address]);

  // Verify for a specific transaction (per-transaction verification for high-value trades)
  const verifyForTransaction = useCallback(async (tradeId: string, proof: WorldIDProof) => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, verifying: true, error: null }));

    try {
      const response = await fetch('/api/worldid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof,
          signal: address,
          tradeId, // Include tradeId for per-transaction tracking
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Verification failed');
      }

      const data = await response.json();
      const nullifierHash = data.nullifierHash || proof.nullifier_hash;
      
      // Store this transaction as verified
      setState(prev => {
        const newVerifiedTransactions = new Map(prev.verifiedTransactions);
        newVerifiedTransactions.set(tradeId, {
          nullifierHash,
          verifiedAt: Date.now(),
        });
        return {
          ...prev,
          verified: true,
          verifying: false,
          nullifierHash,
          verifiedTransactions: newVerifiedTransactions,
        };
      });

      // Store in localStorage for this specific trade
      if (typeof window !== 'undefined') {
        localStorage.setItem(`worldid_trade_${tradeId}_${address.toLowerCase()}`, JSON.stringify({
          nullifierHash,
          verifiedAt: Date.now(),
        }));
      }
    } catch (error) {
      console.error('World ID per-transaction verification error:', error);
      setState(prev => ({
        ...prev,
        verifying: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [address]);

  // Check if a specific trade has been verified
  const isTransactionVerified = useCallback((tradeId: string): boolean => {
    return state.verifiedTransactions.has(tradeId);
  }, [state.verifiedTransactions]);

  // Get verification details for a specific trade
  const getTransactionVerification = useCallback((tradeId: string): VerifiedTransaction | null => {
    return state.verifiedTransactions.get(tradeId) || null;
  }, [state.verifiedTransactions]);

  return {
    verified: state.verified,
    verifying: state.verifying,
    error: state.error,
    nullifierHash: state.nullifierHash,
    verifiedTransactions: state.verifiedTransactions,
    checkVerification,
    verify,
    verifyForTransaction,
    isTransactionVerified,
    getTransactionVerification,
  };
}

export type { WorldIDProof };
