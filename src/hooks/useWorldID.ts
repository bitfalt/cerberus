import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';

// World ID types
interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

interface WorldIDState {
  verified: boolean;
  verifying: boolean;
  error: string | null;
  nullifierHash: string | null;
}

export function useWorldID() {
  const { address } = useAccount();
  const [state, setState] = useState<WorldIDState>({
    verified: false,
    verifying: false,
    error: null,
    nullifierHash: null,
  });

  // Check verification status - try API first, then fall back to mock
  const checkVerification = useCallback(async () => {
    if (!address) {
      setState(prev => ({ ...prev, verified: false }));
      return;
    }

    try {
      // Try to check via API (works before Convex is set up)
      const response = await fetch(`/api/worldid/verify?wallet=${address}`);
      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          verified: data.verified,
          nullifierHash: data.nullifierHash || null,
        }));
        return;
      }
    } catch {
      // API not available, fall back to localStorage
    }

    // Fallback: check localStorage
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`worldid_${address.toLowerCase()}`);
      if (stored) {
        const data = JSON.parse(stored);
        setState(prev => ({
          ...prev,
          verified: true,
          nullifierHash: data.nullifierHash,
        }));
      }
    }
  }, [address]);

  // Verify with World ID
  const verify = useCallback(async (proof: WorldIDProof) => {
    if (!address) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, verifying: true, error: null }));

    try {
      // Try API first
      const response = await fetch('/api/worldid/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          proof,
          signal: address,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setState(prev => ({
          ...prev,
          verified: true,
          verifying: false,
          nullifierHash: data.nullifierHash || proof.nullifier_hash,
        }));

        // Store in localStorage as backup
        if (typeof window !== 'undefined') {
          localStorage.setItem(`worldid_${address.toLowerCase()}`, JSON.stringify({
            nullifierHash: data.nullifierHash || proof.nullifier_hash,
            verifiedAt: Date.now(),
          }));
        }
        return;
      }

      // If API fails, fall back to mock verification for development
      if (process.env.NODE_ENV === 'development') {
        console.log('Development mode: mocking World ID verification');
        setState(prev => ({
          ...prev,
          verified: true,
          verifying: false,
          nullifierHash: proof.nullifier_hash,
        }));

        if (typeof window !== 'undefined') {
          localStorage.setItem(`worldid_${address.toLowerCase()}`, JSON.stringify({
            nullifierHash: proof.nullifier_hash,
            verifiedAt: Date.now(),
          }));
        }
        return;
      }

      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Verification failed');
    } catch (error) {
      console.error('World ID verification error:', error);
      setState(prev => ({
        ...prev,
        verifying: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }));
    }
  }, [address]);

  return {
    verified: state.verified,
    verifying: state.verifying,
    error: state.error,
    nullifierHash: state.nullifierHash,
    checkVerification,
    verify,
  };
}

export type { WorldIDProof };
