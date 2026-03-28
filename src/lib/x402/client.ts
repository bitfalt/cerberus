// lib/x402/client.ts - x402 payment creation and verification (simplified)
import { WalletClient, formatEther } from 'viem';
import { createPaymentState, getPaymentState, settlePayment, failPayment, PaymentState } from './state';

export interface PaymentRequest {
  opportunityId: string;
  amount: string; // in wei
  tokenAddress: string;
  description: string;
}

export interface PaymentSession {
  id: string;
  status: string;
  amount: string;
  expiresAt: number;
  paymentUrl: string;
}

// Token addresses on Base
const TOKENS = {
  ETH: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', // Native ETH
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
};

// Create a new payment request
export async function createPayment(
  walletClient: WalletClient,
  request: PaymentRequest
): Promise<PaymentSession> {
  const payerAddress = walletClient.account?.address;
  if (!payerAddress) {
    throw new Error('Wallet not connected');
  }

  const paymentId = `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

  // Store payment state in Redis
  await createPaymentState({
    id: paymentId,
    status: 'pending',
    opportunityId: request.opportunityId,
    payerAddress,
    amount: request.amount,
    tokenAddress: request.tokenAddress,
    expiresAt,
  });

  // Generate payment URL for QR code / deep link
  // In production, this would integrate with x402 facilitator
  const paymentUrl = `ethereum:${payerAddress}?value=${request.amount}&data=${encodeURIComponent(
    JSON.stringify({
      type: 'x402',
      opportunityId: request.opportunityId,
      paymentId,
      description: request.description,
    })
  )}`;

  return {
    id: paymentId,
    status: 'pending',
    amount: formatEther(BigInt(request.amount)),
    expiresAt,
    paymentUrl,
  };
}

// Verify a payment was made
export async function verifyPaymentOnChain(
  paymentId: string,
  txHash: string
): Promise<{ success: boolean; error?: string; state?: PaymentState }> {
  try {
    const state = await getPaymentState(paymentId);
    if (!state) {
      return { success: false, error: 'Payment not found' };
    }

    if (state.status === 'settled') {
      return { success: true, state };
    }

    if (state.expiresAt < Date.now()) {
      await failPayment(paymentId, 'Payment expired');
      return { success: false, error: 'Payment expired' };
    }

    // In production, you'd verify the on-chain settlement
    // For now, we accept the txHash as proof
    const updated = await settlePayment(paymentId, txHash);
    
    return { success: true, state: updated || undefined };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await failPayment(paymentId, errorMessage);
    return { success: false, error: errorMessage };
  }
}

// Check payment status
export async function checkPaymentStatus(
  paymentId: string
): Promise<{ status: string; txHash?: string; error?: string }> {
  const state = await getPaymentState(paymentId);
  
  if (!state) {
    return { status: 'not_found', error: 'Payment not found' };
  }

  if (state.expiresAt < Date.now() && state.status === 'pending') {
    await failPayment(paymentId, 'Payment expired');
    return { status: 'expired', error: 'Payment expired' };
  }

  return {
    status: state.status,
    txHash: state.settlementTxHash,
    error: state.failureReason,
  };
}

// Format payment for display
export function formatPaymentDisplay(amountWei: string, tokenAddress: string): string {
  const amount = formatEther(BigInt(amountWei));
  const symbol = tokenAddress === TOKENS.ETH ? 'ETH' : 
                 tokenAddress === TOKENS.USDC ? 'USDC' : 'TOKEN';
  return `${parseFloat(amount).toFixed(6)} ${symbol}`;
}

// Get token decimals
export function getTokenDecimals(tokenAddress: string): number {
  if (tokenAddress === TOKENS.USDC) return 6;
  return 18; // ETH and most ERC20
}

// Convert human amount to wei
export function toWei(amount: string, decimals: number = 18): string {
  // Simple conversion - in production use a proper BigNumber library
  const parts = amount.split('.');
  const whole = parts[0];
  const fraction = (parts[1] || '').padEnd(decimals, '0').slice(0, decimals);
  return (BigInt(whole) * BigInt(10 ** decimals) + BigInt(fraction)).toString();
}
