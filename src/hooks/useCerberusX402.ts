'use client';

import { useMemo, useState } from 'react';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { usePublicClient, useWalletClient } from 'wagmi';
import { publicEnv } from '@/lib/public-env';

export function useCerberusX402() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [paymentPhase, setPaymentPhase] = useState<'idle' | 'creating-intent' | 'creating-payload' | 'settling'>('idle');

  const client = useMemo(() => {
    if (!walletClient?.account || !publicClient) {
      return null;
    }

    const signTypedData = walletClient.signTypedData as unknown as (args: {
      account: { address: `0x${string}` };
      domain: Record<string, unknown>;
      types: Record<string, unknown>;
      primaryType: string;
      message: Record<string, unknown>;
    }) => Promise<`0x${string}`>;

    const paymentClient = new x402Client();
    registerExactEvmScheme(paymentClient, {
      signer: {
        address: walletClient.account.address,
        signTypedData: async (message) =>
          signTypedData({
            account: walletClient.account!,
            domain: message.domain,
            types: message.types,
            primaryType: message.primaryType,
            message: message.message,
          }),
        readContract: publicClient.readContract,
      },
      networks: ['eip155:84532'],
      schemeOptions: {
        84532: {
          rpcUrl: publicEnv.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL,
        },
      },
    });

    return paymentClient;
  }, [publicClient, walletClient]);

  async function payForProposal(input: {
    proposalId: string;
    wallet: string;
    vault: string;
    proposalHash: string;
    paymentNetwork: 'base-sepolia' | 'world';
    asset: string;
    amount: string;
  }) {
    if (!client) {
      throw new Error('Wallet must be connected to create x402 payments');
    }
    if (!walletClient?.chain || walletClient.chain.id !== 84532) {
      throw new Error('Switch the connected wallet to Base Sepolia before paying the x402 fee.');
    }

    setPaymentError(null);
    setPaymentPhase('creating-intent');

    const createResponse = await fetch(`/api/proposals/${input.proposalId}/payments`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(input),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json().catch(() => ({ error: 'Failed to create payment' }));
      throw new Error(error.error ?? 'Failed to create payment');
    }

    const paymentRequired = await createResponse.json();
    let payload;
    try {
      setPaymentPhase('creating-payload');
      payload = await client.createPaymentPayload(paymentRequired);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create x402 payment payload';
      setPaymentError(message);
      setPaymentPhase('idle');
      throw new Error(`${message} Ensure the connected wallet is on Base Sepolia and holds Base Sepolia USDC for the x402 fee.`);
    }

    setPaymentPhase('settling');
    const settleResponse = await fetch(`/api/proposals/${input.proposalId}/payments`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        paymentId: paymentRequired.payment.paymentId,
        payload,
      }),
    });

    const settled = await settleResponse.json().catch(() => ({ error: 'Failed to settle payment' }));
    if (!settleResponse.ok) {
      setPaymentError(settled.error ?? 'Failed to settle payment');
      setPaymentPhase('idle');
      throw new Error(settled.error ?? 'Failed to settle payment');
    }

    setPaymentPhase('idle');
    return settled;
  }

  return {
    payForProposal,
    isReady: Boolean(client),
    paymentError,
    paymentPhase,
  };
}
