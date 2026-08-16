import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { paystackClient } from './paystack.client';

const originalEnv = process.env.PAYSTACK_SECRET_KEY;
const originalFetch = global.fetch;

describe('paystackClient.initializeTransaction', () => {
  beforeEach(() => {
    process.env.PAYSTACK_SECRET_KEY = 'sk_test_fake';
  });

  afterEach(() => {
    process.env.PAYSTACK_SECRET_KEY = originalEnv;
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('throws PAYMENT_PROVIDER_MISCONFIGURED when no secret key is set', async () => {
    delete process.env.PAYSTACK_SECRET_KEY;

    await expect(
      paystackClient.initializeTransaction({
        email: 'ada@example.com',
        amountKobo: 100000n,
        reference: 'TIX-1',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_MISCONFIGURED' });
  });

  it('sends amount as a kobo string and returns the authorization URL on success', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: true,
        data: {
          authorization_url: 'https://checkout.paystack.com/xyz',
          access_code: 'xyz',
        },
      }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;

    const result = await paystackClient.initializeTransaction({
      email: 'ada@example.com',
      amountKobo: 1500000n,
      reference: 'TIX-1',
    });

    expect(result.authorizationUrl).toBe('https://checkout.paystack.com/xyz');
    const [, requestInit] = fetchMock.mock.calls[0];
    const sentBody = JSON.parse(requestInit.body);
    expect(sentBody.amount).toBe('1500000');
    expect(requestInit.headers.Authorization).toBe('Bearer sk_test_fake');
  });

  it('throws PAYMENT_PROVIDER_ERROR on a non-ok HTTP response', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false }) as unknown as typeof fetch;

    await expect(
      paystackClient.initializeTransaction({
        email: 'ada@example.com',
        amountKobo: 100000n,
        reference: 'TIX-1',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
  });

  it('throws PAYMENT_PROVIDER_ERROR when Paystack returns status: false', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: false }),
    }) as unknown as typeof fetch;

    await expect(
      paystackClient.initializeTransaction({
        email: 'ada@example.com',
        amountKobo: 100000n,
        reference: 'TIX-1',
      }),
    ).rejects.toMatchObject({ code: 'PAYMENT_PROVIDER_ERROR' });
  });
});
