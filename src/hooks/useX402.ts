// hooks/useX402.ts - React hook for x402 payment flow
'use client';

import { useState, useCallback } from 'react';
import { useWalletClient, useAccount } from 'wagmi';
import { createPayment, verifyPaymentOnChain, checkPaymentStatus, formatPaymentDisplay, type PaymentRequest } from '@/lib/x402/client';

interface PaymentSession {
  id: string;
  status: string;
  amount: string;
  expiresAt: number;
  paymentUrl: string;
}

interface UseX402Return {
  activePayment: PaymentSession | null;
  isCreating: boolean;
  isVerifying: boolean;
  error: string | null;
  create: (request: PaymentRequest) => Promise<void>;
  verify: (txHash: string) => Promise<boolean>;
  checkStatus: () => Promise<{ status: string; txHash?: string }>;
  clear: () => void;
  formatAmount: (amountWei: string, tokenAddress: string) => string;
}

export function useX402(): UseX402Return {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [activePayment, setActivePayment] = useState<PaymentSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Create a new payment
  const create = useCallback(async (request: PaymentRequest) => {
    if (!walletClient || !address) {
      setError('Wallet not connected');
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const session = await createPayment(walletClient, request);
      setActivePayment(session);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create payment';
      setError(message);
      console.error('Payment creation error:', err);
    } finally {
      setIsCreating(false);
    }
  }, [walletClient, address]);

  // Verify payment on-chain
  const verify = useCallback(async (txHash: string): Promise<boolean> => {
    if (!activePayment) {
      setError('No active payment');
      return false;
    }

    setIsVerifying(true);
    setError(null);

    try {
      const result = await verifyPaymentOnChain(activePayment.id, txHash);
      
      if (result.success) {
        setActivePayment(prev => prev ? { ...prev, status: 'settled' } : null);
        return true;
      } else {
        setError(result.error || 'Verification failed');
        return false;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Verification failed';
      setError(message);
      return false;
    } finally {
      setIsVerifying(false);
    }
  }, [activePayment]);

  // Check payment status
  const checkStatus = useCallback(async (): Promise<{ status: string; txHash?: string }> => {
    if (!activePayment) {
      return { status: 'none' };
    }

    try {
      const status = await checkPaymentStatus(activePayment.id);
      
      // Update local state if changed
      if (status.status !== activePayment.status) {
        setActivePayment(prev => prev ? { ...prev, status: status.status } : null);
      }

      return status;
    } catch (err) {
      console.error('Status check error:', err);
      return { status: activePayment.status };
    }
  }, [activePayment]);

  // Clear active payment
  const clear = useCallback(() => {
    setActivePayment(null);
    setError(null);
  }, []);

  // Format amount for display
  const formatAmount = useCallback((amountWei: string, tokenAddress: string): string => {
    return formatPaymentDisplay(amountWei, tokenAddress);
  }, []);

  return {
    activePayment,
    isCreating,
    isVerifying,
    error,
    create,
    verify,
    checkStatus,
    clear,
    formatAmount,
  };
}
