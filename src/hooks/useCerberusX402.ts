'use client';

import { useCallback, useMemo } from 'react';
import { x402Client } from '@x402/core/client';
import { registerExactEvmScheme } from '@x402/evm/exact/client';
import { usePublicClient, useWalletClient } from 'wagmi';

export function useCerberusX402() {
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

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
    });

    return paymentClient;
  }, [publicClient, walletClient]);

  const payForProposal = useCallback(
    async (input: {
      proposalId: string;
      wallet: string;
      vault: string;
      proposalHash: string;
      paymentNetwork: 'base-sepolia' | 'world';
      asset: string;
      amount: string;
    }) => {
      if (!client) {
        throw new Error('Wallet must be connected to create x402 payments');
      }

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
      const payload = await client.createPaymentPayload(paymentRequired);

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
        throw new Error(settled.error ?? 'Failed to settle payment');
      }

      return settled;
    },
    [client]
  );

  return {
    payForProposal,
    isReady: Boolean(client),
  };
}
