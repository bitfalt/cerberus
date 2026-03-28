// components/WorldIDVerify.tsx - World ID IDKit v4 widget
'use client';

import { useState, useCallback, useEffect } from 'react';
import { useWorldID } from '@/hooks/useWorldID';
import { useAccount } from 'wagmi';
import { IDKitRequestWidget, deviceLegacy, type RpContext, type IDKitResult, type IDKitErrorCodes } from '@worldcoin/idkit';

interface WorldIDVerifyProps {
  onVerified?: () => void;
  className?: string;
}

export function WorldIDVerify({ onVerified, className = '' }: WorldIDVerifyProps) {
  const { address } = useAccount();
  const { verified, verifying, error, verify, checkVerification } = useWorldID();
  const [showWidget, setShowWidget] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Fetch signed rp_context from backend
  const fetchProofRequest = useCallback(async () => {
    if (!address) return;
    
    setFetchError(null);
    try {
      const res = await fetch('/api/worldid/request-proof', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ signal: address }),
      });
      
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch proof request');
      }
      
      const data = await res.json();
      setRpContext(data.rp_context as RpContext);
      setShowWidget(true);
    } catch (err) {
      console.error('Failed to fetch proof request:', err);
      setFetchError(err instanceof Error ? err.message : 'Failed to initialize verification');
    }
  }, [address]);

  // Handle IDKit success
  const handleIDKitSuccess = useCallback(async (result: IDKitResult) => {
    // Handle IDKit v4 result format (uniqueness proof, not session)
    if (result.protocol_version === '4.0' && 'responses' in result && !('session_id' in result)) {
      const response = result.responses[0];
      if (response && 'nullifier' in response) {
        // V4 uniqueness format: proof is string[], nullifier is the unique identifier
        const v4Response = response as { proof: string[]; nullifier: string };
        const proof = {
          // For V4, the Merkle root is the 5th element of the proof array (index 4)
          merkle_root: v4Response.proof[4] || '',
          nullifier_hash: v4Response.nullifier,
          // V4 proof is string[], we join it for the API
          proof: v4Response.proof.join(','),
          verification_level: 'device' as const,
        };
        
        await verify(proof);
        setShowWidget(false);
        setRpContext(null);
        onVerified?.();
      }
    }
  }, [verify, onVerified]);

  // Handle IDKit error
  const handleIDKitError = useCallback((errorCode: IDKitErrorCodes) => {
    console.error('IDKit error:', errorCode);
    setFetchError(`Verification failed: ${errorCode}`);
    setShowWidget(false);
  }, []);

  // Show loading while checking initial state
  if (verifying && !showWidget) {
    return (
      <div className={`p-4 rounded-lg bg-gray-100 ${className}`}>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-gray-600">Checking verification...</span>
        </div>
      </div>
    );
  }

  // Show verified state
  if (verified) {
    return (
      <div className={`p-4 rounded-lg bg-green-50 border border-green-200 ${className}`}>
        <div className="flex items-center gap-2">
          <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="font-medium text-green-800">Identity Verified</p>
            <p className="text-sm text-green-600">Your World ID is linked to this wallet</p>
          </div>
        </div>
      </div>
    );
  }

  // Show verification widget or button
  return (
    <div className={`p-4 rounded-lg bg-blue-50 border border-blue-200 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="font-medium text-blue-900">Verify with World ID</p>
            <p className="text-sm text-blue-600">
              Prove you are a unique human to access advanced trading features. 
              Required for high-value transactions.
            </p>
          </div>
        </div>

        {!address ? (
          <p className="text-sm text-gray-500">Connect your wallet first</p>
        ) : error || fetchError ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{error || fetchError}</p>
            <button
              onClick={() => {
                setFetchError(null);
                checkVerification();
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              Try Again
            </button>
          </div>
        ) : verifying ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-blue-600">Verifying...</span>
          </div>
        ) : (
          <button
            onClick={fetchProofRequest}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
          >
            {'Verify with World ID'}
          </button>
        )}
      </div>

      {/* IDKit v4 Widget */}
      {showWidget && rpContext && address && (
        <IDKitRequestWidget
          open={showWidget}
          onOpenChange={setShowWidget}
          app_id={(process.env.NEXT_PUBLIC_WORLDCOIN_APP_ID || 'app_placeholder') as `app_${string}`}
          action="cerberus_trade_approval"
          preset={deviceLegacy({ signal: address })}
          rp_context={rpContext}
          allow_legacy_proofs={false}
          onSuccess={handleIDKitSuccess}
          onError={handleIDKitError}
        />
      )}
    </div>
  );
}
