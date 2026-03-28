// components/WorldIDVerify.tsx - World ID IDKit widget
'use client';

import { useState, useCallback } from 'react';
import { useWorldID } from '@/hooks/useWorldID';
import { useAccount } from 'wagmi';

// World ID proof type
interface WorldIDProof {
  merkle_root: string;
  nullifier_hash: string;
  proof: string;
  verification_level: 'orb' | 'device';
}

// IDKit type
interface IDKitResult {
  merkle_root?: string;
  merkleRoot?: string;
  nullifier_hash?: string;
  nullifierHash?: string;
  proof?: string;
  verification_level?: 'orb' | 'device';
  verificationLevel?: 'orb' | 'device';
}

interface WorldIDVerifyProps {
  onVerified?: () => void;
  className?: string;
}

export function WorldIDVerify({ onVerified, className = '' }: WorldIDVerifyProps) {
  const { address } = useAccount();
  const { verified, verifying, error, verify, checkVerification } = useWorldID();
  const [showWidget, setShowWidget] = useState(false);

  const handleSuccess = useCallback(async (result: IDKitResult) => {
    // Convert IDKit result to WorldIDProof format
    // Type assertion needed as IDKitResult can be V3 or V4 format
    const resultAny = result as any;
    const proof: WorldIDProof = {
      merkle_root: resultAny.merkle_root || resultAny.merkleRoot || '',
      nullifier_hash: resultAny.nullifier_hash || resultAny.nullifierHash || '',
      proof: resultAny.proof || '',
      verification_level: resultAny.verification_level || resultAny.verificationLevel || 'device',
    };
    await verify(proof);
    setShowWidget(false);
    onVerified?.();
  }, [verify, onVerified]);

  // Show loading while checking initial state
  // Note: verifying state from hook covers the checking period
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
        ) : error ? (
          <div className="space-y-2">
            <p className="text-sm text-red-600">{error}</p>
            <button
              onClick={() => {
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
            onClick={() => {
              // Open World ID widget
              setShowWidget(true);
            }}
            className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all font-medium"
          >
            {'Verify with World ID'}
          </button>
        )}
      </div>

      {/* World ID Modal - Simplified for build */}
      {showWidget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4">World ID Verification</h3>
            <p className="text-gray-600 mb-4">
              This would open the World ID widget. In production, this integrates with
              the WorldCoin Developer Portal.
            </p>
            <div className="space-y-2">
              <button
                onClick={() => {
                  // Mock success for development
                  handleSuccess({
                    nullifier_hash: `mock_${Date.now()}`,
                    merkle_root: 'mock_root',
                    proof: 'mock_proof',
                    verification_level: 'device',
                  });
                }}
                className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Mock Verify (Dev)
              </button>
              <button
                onClick={() => setShowWidget(false)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
