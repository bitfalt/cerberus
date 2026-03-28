// app/api/payment/callback/route.ts - x402 payment callback endpoint
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentState } from '@/lib/x402/state';
import { verifyPaymentOnChain } from '@/lib/x402/client';

interface PaymentCallbackRequest {
  paymentId: string;
  txHash: string;
  status: 'success' | 'failed';
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentCallbackRequest = await request.json();
    const { paymentId, txHash, status } = body;

    if (!paymentId || !txHash) {
      return NextResponse.json(
        { error: 'Missing paymentId or txHash' },
        { status: 400 }
      );
    }

    if (status === 'failed') {
      return NextResponse.json(
        { error: 'Payment failed' },
        { status: 400 }
      );
    }

    // Verify the payment on-chain
    const result = await verifyPaymentOnChain(paymentId, txHash);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payment verification failed' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      payment: result.state,
    });
  } catch (error) {
    console.error('Payment callback error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Get payment status
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json(
        { error: 'Missing paymentId' },
        { status: 400 }
      );
    }

    const state = await getPaymentState(paymentId);

    if (!state) {
      return NextResponse.json(
        { error: 'Payment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: state.id,
      status: state.status,
      amount: state.amount,
      txHash: state.settlementTxHash,
    });
  } catch (error) {
    console.error('Payment status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
