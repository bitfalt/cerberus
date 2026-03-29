'use client';

import { useState } from 'react';
import { IDKitRequestWidget, orbLegacy, type IDKitResult, type RpContext } from '@worldcoin/idkit';
import { publicEnv } from '@/lib/env';

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
};

export function WorldIdActionButton({ actionType, wallet, vault, nonce, proposalHash, recoveryAddress, onVerified }: Props) {
  const [requestState, setRequestState] = useState<RequestState | null>(null);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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

    onVerified({
      signalHash: payload.signalHash,
      verificationId: payload.verificationId,
      nullifier: payload.nullifier,
    });
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={beginVerification}
        className="rounded-full bg-sky-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isLoading}
      >
        {isLoading ? 'Preparing World ID...' : 'Verify with World ID'}
      </button>
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}
      {requestState ? (
        <IDKitRequestWidget
          open={open}
          onOpenChange={setOpen}
          app_id={publicEnv.NEXT_PUBLIC_WORLDCOIN_APP_ID as `app_${string}`}
          action={requestState.action}
          rp_context={requestState.rpContext}
          preset={orbLegacy({ signal: requestState.signal })}
          allow_legacy_proofs={false}
          handleVerify={handleVerify}
          onError={(widgetError) => {
            setError(String(widgetError));
          }}
          onSuccess={() => {
            setOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
