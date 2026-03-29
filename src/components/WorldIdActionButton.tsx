'use client';

import { useState } from 'react';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { publicEnv } from '@/lib/public-env';

type Props = {
  actionType: 'execute' | 'withdraw' | 'recover';
  wallet: string;
  vault: string;
  nonce: string;
  proposalHash?: string;
  recoveryAddress?: string;
  onVerified: (result: { signalHash: string; verificationId: string; nullifier: string }) => void;
};

type RequestState = {
  action: string;
  signal: string;
  signalHash: string;
  requestNonce: string;
  rpContext: RpContext;
  environment: 'production' | 'staging';
};

// Inline SVG Icons
const Icons = {
  Globe: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  ),
  Loader: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  CheckCircle: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
  AlertTriangle: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ),
  Shield: ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  ),
};

export function WorldIdActionButton({ actionType, wallet, vault, nonce, proposalHash, recoveryAddress, onVerified }: Props) {
  const [requestState, setRequestState] = useState<RequestState | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  const beginVerification = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/worldid/request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          actionType,
          wallet,
          vault,
          proposalHash,
          recoveryAddress,
          nonce,
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.error ?? 'Failed to create World ID request');
      }

      setRequestState({
        action: payload.action,
        signal: payload.signal,
        signalHash: payload.signalHash,
        requestNonce: payload.requestNonce,
        rpContext: payload.rp_context,
        environment: payload.environment === 'staging' ? 'staging' : 'production',
      });
      setOpen(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Failed to create World ID request');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async (result: IDKitResult) => {
    if (!requestState) {
      throw new Error('World ID request not initialized');
    }

    const response = await fetch('/api/worldid/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        actionType,
        wallet,
        vault,
        proposalHash,
        recoveryAddress,
        nonce,
        idkitResponse: result,
      }),
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error ?? 'World ID verification failed');
    }

    setIsVerified(true);
    onVerified({
      signalHash: payload.signalHash,
      verificationId: payload.verificationId,
      nullifier: payload.nullifier,
    });
  };

  const getActionLabel = () => {
    switch (actionType) {
      case 'execute':
        return 'Verify Identity to Execute';
      case 'withdraw':
        return 'Verify Identity to Withdraw';
      case 'recover':
        return 'Verify Identity to Recover';
      default:
        return 'Verify with World ID';
    }
  };

  if (isVerified) {
    return (
      <div className="glass-panel glass-green p-4 flex items-center gap-3">
        <Icons.CheckCircle className="w-5 h-5 text-emerald-400" />
        <span className="text-sm font-medium text-emerald-400">
          World ID Verified
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={beginVerification}
        disabled={isLoading}
        className={`glass-button w-full transition-all duration-200 ${
          isLoading 
            ? 'cursor-wait opacity-80' 
            : 'hover:-translate-y-0.5 hover:shadow-lg hover:shadow-sky-900/20'
        } ${
          actionType === 'execute' 
            ? 'glass-button-primary' 
            : actionType === 'withdraw'
            ? 'glass-button-warning'
            : 'glass-button-primary'
        }`}
      >
        {isLoading ? (
          <>
            <Icons.Loader className="w-4 h-4 animate-spin" />
            <span>Preparing World ID...</span>
          </>
        ) : (
          <>
            <Icons.Globe className="w-4 h-4" />
            <span>{getActionLabel()}</span>
          </>
        )}
      </button>

      {error && (
        <div className="glass-panel glass-rose p-3 flex items-center gap-2 text-sm">
          <Icons.AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
          <span className="text-rose-400">{error}</span>
        </div>
      )}

      {requestState && (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={publicEnv.NEXT_PUBLIC_WORLDCOIN_APP_ID as `app_${string}`}
          action={requestState.action}
          rp_context={requestState.rpContext}
          environment={requestState.environment}
          preset={orbLegacy({ signal: requestState.signal })}
          allow_legacy_proofs={true}
          handleVerify={handleVerify}
          onError={(widgetError) => {
            setError(String(widgetError));
          }}
          onSuccess={() => {
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
