// hooks/useX402.ts - React hook for x402 payment flow with XMTP integration
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
  opportunityId?: string;
  xmtpApproved?: boolean; // Track if this payment was approved via XMTP
}

interface XMTPApprovedPayment {
  opportunityId: string;
  approvedAt: number;
  worldIDVerified: boolean;
  x402PaymentId?: string;
}

interface UseX402Return {
  activePayment: PaymentSession | null;
  isCreating: boolean;
  isVerifying: boolean;
  error: string | null;
  xmtpApprovedPayments: Map<string, XMTPApprovedPayment>; // Track XMTP-approved payments
  // Create a payment for an XMTP-approved opportunity
  create: (request: PaymentRequest & { xmtpApproved?: boolean }) => Promise<void>;
  // Create payment tied to XMTP approval (opportunityId passed separately)
  createForXMTPApproved: (request: Omit<PaymentRequest, 'opportunityId'>, opportunityId: string, worldIDVerified: boolean) => Promise<void>;
  verify: (txHash: string) => Promise<boolean>;
  checkStatus: () => Promise<{ status: string; txHash?: string }>;
  clear: () => void;
  formatAmount: (amountWei: string, tokenAddress: string) => string;
  // Check if an opportunity has been XMTP-approved and can proceed to payment
  canPay: (opportunityId: string) => boolean;
  // Mark an opportunity as XMTP-approved
  markXMTPApproved: (opportunityId: string, worldIDVerified: boolean) => void;
}

export function useX402(): UseX402Return {
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const [activePayment, setActivePayment] = useState<PaymentSession | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [xmtpApprovedPayments, setXmtpApprovedPayments] = useState<Map<string, XMTPApprovedPayment>>(new Map());

  // Mark an opportunity as XMTP-approved
  const markXMTPApproved = useCallback((opportunityId: string, worldIDVerified: boolean) => {
    setXmtpApprovedPayments(prev => {
      const newMap = new Map(prev);
      newMap.set(opportunityId, {
        opportunityId,
        approvedAt: Date.now(),
        worldIDVerified,
      });
      return newMap;
    });
  }, []);

  // Check if an opportunity can proceed to payment (must be XMTP-approved)
  const canPay = useCallback((opportunityId: string): boolean => {
    return xmtpApprovedPayments.has(opportunityId);
  }, [xmtpApprovedPayments]);

  // Create a new payment (requires XMTP approval for trade execution)
  const create = useCallback(async (request: PaymentRequest & { xmtpApproved?: boolean }) => {
    if (!walletClient || !address) {
      setError('Wallet not connected');
      return;
    }

    // Check if this is a trade execution payment that needs XMTP approval
    if (request.opportunityId && !request.xmtpApproved) {
      // Check if approved via XMTP
      if (!xmtpApprovedPayments.has(request.opportunityId)) {
        setError('Trade not approved via XMTP. Please approve the proposal in the XMTP chat first.');
        return;
      }
    }

    setIsCreating(true);
    setError(null);

    try {
      const session = await createPayment(walletClient, request);
      setActivePayment({
        ...session,
        opportunityId: request.opportunityId,
        xmtpApproved: request.xmtpApproved ?? xmtpApprovedPayments.has(request.opportunityId || ''),
      });

      // Update the XMTP-approved payment record with the x402 payment ID
      if (request.opportunityId && xmtpApprovedPayments.has(request.opportunityId)) {
        setXmtpApprovedPayments(prev => {
          const newMap = new Map(prev);
          const existing = newMap.get(request.opportunityId!);
          if (existing) {
            newMap.set(request.opportunityId!, {
              ...existing,
              x402PaymentId: session.id,
            });
          }
          return newMap;
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create payment';
      setError(message);
      console.error('Payment creation error:', err);
    } finally {
      setIsCreating(false);
    }
  }, [walletClient, address, xmtpApprovedPayments]);

  // Create payment specifically for XMTP-approved opportunity
  const createForXMTPApproved = useCallback(async (
    request: Omit<PaymentRequest, 'opportunityId'>, 
    opportunityId: string, 
    worldIDVerified: boolean
  ) => {
    // First mark as XMTP-approved
    markXMTPApproved(opportunityId, worldIDVerified);
    
    // Then create the payment with xmtpApproved flag
    await create({
      ...request,
      opportunityId,
      xmtpApproved: true,
    });
  }, [create, markXMTPApproved]);

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
    xmtpApprovedPayments,
    create,
    createForXMTPApproved,
    verify,
    checkStatus,
    clear,
    formatAmount,
    canPay,
    markXMTPApproved,
  };
}
