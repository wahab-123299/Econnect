import { AppError } from '../middleware/error-handler';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

interface InitializeTransactionParams {
  email: string;
  amountKobo: bigint;
  reference: string;
  metadata?: Record<string, unknown>;
}

interface InitializeTransactionResult {
  authorizationUrl: string;
  accessCode: string;
}

// Thin wrapper around Paystack's REST API. Kept isolated from order.service.ts
// so (a) it's trivial to mock in tests without hitting the network, and
// (b) swapping in Flutterwave later, or supporting both, means adding a
// sibling client with the same shape rather than rewriting order logic.
export const paystackClient = {
  async initializeTransaction(
    params: InitializeTransactionParams,
  ): Promise<InitializeTransactionResult> {
    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      throw new AppError(500, 'PAYMENT_PROVIDER_MISCONFIGURED', 'Payments are not configured.');
    }

    const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: params.email,
        amount: params.amountKobo.toString(), // Paystack calls it "amount" but it's kobo
        reference: params.reference,
        metadata: params.metadata,
      }),
    });

    if (!res.ok) {
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_ERROR',
        'Could not start payment. Please try again.',
      );
    }

    const body = (await res.json()) as {
      status: boolean;
      data?: { authorization_url: string; access_code: string };
    };

    if (!body.status || !body.data) {
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_ERROR',
        'Could not start payment. Please try again.',
      );
    }

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
    };
  },
};
